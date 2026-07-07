// Alur booking klien ⇄ editor di atas model Project/Contract/Message:
//   klien mulai diskusi (draft) → chat → editor kirim brief (Contract
//   pending_client_approval) → klien setujui (in_progress + RevisionEnvelope)
//   → editor kirim preview (in_review) → klien selesai (completed) atau minta
//   revisi (AI klasifikasi minor/major → revision) → ulasan klien (Review +
//   KPI editor). Semua aksi menulis Message agar riwayat ruang proyek utuh.

import type { Prisma, Project, UserRole } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../middleware/errorHandler.js'
import { classifyRevision, type RevisionClassification } from './classifier.js'
import { watermarkImageDataUrl } from '../../lib/watermark.js'

export interface Viewer {
  sub: string
  role: UserRole
}

export type ProjectAccess = 'client' | 'editor' | 'staff'

const STAFF_ROLES: readonly UserRole[] = ['admin_manager', 'hr_admin', 'superadmin']

// Teks default sisi EXCLUDED envelope — brief klien hanya mendefinisikan
// deskripsi (INCLUDED) dan batas revisi, sisanya standar platform.
const DEFAULT_EXCLUDED_SCOPE =
  'Perubahan konsep besar, penambahan materi/scene baru, atau permintaan di luar deskripsi brief '
  + '(terklasifikasi MAJOR — dapat dikenakan biaya tambahan).'

const round1 = (n: number) => Math.round(n * 10) / 10

async function fullNameOf(userId: string): Promise<string> {
  const user = await prisma.user.findUnique({
    where: { user_id: userId },
    select: { full_name: true },
  })
  return user?.full_name ?? 'Pengguna'
}

async function myEditorId(userId: string): Promise<string | null> {
  const editor = await prisma.editor.findUnique({
    where: { user_id: userId },
    select: { editor_id: true },
  })
  return editor?.editor_id ?? null
}

// ── Akses ─────────────────────────────────────────────────────────────────────

export async function resolveAccess(project: Project, viewer: Viewer): Promise<ProjectAccess> {
  if (viewer.role === 'client') {
    if (project.client_id === viewer.sub) return 'client'
  } else if (viewer.role === 'editor') {
    const editorId = await myEditorId(viewer.sub)
    if (editorId && project.editor_id === editorId) return 'editor'
  } else if (STAFF_ROLES.includes(viewer.role)) {
    return 'staff'
  }
  throw new HttpError(403, 'Anda tidak memiliki akses ke proyek ini')
}

export async function loadProject(projectId: string): Promise<Project> {
  const project = await prisma.project.findUnique({ where: { project_id: projectId } })
  if (!project) throw new HttpError(404, 'Project not found')
  return project
}

// ── Daftar & detail ───────────────────────────────────────────────────────────

export async function listProjects(viewer: Viewer) {
  const where: Prisma.ProjectWhereInput =
    viewer.role === 'client' ? { client_id: viewer.sub }
    : viewer.role === 'editor' ? { editor: { user_id: viewer.sub } }
    : {} // staff melihat semua; admin manager memfilter departemennya di frontend
  const projects = await prisma.project.findMany({
    where,
    orderBy: { created_at: 'desc' },
    include: { reviews: { select: { review_id: true }, take: 1 } },
  })
  // has_review dipakai klien untuk CTA "Beri Ulasan" tanpa fetch per proyek.
  return projects.map(({ reviews, ...p }) => ({ ...p, has_review: reviews.length > 0 }))
}

export async function getProjectDetail(projectId: string, viewer: Viewer) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  const detail = await prisma.project.findUnique({
    where: { project_id: projectId },
    include: {
      envelope: true,
      contracts: { orderBy: { issued_at: 'desc' } },
      revisions: { orderBy: { created_at: 'desc' } },
      reviews: { orderBy: { created_at: 'desc' } },
      escrow: true,
    },
  })
  return { ...detail!, viewer_access: access }
}

// ── Booking (mulai diskusi) ───────────────────────────────────────────────────

