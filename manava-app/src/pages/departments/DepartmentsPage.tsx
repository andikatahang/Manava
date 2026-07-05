import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Building2, Plus, Check, Pencil, BarChart2,
  Clock, AlertOctagon, UserX, Award, ArrowLeft, UserMinus,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import {
  useDepartments, useDepartmentMutations, useDepartmentManagers,
  type DepartmentDetail, type DepartmentManager,
} from '../../hooks/queries/useDepartments'
import { useEditors } from '../../hooks/queries/useEditors'
import type { Department, Editor, UserRole } from '../../types'
import { ManagerDepartmentView } from './ManagerDepartmentView'
import { IssueWarningForEditor, EditorDetailInfo, EditorAvatar } from './EditorActionModals'
import { TeamPresensiTab } from '../attendance/TeamPresensiTab'
import WarningPage from '../warning/WarningPage'
import OffboardingPage from '../offboarding/OffboardingPage'

const SPEC_LABELS: Record<string, string> = {
  product_retouch: 'Product Retouch',
  color_correction: 'Color Correction',
  video_edit: 'Video Edit',
  color_grading: 'Color Grading',
  portrait_retouch: 'Portrait Retouch',
  background_removal: 'BG Removal',
  vfx: 'VFX',
  motion_graphics: 'Motion Graphics',
}

type HrTab = 'departemen' | 'presensi' | 'peringatan' | 'offboarding'

const HR_TABS: { id: HrTab; label: string; icon: typeof Building2 }[] = [
  { id: 'departemen', label: 'Departemen', icon: Building2 },
  { id: 'presensi', label: 'Presensi', icon: Clock },
  { id: 'peringatan', label: 'Peringatan', icon: AlertOctagon },
  { id: 'offboarding', label: 'Offboarding', icon: UserX },
]

export default function DepartmentsPage({ role, embedded = false }: { role: UserRole; embedded?: boolean }) {
  if (role === 'admin_manager') return <ManagerDepartmentView role={role} embedded={embedded} />
  return <HrDepartmentDashboard />
}

