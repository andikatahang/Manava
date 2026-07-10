// Narasi laporan berbantuan AI. Tanpa OPENAI_API_KEY (atau saat gagal),
// jatuh ke ringkasan heuristik deterministik — generate laporan tidak pernah
// bergantung pada ketersediaan OpenAI.

import { getOpenAi, isOpenAiConfigured, OPENAI_MODEL } from '../../lib/openai.js'
import type {
  AttendanceSummary, LeaveSummary, ReimbursementSummary, EditorReportData,
} from './types.js'

export interface AiNarrative {
  source: 'ai' | 'heuristic'
  text: string
}

function heuristicNarrative(
  departmentName: string,
  period: string,
  attendance: AttendanceSummary,
  leave: LeaveSummary,
  editorReports: EditorReportData[],
): string {
  const totalProjects = editorReports.reduce((n, r) => n + r.project_summary.length, 0)
  const completed = editorReports.reduce(
    (n, r) => n + r.project_summary.filter(p => p.status === 'completed').length, 0,
  )
  return [
    `Pada periode ${period}, departemen ${departmentName} mencatat tingkat kehadiran ${attendance.present_pct}%`,
    `dengan ${attendance.late_count} keterlambatan dan ${attendance.absent_count} ketidakhadiran tanpa keterangan.`,
    `Sebanyak ${leave.approved_count} pengajuan cuti/izin disetujui dan ${leave.pending_count} masih menunggu keputusan.`,
    `Tim mengerjakan ${totalProjects} proyek (${completed} selesai) dari ${editorReports.length} staf aktif.`,
  ].join(' ')
}

/**
 * Susun narasi ringkasan laporan departemen. Dipicu saat Admin Manager
 * menekan tombol "Generate Laporan dengan AI".
 */
export async function buildAiNarrative(
  departmentName: string,
  period: string,
  attendance: AttendanceSummary,
  leave: LeaveSummary,
  reimbursement: ReimbursementSummary,
  editorReports: EditorReportData[],
): Promise<AiNarrative> {
  const fallback = heuristicNarrative(departmentName, period, attendance, leave, editorReports)
  if (!isOpenAiConfigured()) {
    return { source: 'heuristic', text: fallback }
  }

  try {
    const facts = {
      departemen: departmentName,
      periode: period,
      kehadiran: attendance,
      cuti: leave,
      klaim_dana: reimbursement,
      karyawan: editorReports.map(r => ({
        nama: r.editor_name,
        hadir: r.attendance_summary.present,
        terlambat: r.attendance_summary.late,
        alpa: r.attendance_summary.absent,
        cuti_disetujui: r.leave_summary.cuti_approved + r.leave_summary.izin_approved,
        proyek: r.project_summary,
      })),
    }
    const completion = await getOpenAi().chat.completions.create({
      model: OPENAI_MODEL,
      max_tokens: 400,
      messages: [
        {
          role: 'system',
          content:
            'Kamu asisten HR. Tulis narasi ringkasan laporan bulanan departemen dalam Bahasa Indonesia '
            + 'formal (1 paragraf, maksimal 120 kata) untuk HR Admin: sorot kehadiran, cuti, dan progres '
            + 'proyek karyawan, sebut nama karyawan yang menonjol atau perlu perhatian. Hanya gunakan '
            + 'angka dari data yang diberikan.',
        },
        { role: 'user', content: JSON.stringify(facts) },
      ],
    })
    const text = completion.choices[0]?.message?.content?.trim()
    if (!text) return { source: 'heuristic', text: fallback }
    return { source: 'ai', text }
  } catch {
    return { source: 'heuristic', text: fallback }
  }
}