export async function startBooking(viewer: Viewer, editorId: string, note?: string) {
  const editor = await prisma.editor.findUnique({ where: { editor_id: editorId } })
  if (!editor) throw new HttpError(404, 'Editor tidak ditemukan')
  if (editor.status !== 'active') {
    throw new HttpError(422, 'Editor sedang tidak menerima proyek baru')
  }

  // Idempoten: satu ruang diskusi draft per pasangan klien-editor.
  const existing = await prisma.project.findFirst({
    where: { client_id: viewer.sub, editor_id: editorId, status: 'draft' },
  })
  if (existing) return { project: existing, created: false }

  const clientName = await fullNameOf(viewer.sub)
  const project = await prisma.$transaction(async tx => {
    const created = await tx.project.create({
      data: {
        client_id: viewer.sub,
        client_name: clientName,
        editor_id: editor.editor_id,
        editor_name: editor.full_name,
        title: `Diskusi proyek — ${editor.full_name}`,
        description: '',
        status: 'draft',
        dp_amount: 0,
        final_amount: 0,
        project_value: 0,
      },
    })
    await tx.message.create({
      data: {
        project_id: created.project_id,
        sender_id: viewer.sub,
        sender_name: clientName,
        sender_role: viewer.role,
        message_type: 'system',
        body: `Ruang diskusi dibuat. Jelaskan kebutuhan proyek Anda kepada ${editor.full_name}; `
          + 'editor akan menyusun brief penawaran (judul, deskripsi, batas revisi, harga) untuk disetujui.',
      },
    })
    if (note?.trim()) {
      await tx.message.create({
        data: {
          project_id: created.project_id,
          sender_id: viewer.sub,
          sender_name: clientName,
          sender_role: viewer.role,
          message_type: 'text',
          body: note.trim(),
        },
      })
    }
    return created
  })
  return { project, created: true }
}

// ── Chat ──────────────────────────────────────────────────────────────────────

export async function listMessages(projectId: string, viewer: Viewer) {
  const project = await loadProject(projectId)
  await resolveAccess(project, viewer)
  return prisma.message.findMany({
    where: { project_id: projectId },
    orderBy: { created_at: 'asc' },
  })
}

export async function sendTextMessage(projectId: string, viewer: Viewer, body: string) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access === 'staff') throw new HttpError(403, 'Hanya klien dan editor proyek yang dapat mengirim pesan')
  if (project.status === 'cancelled') throw new HttpError(422, 'Proyek sudah dibatalkan')

  return prisma.message.create({
    data: {
      project_id: projectId,
      sender_id: viewer.sub,
      sender_name: await fullNameOf(viewer.sub),
      sender_role: viewer.role,
      message_type: 'text',
      body,
    },
  })
}

// ── Brief (formulir briefing dari editor) ─────────────────────────────────────

export interface BriefInput {
  title: string
  description: string
  revision_limit: number
  price: number
}

export async function sendBrief(projectId: string, viewer: Viewer, input: BriefInput) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access !== 'editor') throw new HttpError(403, 'Hanya editor proyek yang dapat mengirim brief')
  if (project.status !== 'draft' && project.status !== 'awaiting_dp') {
    throw new HttpError(422, 'Brief hanya dapat dikirim selama tahap diskusi')
  }

  const editorName = await fullNameOf(viewer.sub)
  return prisma.$transaction(async tx => {
    // Brief baru menggantikan penawaran lama yang belum dijawab.
    await tx.contract.updateMany({
      where: { project_id: projectId, status: 'pending_client_approval' },
      data: { status: 'superseded' },
    })
    const contract = await tx.contract.create({
      data: {
        project_id: projectId,
        title: input.title,
        scope: input.description,
        revision_limit: input.revision_limit,
        project_value: input.price,
        status: 'pending_client_approval',
      },
    })
    await tx.message.create({
      data: {
        project_id: projectId,
        sender_id: viewer.sub,
        sender_name: editorName,
        sender_role: viewer.role,
        message_type: 'brief',
        // Body JSON → dirender sebagai kartu brief terstruktur di frontend.
        body: JSON.stringify({
          contract_id: contract.contract_id,
          title: input.title,
          description: input.description,
          revision_limit: input.revision_limit,
          price: input.price,
        }),
      },
    })
    return contract
  })
}