function HrDepartmentDashboard() {
  // Tab lives in the URL (?tab=) so the sidebar sub-navigation can deep-link.
  const [searchParams, setSearchParams] = useSearchParams()
  // Legacy deep-links: the old "cuti" tab merged into "presensi".
  const tabParam = searchParams.get('tab') === 'cuti' ? 'presensi' : searchParams.get('tab')
  const tab: HrTab = HR_TABS.some(t => t.id === tabParam) ? (tabParam as HrTab) : 'departemen'
  const setTab = (id: HrTab) => setSearchParams({ tab: id })
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<DepartmentDetail | null>(null)
  const [managingId, setManagingId] = useState<string | null>(null)
  // A department is a "draft" between creation and its first save — HR must add
  // at least one editor before it can be kept.
  const [draftId, setDraftId] = useState<string | null>(null)

  // Departments arrive with manager + editor rows joined, so no fixture
  // lookups are needed; the editors list feeds the "Tambah Editor" picker.
  const departmentsQuery = useDepartments()
  const editorsQuery = useEditors()
  const mutations = useDepartmentMutations()
  const departments = departmentsQuery.data ?? []
  const allEditors = (editorsQuery.data ?? []).filter(e => e.status === 'active')

  const managing = managingId ? departments.find(d => d.id === managingId) ?? null : null

  function switchTab(id: HrTab) {
    setTab(id)
    setManagingId(null)
  }
  // Create with no members, then drop straight into the new department's page.
  async function createDepartment(name: string, managerId: string) {
    const created = await mutations.create.mutateAsync({ name, manager_id: managerId })
    setShowAdd(false)
    setDraftId(created.id)
    setManagingId(created.id)
  }
  async function updateBasics(depId: string, name: string, managerId: string) {
    await mutations.updateBasics.mutateAsync({ id: depId, name, manager_id: managerId })
    setEditing(null)
  }
  function addMembers(depId: string, editorIds: string[]) {
    mutations.addMembers.mutate({ id: depId, editor_ids: editorIds })
  }
  function removeMember(depId: string, editorId: string) {
    mutations.removeMember.mutate({ id: depId, editor_id: editorId })
  }
  function finishManage() {
    setManagingId(null)
    setDraftId(null)
  }
  function discardDraft(depId: string) {
    mutations.remove.mutate(depId)
    setManagingId(null)
    setDraftId(null)
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {HR_TABS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => switchTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
              tab === id ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'
            }`}
          >
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {tab === 'departemen' && departmentsQuery.isLoading && (
        <p className="text-sm text-navy/50">Memuat departemen…</p>
      )}
      {tab === 'departemen' && departmentsQuery.isError && (
        <p className="text-sm text-red-600">
          Gagal memuat departemen — pastikan backend berjalan. ({(departmentsQuery.error as Error).message})
        </p>
      )}
      {tab === 'departemen' && !departmentsQuery.isLoading && !departmentsQuery.isError && (
        managing ? (
          <DepartmentManageView
            department={managing}
            allEditors={allEditors}
            isNew={managing.id === draftId}
            onDone={finishManage}
            onDiscard={() => discardDraft(managing.id)}
            onEdit={() => setEditing(managing)}
            onAddMembers={editorIds => addMembers(managing.id, editorIds)}
            onRemoveMember={editorId => removeMember(managing.id, editorId)}
          />
        ) : (
          <DepartemenTab
            departments={departments}
            onAdd={() => setShowAdd(true)}
            onManage={d => setManagingId(d.id)}
          />
        )
      )}

      {tab === 'presensi' && <TeamPresensiTab role="hr_admin" />}
      {tab === 'peringatan' && <WarningPage role="hr_admin" />}
      {tab === 'offboarding' && <OffboardingPage />}

      <Modal open={showAdd} onClose={() => setShowAdd(false)} title="Tambah Departemen" size="md">
        <DepartmentBasicForm
          submitLabel="Tambah"
          onSubmit={createDepartment}
          onCancel={() => setShowAdd(false)}
        />
      </Modal>
      <Modal open={!!editing} onClose={() => setEditing(null)} title="Edit Departemen" size="md">
        {editing && (
          <DepartmentBasicForm
            initial={editing}
            submitLabel="Simpan Perubahan"
            onSubmit={(name, managerId) => updateBasics(editing.id, name, managerId)}
            onCancel={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}

// Grouped list table — satu baris ringkas per departemen, tidak memanjang
// ke bawah; detail lengkap dibuka lewat tombol Kelola.
function DepartemenTab({
  departments, onAdd, onManage,
}: {
  departments: DepartmentDetail[]
  onAdd: () => void
  onManage: (d: DepartmentDetail) => void
}) {
  return (
    <div className="space-y-4 max-w-[1140px]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy/60">{departments.length} departemen aktif</p>
        <button className="btn-primary text-sm" onClick={onAdd}>
          <Plus className="w-4 h-4" /> Tambah Departemen
        </button>
      </div>

      <div className="rounded-[12px] border border-black/[0.06] bg-white overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.4fr_1.3fr_0.8fr_0.7fr_110px] items-center gap-3 px-5 py-3 bg-[#fafafa] border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-navy/40">
          <span>Departemen</span>
          <span>Manajer</span>
          <span className="text-right">KPI Rata-rata</span>
          <span className="text-right">Anggota</span>
          <span />
        </div>

        {departments.length === 0 ? (
          <p className="text-sm text-navy/40 px-5 py-8 text-center">Belum ada departemen.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {departments.map(d => <DepartmentRow key={d.id} department={d} onManage={() => onManage(d)} />)}
          </ul>
        )}
      </div>
    </div>
  )
}

function DepartmentRow({ department, onManage }: { department: DepartmentDetail; onManage: () => void }) {
  const manager = department.manager
  const memberCount = department.editors.filter(e => e.status === 'active').length
  const metrics = department.editors.map(e => e.metrics).filter((m): m is NonNullable<typeof m> => !!m)
  const avgKpi = metrics.length ? metrics.reduce((s, m) => s + m.kpi_average, 0) / metrics.length : 0

  return (
    <li className="grid grid-cols-1 sm:grid-cols-[1.4fr_1.3fr_0.8fr_0.7fr_110px] items-center gap-2 sm:gap-3 px-5 py-3.5">
      <span className="flex items-center gap-2.5 min-w-0">
        <span className="grid place-items-center w-8 h-8 rounded-lg bg-navy/5 text-navy shrink-0">
          <Building2 className="w-4 h-4" />
        </span>
        <span className="text-sm font-semibold text-navy truncate">{department.name}</span>
      </span>
      <span className="flex items-center gap-2 min-w-0">
        <Avatar name={manager.full_name} avatar={manager.avatar ?? undefined} />
        <span className="text-sm text-navy/70 truncate">{manager.full_name}</span>
      </span>
      <span className="sm:text-right text-sm font-semibold text-navy tabular-nums">
        {metrics.length > 0 ? avgKpi.toFixed(1) : '—'}
      </span>
      <span className="sm:text-right text-sm text-navy/70 tabular-nums">{memberCount}</span>
      <span className="sm:text-right">
        <button onClick={onManage} className="btn-secondary text-xs py-1.5 px-3.5">
          <Pencil className="w-3.5 h-3.5" /> Kelola
        </button>
      </span>
    </li>
  )
}

// Per-department management page. Department + manager info at the top; simple
// table roster below. New departments require ≥1 editor before Save enables.
function DepartmentManageView({
  department, allEditors, isNew, onDone, onDiscard, onEdit, onAddMembers, onRemoveMember,
}: {
  department: DepartmentDetail
  allEditors: Editor[]
  isNew: boolean
  onDone: () => void
  onDiscard: () => void
  onEdit: () => void
  onAddMembers: (editorIds: string[]) => void
  onRemoveMember: (editorId: string) => void
}) {
  const [showPicker, setShowPicker] = useState(false)
  const [warningTarget, setWarningTarget] = useState<Editor | null>(null)
  const [detailTarget, setDetailTarget] = useState<Editor | null>(null)
  const [removeTarget, setRemoveTarget] = useState<Editor | null>(null)

  const manager = department.manager
  const members = department.editors.filter(e => e.status === 'active')
  const available = allEditors.filter(e => !department.member_ids.includes(e.editor_id))
  const memberMetrics = members.map(e => e.metrics).filter((m): m is NonNullable<typeof m> => !!m)
  const deptKpi = memberMetrics.length
    ? memberMetrics.reduce((s, m) => s + m.kpi_average, 0) / memberMetrics.length
    : 0
  const canSave = members.length >= 1

  return (
    <div className="space-y-5 max-w-[1140px]">
      {isNew ? (
        <p className="text-sm text-navy/50">Langkah terakhir — tambahkan minimal satu editor, lalu simpan.</p>
      ) : (
        <button
          onClick={onDone}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-navy/60 hover:text-navy transition-colors"
        >
          <ArrowLeft className="w-4 h-4" /> Kembali ke daftar
        </button>
      )}

      {/* Department + manager info */}
      <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5 space-y-4">
        <div className="flex items-center gap-3">
          <span className="grid place-items-center w-11 h-11 rounded-xl bg-navy text-white shrink-0">
            <Building2 className="w-5 h-5" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wider text-navy/40">Departemen</p>
            <h2 className="text-lg font-semibold text-navy truncate leading-tight">{department.name}</h2>
          </div>
          <button onClick={onEdit} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
            <Pencil className="w-3.5 h-3.5" /> Edit Departemen
          </button>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="sm:col-span-2 flex items-center gap-3 rounded-xl border border-navy/10 bg-navy/[0.03] p-3">
            <Avatar name={manager.full_name} avatar={manager.avatar ?? undefined} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-navy/40">Manajer Departemen</p>
              <p className="text-sm font-semibold text-navy truncate">{manager.full_name}</p>
              <p className="text-xs text-navy/50 truncate">{manager.department}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <KpiCell icon={<Award className="w-3.5 h-3.5 text-emerald-500" />} label="Editor" value={String(members.length)} />
            <KpiCell icon={<BarChart2 className="w-3.5 h-3.5 text-navy/50" />} label="KPI Rata-rata" value={deptKpi.toFixed(1)} highlight />
          </div>
        </div>
      </div>

      {/* Roster */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <p className="text-[11px] uppercase tracking-wider text-navy/40">Daftar Editor ({members.length})</p>
          {available.length > 0 && (
            <button onClick={() => setShowPicker(true)} className="btn-secondary text-xs py-1.5 px-3">
              <Plus className="w-3.5 h-3.5" /> Tambah Editor
            </button>
          )}
        </div>

        {members.length === 0 ? (
          <div className="rounded-[12px] border border-dashed border-navy/15 p-8 text-center">
            <p className="text-sm text-navy/40">Belum ada editor. Tambahkan minimal satu untuk menyimpan.</p>
            <button onClick={() => setShowPicker(true)} className="btn-primary text-xs py-1.5 px-3 mt-3">
              <Plus className="w-3.5 h-3.5" /> Tambah Editor
            </button>
          </div>
        ) : (
          <div className="rounded-[12px] border border-black/[0.06] overflow-hidden bg-white">
            <div className="hidden sm:grid grid-cols-[1.5fr_0.5fr_360px] items-center gap-3 px-4 py-2.5 bg-[#fafafa] border-b border-black/[0.06] text-[11px] font-medium uppercase tracking-wider text-navy/40">
              <span>Editor</span>
              <span className="text-right">KPI Score</span>
              <span />
            </div>
            <ul className="divide-y divide-black/[0.05]">
              {members.map(e => {
                const metric = e.metrics
                return (
                  <li key={e.editor_id} className="grid grid-cols-1 sm:grid-cols-[1.5fr_0.5fr_360px] items-center gap-2 sm:gap-3 px-4 py-3">
                    <span className="flex items-center gap-3 min-w-0">
                      <EditorAvatar name={e.full_name} avatar={e.avatar} />
                      <span className="text-sm font-medium text-navy truncate">{e.full_name}</span>
                    </span>
                    <span className="sm:text-right text-sm font-semibold text-navy tabular-nums">
                      {metric ? metric.kpi_average.toFixed(1) : '—'}
                    </span>
                    <span className="flex flex-wrap sm:justify-end gap-2">
                      <button
                        onClick={() => setWarningTarget(e)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-red-700 border border-red-200 bg-red-50 hover:bg-red-100 px-3 py-1.5 rounded-full transition-colors"
                      >
                        <AlertOctagon className="w-3.5 h-3.5" /> Peringatan Kerja
                      </button>
                      <button onClick={() => setDetailTarget(e)} className="btn-secondary text-xs py-1.5 px-3.5">
                        Detail
                      </button>
                      <button
                        onClick={() => setRemoveTarget(e)}
                        title="Keluarkan dari departemen"
                        className="grid place-items-center w-8 h-8 rounded-lg text-navy/40 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                      >
                        <UserMinus className="w-4 h-4" />
                      </button>
                    </span>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

      <Modal open={!!warningTarget} onClose={() => setWarningTarget(null)} title="Terbitkan Peringatan Kerja" size="md">
        {warningTarget && <IssueWarningForEditor editor={warningTarget} onDone={() => setWarningTarget(null)} />}
      </Modal>

      <Modal open={!!detailTarget} onClose={() => setDetailTarget(null)} title="Detail Editor" size="md">
        {detailTarget && <EditorDetailInfo editor={detailTarget} />}
      </Modal>

      <Modal open={!!removeTarget} onClose={() => setRemoveTarget(null)} title="Keluarkan dari Departemen" size="sm">
        {removeTarget && (
          <div className="space-y-4">
            <p className="text-sm text-navy/70 leading-relaxed">
              Keluarkan <span className="font-semibold text-navy">{removeTarget.full_name}</span> dari
              departemen <span className="font-semibold text-navy">{department.name}</span>?
              Editor tetap aktif dan dapat ditambahkan kembali kapan saja.
            </p>
            <div className="flex justify-end gap-2">
              <button className="btn-secondary" onClick={() => setRemoveTarget(null)}>Batal</button>
              <button
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-full transition-colors"
                onClick={() => { onRemoveMember(removeTarget.editor_id); setRemoveTarget(null) }}
              >
                <UserMinus className="w-4 h-4" /> Keluarkan
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Save bar */}
      <div className="flex items-center justify-between gap-3 border-t border-black/[0.06] pt-4">
        <p className="text-xs text-navy/50">
          {canSave ? `${members.length} editor di departemen ini` : 'Tambah minimal 1 editor untuk menyimpan.'}
        </p>
        <div className="flex gap-2">
          {isNew && (
            <button onClick={onDiscard} className="btn-secondary text-sm">Batal</button>
          )}
          <button
            onClick={onDone}
            disabled={!canSave}
            className="btn-primary text-sm disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Check className="w-4 h-4" /> Simpan
          </button>
        </div>
      </div>

      <AddEditorModal
        open={showPicker}
        available={available}
        onClose={() => setShowPicker(false)}
        onConfirm={ids => { onAddMembers(ids); setShowPicker(false) }}
      />
    </div>
  )
}

// Editor picker used from the department page to add employees to a department.
function AddEditorModal({
  open, available, onClose, onConfirm,
}: {
  open: boolean
  available: Editor[]
  onClose: () => void
  onConfirm: (editorIds: string[]) => void
}) {
  const [picked, setPicked] = useState<string[]>([])

  function toggle(id: string) {
    setPicked(prev => (prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]))
  }
  function confirm() {
    if (picked.length) onConfirm(picked)
    setPicked([])
  }
  function cancel() { setPicked([]); onClose() }

  return (
    <Modal open={open} onClose={cancel} title="Tambah Editor" size="md">
      {available.length === 0 ? (
        <p className="text-sm text-navy/50 py-4 text-center">Semua editor aktif sudah tergabung di departemen ini.</p>
      ) : (
        <div className="space-y-4">
          <ul className="space-y-1.5 max-h-72 overflow-y-auto pr-0.5">
            {available.map(e => {
              const checked = picked.includes(e.editor_id)
              return (
                <li key={e.editor_id}>
                  <button
                    type="button"
                    onClick={() => toggle(e.editor_id)}
                    className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-colors ${checked ? 'border-navy bg-navy/5' : 'border-border hover:border-navy/30'}`}
                  >
                    <span className={`w-5 h-5 rounded-md border grid place-items-center shrink-0 ${checked ? 'bg-navy border-navy text-white' : 'border-navy/30'}`}>
                      {checked && <Check className="w-3.5 h-3.5" />}
                    </span>
                    <Avatar name={e.full_name} avatar={e.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy truncate">{e.full_name}</p>
                      <p className="text-xs text-navy/50 truncate">
                        {e.specialization.map(s => SPEC_LABELS[s] ?? s).join(' · ')}
                      </p>
                    </div>
                  </button>
                </li>
              )
            })}
          </ul>
          <div className="flex justify-end gap-2 pt-1">
            <button className="btn-secondary" onClick={cancel}>Batal</button>
            <button className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed" disabled={picked.length === 0} onClick={confirm}>
              Tambah {picked.length > 0 ? `(${picked.length})` : ''}
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}