export async function respondBrief(projectId: string, viewer: Viewer, approve: boolean) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access !== 'client') throw new HttpError(403, 'Hanya klien pemilik proyek yang dapat menjawab brief')

  const contract = await prisma.contract.findFirst({
    where: { project_id: projectId, status: 'pending_client_approval' },
    orderBy: { issued_at: 'desc' },
  })
  if (!contract) throw new HttpError(404, 'Tidak ada brief yang menunggu persetujuan')

  const clientName = await fullNameOf(viewer.sub)

  if (!approve) {
    const [updated] = await prisma.$transaction([
      prisma.contract.update({
        where: { contract_id: contract.contract_id },
        data: { status: 'rejected' },
      }),
      // Kembali ke tahap diskusi agar editor bisa merevisi penawarannya.
      prisma.project.update({
        where: { project_id: projectId },
        data: { status: 'draft' },
      }),
      prisma.message.create({
        data: {
          project_id: projectId,
          sender_id: viewer.sub,
          sender_name: clientName,
          sender_role: viewer.role,
          message_type: 'system',
          body: 'Brief ditolak klien. Diskusikan penyesuaian, lalu editor dapat mengirim brief baru.',
        },
      }),
    ])
    return { contract: updated, project_status: 'draft' as const }
  }

  const dp = Math.floor(contract.project_value / 2)
  const updated = await prisma.$transaction(async tx => {
    const active = await tx.contract.update({
      where: { contract_id: contract.contract_id },
      data: { status: 'active', approved_at: new Date() },
    })
    await tx.project.update({
      where: { project_id: projectId },
      data: {
        title: contract.title ?? project.title,
        description: contract.scope,
        project_value: contract.project_value,
        dp_amount: dp,
        final_amount: contract.project_value - dp,
        status: 'in_progress',
        started_at: new Date(),
      },
    })
    await tx.revisionEnvelope.upsert({
      where: { project_id: projectId },
      update: {
        included_scope: contract.scope,
        excluded_scope: DEFAULT_EXCLUDED_SCOPE,
        allowance_count: contract.revision_limit,
        allowance_consumed: 0,
      },
      create: {
        project_id: projectId,
        included_scope: contract.scope,
        excluded_scope: DEFAULT_EXCLUDED_SCOPE,
        allowance_count: contract.revision_limit,
        allowance_consumed: 0,
      },
    })
    await tx.editor.update({
      where: { editor_id: project.editor_id },
      data: { active_projects: { increment: 1 } },
    })
    await tx.message.create({
      data: {
        project_id: projectId,
        sender_id: viewer.sub,
        sender_name: clientName,
        sender_role: viewer.role,
        message_type: 'system',
        body: `Brief disetujui klien — proyek "${contract.title ?? project.title}" dimulai. `
          + `Batas revisi minor: ${contract.revision_limit}x.`,
      },
    })
    return active
  })
  return { contract: updated, project_status: 'in_progress' as const }
}

// ── Preview / hasil kerja dari editor ────────────────────────────────────────

export interface DeliverableInput {
  note: string
  attachment_url?: string
  image?: { data_url: string; width: number; height: number }
}

export async function sendDeliverable(
  projectId: string,
  viewer: Viewer,
  input: DeliverableInput,
) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access !== 'editor') throw new HttpError(403, 'Hanya editor proyek yang dapat mengirim preview')
  if (project.status !== 'in_progress' && project.status !== 'revision') {
    throw new HttpError(422, 'Preview hanya dapat dikirim saat proyek berjalan atau dalam revisi')
  }

  const editorName = await fullNameOf(viewer.sub)
  // Gambar dari editor selalu dibungkus watermark server-side sebelum disimpan
  // — klien tidak akan menerima file mentah.
  let attachment: string | null = null
  if (input.image) {
    const label = `${editorName.toUpperCase()} · MANAVA`
    const sub = new Date().toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
    attachment = watermarkImageDataUrl({
      imageDataUrl: input.image.data_url,
      width: input.image.width,
      height: input.image.height,
      label, sublabel: `${project.title} · ${sub}`,
    })
  } else if (input.attachment_url) {
    attachment = input.attachment_url
  }

  return prisma.$transaction(async tx => {
    const message = await tx.message.create({
      data: {
        project_id: projectId,
        sender_id: viewer.sub,
        sender_name: editorName,
        sender_role: viewer.role,
        message_type: 'deliverable',
        body: input.note,
        attachment,
      },
    })
    // Revisi yang sedang berjalan dianggap sudah dikerjakan ulang.
    await tx.revisionRequest.updateMany({
      where: {
        project_id: projectId,
        status: { in: ['submitted', 'accepted', 'awaiting_topup', 'in_progress'] },
      },
      data: { status: 'resubmitted' },
    })
    await tx.project.update({
      where: { project_id: projectId },
      data: { status: 'in_review' },
    })
    return message
  })
}

// ── Revisi klien (klasifikasi AI → kirim) ────────────────────────────────────

export async function classifyForProject(
  projectId: string,
  viewer: Viewer,
  requestText: string,
): Promise<RevisionClassification & { allowance: { count: number; consumed: number } }> {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access !== 'client') throw new HttpError(403, 'Hanya klien pemilik proyek yang dapat meminta revisi')
  if (project.status !== 'in_review') {
    throw new HttpError(422, 'Revisi hanya dapat diminta saat preview sedang ditinjau')
  }

  const envelope = await prisma.revisionEnvelope.findUnique({ where: { project_id: projectId } })
  const result = await classifyRevision(requestText, {
    project_title: project.title,
    project_description: project.description,
    included_scope: envelope?.included_scope,
    excluded_scope: envelope?.excluded_scope,
  })
  return {
    ...result,
    allowance: {
      count: envelope?.allowance_count ?? 0,
      consumed: envelope?.allowance_consumed ?? 0,
    },
  }
}