function KpiCell({ label, value, icon, highlight }: { label: string; value: string; icon?: React.ReactNode; highlight?: boolean }) {
  return (
    <div className={`rounded-xl border px-3 py-2.5 ${highlight ? 'border-navy/20 bg-navy/[0.04]' : 'border-border'}`}>
      <p className="text-[10px] uppercase tracking-wider text-navy/40 flex items-center gap-1">{icon}{label}</p>
      <p className={`text-sm font-bold mt-0.5 leading-tight ${highlight ? 'text-navy' : 'text-navy'}`}>{value}</p>
    </div>
  )
}

// Just name + manager — HR fills the roster on the department page itself.
function DepartmentBasicForm({
  initial, submitLabel, onSubmit, onCancel,
}: {
  initial?: Department
  submitLabel: string
  onSubmit: (name: string, managerId: string) => void
  onCancel: () => void
}) {
  const managersQuery = useDepartmentManagers()
  const managers: DepartmentManager[] = managersQuery.data ?? []
  const [name, setName] = useState(initial?.name ?? '')
  const [managerId, setManagerId] = useState(initial?.manager_id ?? '')
  // Default the picker to the first manager once the list arrives.
  const effectiveManagerId = managerId || managers[0]?.id || ''
  const [error, setError] = useState('')

  function submit() {
    if (!name.trim()) { setError('Nama departemen wajib diisi'); return }
    if (!effectiveManagerId) { setError('Pilih manajer terlebih dahulu'); return }
    onSubmit(name.trim(), effectiveManagerId)
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Nama Departemen</label>
        <input
          className="input"
          value={name}
          onChange={e => { setName(e.target.value); setError('') }}
          placeholder="mis. Motion Graphics"
          autoFocus
        />
        {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
      </div>

      <div>
        <label className="label">Manajer</label>
        <select className="input" value={effectiveManagerId} onChange={e => setManagerId(e.target.value)}>
          {managers.map(m => (
            <option key={m.id} value={m.id}>{m.full_name} — {m.department}</option>
          ))}
        </select>
      </div>

      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onCancel}>Batal</button>
        <button className="btn-primary" onClick={submit}>{submitLabel}</button>
      </div>
    </div>
  )
}

function Avatar({ name, avatar }: { name: string; avatar?: string }) {
  if (avatar) return <img src={avatar} alt="" className="w-9 h-9 rounded-full object-cover shrink-0" />
  return (
    <div className="w-9 h-9 rounded-full bg-navy/10 flex items-center justify-center text-xs font-semibold text-navy shrink-0">
      {name.split(' ').map(n => n[0]).join('').slice(0, 2)}
    </div>
  )
}