export interface RevisionInput {
  request_text: string
  ai_label: 'minor' | 'major' | 'uncertain'
  ai_confidence: number
  ai_summary: string
}

export async function submitRevision(projectId: string, viewer: Viewer, input: RevisionInput) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access !== 'client') throw new HttpError(403, 'Hanya klien pemilik proyek yang dapat meminta revisi')
  if (project.status !== 'in_review') {
    throw new HttpError(422, 'Revisi hanya dapat diminta saat preview sedang ditinjau')
  }

  const envelope = await prisma.revisionEnvelope.findUnique({ where: { project_id: projectId } })
  if (!envelope) throw new HttpError(422, 'Proyek belum memiliki revision envelope')

  const isMinor = input.ai_label === 'minor'
  if (isMinor && envelope.allowance_consumed >= envelope.allowance_count) {
    throw new HttpError(
      422,
      `Batas ${envelope.allowance_count}x revisi minor sudah terpakai. `
      + 'Selesaikan proyek, atau diskusikan revisi berbayar dengan editor melalui chat.',
    )
  }

  const clientName = await fullNameOf(viewer.sub)
  return prisma.$transaction(async tx => {
    const revision = await tx.revisionRequest.create({
      data: {
        project_id: projectId,
        request_text: input.request_text,
        ai_label: input.ai_label,
        ai_confidence: input.ai_confidence,
        // minor → langsung diterima (dalam allowance); major → menunggu
        // kesepakatan biaya; uncertain → menunggu tinjauan manual.
        status: isMinor ? 'accepted' : input.ai_label === 'major' ? 'awaiting_topup' : 'submitted',
      },
    })
    if (isMinor) {
      await tx.revisionEnvelope.update({
        where: { project_id: projectId },
        data: { allowance_consumed: { increment: 1 } },
      })
    }
    await tx.message.create({
      data: {
        project_id: projectId,
        sender_id: viewer.sub,
        sender_name: clientName,
        sender_role: viewer.role,
        message_type: 'revision_request',
        body: input.request_text,
      },
    })
    await tx.message.create({
      data: {
        project_id: projectId,
        sender_id: viewer.sub,
        sender_name: clientName,
        sender_role: viewer.role,
        message_type: 'ai_summary',
        body: JSON.stringify({
          label: input.ai_label,
          confidence: input.ai_confidence,
          summary: input.ai_summary,
        }),
      },
    })
    await tx.project.update({
      where: { project_id: projectId },
      data: { status: 'revision' },
    })
    return revision
  })
}

// ── Penyelesaian proyek ──────────────────────────────────────────────────────

export async function completeProject(projectId: string, viewer: Viewer) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access !== 'client') throw new HttpError(403, 'Hanya klien pemilik proyek yang dapat menyelesaikan proyek')
  if (project.status !== 'in_review' && project.status !== 'revision') {
    throw new HttpError(422, 'Proyek hanya dapat diselesaikan setelah editor mengirim preview')
  }

  const clientName = await fullNameOf(viewer.sub)
  return prisma.$transaction(async tx => {
    const completed = await tx.project.update({
      where: { project_id: projectId },
      data: { status: 'completed', completed_at: new Date() },
    })
    await tx.revisionRequest.updateMany({
      where: {
        project_id: projectId,
        status: { in: ['submitted', 'accepted', 'awaiting_topup', 'in_progress', 'resubmitted'] },
      },
      data: { status: 'resolved' },
    })
    const editor = await tx.editor.findUnique({
      where: { editor_id: project.editor_id },
      select: { active_projects: true },
    })
    if (editor && editor.active_projects > 0) {
      await tx.editor.update({
        where: { editor_id: project.editor_id },
        data: { active_projects: { decrement: 1 } },
      })
    }
    await tx.message.create({
      data: {
        project_id: projectId,
        sender_id: viewer.sub,
        sender_name: clientName,
        sender_role: viewer.role,
        message_type: 'system',
        body: 'Klien menyetujui hasil akhir — proyek selesai. Terima kasih! '
          + 'Klien dapat memberi ulasan kinerja editor untuk KPI.',
      },
    })
    return completed
  })
}

// ── Ulasan klien → KPI editor ────────────────────────────────────────────────

export async function submitReview(
  projectId: string,
  viewer: Viewer,
  rating: number,
  comment: string,
) {
  const project = await loadProject(projectId)
  const access = await resolveAccess(project, viewer)
  if (access !== 'client') throw new HttpError(403, 'Hanya klien pemilik proyek yang dapat memberi ulasan')
  if (project.status !== 'completed') {
    throw new HttpError(422, 'Ulasan hanya dapat diberikan setelah proyek selesai')
  }
  const existing = await prisma.review.findFirst({ where: { project_id: projectId } })
  if (existing) throw new HttpError(409, 'Proyek ini sudah diulas')

  const clientName = await fullNameOf(viewer.sub)
  const review = await prisma.review.create({
    data: {
      project_id: projectId,
      rating,
      comment,
      reviewer_name: clientName,
    },
  })

  await recomputeEditorKpi(project.editor_id)

  await prisma.message.create({
    data: {
      project_id: projectId,
      sender_id: viewer.sub,
      sender_name: clientName,
      sender_role: viewer.role,
      message_type: 'system',
      body: `Klien memberi ulasan ${rating}/5 untuk proyek ini. Nilai tersimpan ke KPI editor.`,
    },
  })
  return review
}

// Rata-rata rating klien dihitung ulang dari seluruh review proyek editor,
// lalu KPI = (client + completion% × 5 + manager) / 3 — formula yang sama
// dengan Manager Assessment di modules/editors.
async function recomputeEditorKpi(editorId: string): Promise<void> {
  const editor = await prisma.editor.findUnique({
    where: { editor_id: editorId },
    include: { metrics: true },
  })
  if (!editor) return

  const agg = await prisma.review.aggregate({
    where: { project: { editor_id: editorId } },
    _avg: { rating: true },
    _count: true,
  })
  const avgClientRating = round1(agg._avg.rating ?? editor.rating)
  const completionRate = editor.metrics?.completion_rate ?? editor.completion_rate
  // Netral (3.0) untuk editor yang belum pernah dinilai manajernya.
  const managerRating = editor.metrics?.manager_rating ?? 3
  const kpiAverage = round1((avgClientRating + (completionRate / 100) * 5 + managerRating) / 3)
  const band = kpiAverage >= 4.5 ? 'excellent' : kpiAverage >= 3.5 ? 'good' : 'needs_improvement'
  const period = new Date().toISOString().slice(0, 7) // "YYYY-MM"

  await prisma.$transaction([
    prisma.editorMetrics.upsert({
      where: { editor_id: editorId },
      update: {
        avg_client_rating: avgClientRating,
        kpi_average: kpiAverage,
        performance_band: band,
      },
      create: {
        editor_id: editorId,
        editor_name: editor.full_name,
        avg_client_rating: avgClientRating,
        completion_rate: completionRate,
        manager_rating: managerRating,
        kpi_average: kpiAverage,
        performance_band: band,
      },
    }),
    prisma.editor.update({
      where: { editor_id: editorId },
      data: { rating: avgClientRating, performance_band: band },
    }),
    // Snapshot bulan berjalan ikut diperbarui agar grafik tren KPI langsung
    // mencerminkan ulasan terbaru.
    prisma.kpiSnapshot.upsert({
      where: { editor_id_period: { editor_id: editorId, period } },
      update: { avg_client_rating: avgClientRating, kpi_average: kpiAverage },
      create: {
        editor_id: editorId,
        department: editor.department,
        period,
        avg_client_rating: avgClientRating,
        completion_rate: completionRate,
        manager_rating: managerRating,
        kpi_average: kpiAverage,
      },
    }),
  ])
}

// ── Inbox (notifikasi ruang proyek) ──────────────────────────────────────────

export async function getInbox(viewer: Viewer, limit: number) {
  const where: Prisma.ProjectWhereInput =
    viewer.role === 'client' ? { client_id: viewer.sub }
    : viewer.role === 'editor' ? { editor: { user_id: viewer.sub } }
    : { project_id: '__none__' } // role lain tidak punya inbox proyek

  const myProjects = await prisma.project.findMany({
    where,
    select: { project_id: true, title: true, status: true },
  })
  if (myProjects.length === 0) return []
  const titleById = new Map(myProjects.map(p => [p.project_id, p]))

  const messages = await prisma.message.findMany({
    where: {
      project_id: { in: myProjects.map(p => p.project_id) },
      sender_id: { not: viewer.sub },
    },
    orderBy: { created_at: 'desc' },
    take: limit,
  })
  return messages.map(m => ({
    ...m,
    project_title: titleById.get(m.project_id)?.title ?? 'Proyek',
    project_status: titleById.get(m.project_id)?.status ?? 'draft',
  }))
}
