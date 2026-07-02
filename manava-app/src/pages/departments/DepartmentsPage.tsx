import { useState } from 'react'
import {
  Building2, Plus, Check, Pencil, Star, BarChart2,
  Clock, CalendarCheck, AlertOctagon, UserX, TrendingUp, Award, ArrowLeft, UserMinus,
} from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { PageHeader, StatPillsRow } from '../../components/page/PageHeader'
import {
  mockDepartments, mockAdminManagers, mockEditors, mockEditorMetrics,
} from '../../data/mockData'
import type { Department, UserRole } from '../../types'
import { ManagerDepartmentView } from './ManagerDepartmentView'
import AttendancePage from '../attendance/AttendancePage'
import WarningPage from '../warning/WarningPage'
import OffboardingPage from '../offboarding/OffboardingPage'
import PerformancePage from '../performance/PerformancePage'

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

const ACTIVE_EDITORS = mockEditors.filter(e => e.status === 'active')

type HrTab = 'departemen' | 'kpi' | 'presensi' | 'cuti' | 'peringatan' | 'offboarding'

const HR_TABS: { id: HrTab; label: string; icon: typeof Building2 }[] = [
  { id: 'departemen', label: 'Departemen', icon: Building2 },
  { id: 'kpi', label: 'KPI Editor', icon: BarChart2 },
  { id: 'presensi', label: 'Presensi', icon: Clock },
  { id: 'cuti', label: 'Permohonan Cuti', icon: CalendarCheck },
  { id: 'peringatan', label: 'Peringatan', icon: AlertOctagon },
  { id: 'offboarding', label: 'Offboarding', icon: UserX },
]

const BAND_LABEL: Record<string, string> = {
  excellent: 'Sangat Baik',
  good: 'Baik',
  needs_improvement: 'Perlu Peningkatan',
}
const BAND_STYLE: Record<string, string> = {
  excellent: 'text-emerald-700 bg-emerald-50 border-emerald-200',
  good: 'text-blue-700 bg-blue-50 border-blue-200',
  needs_improvement: 'text-amber-700 bg-amber-50 border-amber-200',
}

export default function DepartmentsPage({ role, embedded = false }: { role: UserRole; embedded?: boolean }) {
  if (role === 'admin_manager') return <ManagerDepartmentView role={role} embedded={embedded} />
  return <HrDepartmentDashboard role={role} />
}

function HrDepartmentDashboard({ role }: { role: UserRole }) {
  const [tab, setTab] = useState<HrTab>('departemen')
  const [departments, setDepartments] = useState<Department[]>(mockDepartments)
  const [showAdd, setShowAdd] = useState(false)
  const [editing, setEditing] = useState<Department | null>(null)
  const [managingId, setManagingId] = useState<string | null>(null)
  // A department is a "draft" between creation and its first save — HR must add
  // at least one editor before it can be kept.
  const [draftId, setDraftId] = useState<string | null>(null)

  const managing = managingId ? departments.find(d => d.id === managingId) ?? null : null

  const totalEditors = ACTIVE_EDITORS.length
  const allKpi = mockEditorMetrics.map(m => m.kpi_average)
  const avgKpi = allKpi.length ? allKpi.reduce((a, b) => a + b, 0) / allKpi.length : 0

  function switchTab(id: HrTab) {
    setTab(id)
    setManagingId(null)
  }
  // Create with no members, then drop straight into the new department's page.
  function createDepartment(name: string, managerId: string) {
    const dep: Department = { id: `d-${Date.now()}`, name, manager_id: managerId, member_ids: [] }
    setDepartments(prev => [dep, ...prev])
    setShowAdd(false)
    setDraftId(dep.id)
    setManagingId(dep.id)
  }
  function updateBasics(depId: string, name: string, managerId: string) {
    setDepartments(prev => prev.map(d => (d.id === depId ? { ...d, name, manager_id: managerId } : d)))
    setEditing(null)
  }
  function addMembers(depId: string, editorIds: string[]) {
    setDepartments(prev => prev.map(d =>
      d.id === depId ? { ...d, member_ids: Array.from(new Set([...d.member_ids, ...editorIds])) } : d,
    ))
  }
  function removeMember(depId: string, editorId: string) {
    setDepartments(prev => prev.map(d =>
      d.id === depId ? { ...d, member_ids: d.member_ids.filter(id => id !== editorId) } : d,
    ))
  }
  function finishManage() {
    setManagingId(null)
    setDraftId(null)
  }
  function discardDraft(depId: string) {
    setDepartments(prev => prev.filter(d => d.id !== depId))
    setManagingId(null)
    setDraftId(null)
  }

  const stats = [
    { label: 'Departemen', value: departments.length, tone: 'navy' as const },
    { label: 'Total Editor', value: totalEditors, tone: 'blue' as const },
    { label: 'Rata-rata KPI', value: avgKpi.toFixed(1), tone: 'emerald' as const },
  ]

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Pusat HR"
        title="Dashboard Departemen"
        description="Kelola departemen, pantau KPI tim, presensi, peringatan kerja, dan offboarding dalam satu tempat."
        role={role}
      >
        <StatPillsRow items={stats} cols={3} />
      </PageHeader>

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

      {tab === 'departemen' && (
        managing ? (
          <DepartmentManageView
            department={managing}
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

      {tab === 'kpi' && <PerformancePage role="hr_admin" embedded />}
      {tab === 'presensi' && <AttendancePage role="hr_admin" embedded forcedView="attendance" />}
      {tab === 'cuti' && <AttendancePage role="hr_admin" embedded forcedView="leave" />}
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

function DepartemenTab({
  departments, onAdd, onManage,
}: {
  departments: Department[]
  onAdd: () => void
  onManage: (d: Department) => void
}) {
  return (
    <div className="space-y-4 max-w-[1140px]">
      <div className="flex items-center justify-between">
        <p className="text-sm text-navy/60">{departments.length} departemen aktif</p>
        <button className="btn-primary text-sm" onClick={onAdd}>
          <Plus className="w-4 h-4" /> Tambah Departemen
        </button>
      </div>

      <div className="space-y-4">
        {departments.map(d => (
          <DepartmentKpiCard key={d.id} department={d} onManage={() => onManage(d)} />
        ))}
      </div>
    </div>
  )
}

// Per-department management page. Department + manager info at the top; simple
// table roster below. New departments require ≥1 editor before Save enables.
function DepartmentManageView({
  department, isNew, onDone, onDiscard, onEdit, onAddMembers, onRemoveMember,
}: {
  department: Department
  isNew: boolean
  onDone: () => void
  onDiscard: () => void
  onEdit: () => void
  onAddMembers: (editorIds: string[]) => void
  onRemoveMember: (editorId: string) => void
}) {
  const [showPicker, setShowPicker] = useState(false)

  const manager = mockAdminManagers.find(m => m.id === department.manager_id)
  const members = ACTIVE_EDITORS.filter(e => department.member_ids.includes(e.editor_id))
  const available = ACTIVE_EDITORS.filter(e => !department.member_ids.includes(e.editor_id))
  const memberMetrics = mockEditorMetrics.filter(m => department.member_ids.includes(m.editor_id))
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
            <Avatar name={manager?.full_name ?? '—'} avatar={manager?.avatar} />
            <div className="min-w-0">
              <p className="text-[11px] uppercase tracking-wider text-navy/40">Manajer Departemen</p>
              <p className="text-sm font-semibold text-navy truncate">{manager?.full_name ?? 'Belum ditunjuk'}</p>
              {manager && <p className="text-xs text-navy/50 truncate">{manager.department}</p>}
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
            <div className="flex items-center gap-3 px-4 py-2.5 bg-[#fafafa] border-b border-black/[0.06] text-[11px] font-medium uppercase tracking-wider text-navy/40">
              <span className="flex-1">Editor</span>
              <span className="w-14 text-right">KPI</span>
              <span className="w-32 hidden sm:block">Kinerja</span>
              <span className="w-8" />
            </div>
            <ul className="divide-y divide-black/[0.05]">
              {members.map(e => {
                const metric = mockEditorMetrics.find(m => m.editor_id === e.editor_id)
                return (
                  <li key={e.editor_id} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={e.full_name} avatar={e.avatar} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-navy truncate">{e.full_name}</p>
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {e.specialization.map(s => <SkillTag key={s} skill={s} />)}
                      </div>
                    </div>
                    <span className="w-14 text-right text-sm font-semibold text-navy tabular-nums">
                      {metric ? metric.kpi_average.toFixed(1) : '—'}
                    </span>
                    <span className="w-32 hidden sm:block">
                      {metric && (
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${BAND_STYLE[metric.performance_band]}`}>
                          {BAND_LABEL[metric.performance_band]}
                        </span>
                      )}
                    </span>
                    <button
                      onClick={() => onRemoveMember(e.editor_id)}
                      title="Keluarkan dari departemen"
                      className="grid place-items-center w-8 h-8 rounded-lg text-navy/40 hover:text-red-600 hover:bg-red-50 transition-colors shrink-0"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
        )}
      </div>

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
  available: typeof ACTIVE_EDITORS
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

function DepartmentKpiCard({ department, onManage }: { department: Department; onManage: () => void }) {
  const manager = mockAdminManagers.find(m => m.id === department.manager_id)
  const members = ACTIVE_EDITORS.filter(e => department.member_ids.includes(e.editor_id))
  const memberMetrics = mockEditorMetrics.filter(m => department.member_ids.includes(m.editor_id))

  const deptKpi = memberMetrics.length
    ? memberMetrics.reduce((s, m) => s + m.kpi_average, 0) / memberMetrics.length
    : 0
  const avgRating = memberMetrics.length
    ? memberMetrics.reduce((s, m) => s + m.avg_client_rating, 0) / memberMetrics.length
    : 0
  const avgCompletion = memberMetrics.length
    ? memberMetrics.reduce((s, m) => s + m.completion_rate, 0) / memberMetrics.length
    : 0

  const bandCounts = { excellent: 0, good: 0, needs_improvement: 0 }
  for (const m of memberMetrics) {
    bandCounts[m.performance_band] = (bandCounts[m.performance_band] ?? 0) + 1
  }

  return (
    <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="grid place-items-center w-10 h-10 rounded-xl bg-navy text-white shrink-0">
          <Building2 className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="font-semibold text-navy truncate">{department.name}</h3>
          <p className="text-xs text-navy/50">{members.length} anggota</p>
        </div>
        <button onClick={onManage} className="btn-secondary text-xs py-1.5 px-3 shrink-0">
          <Pencil className="w-3.5 h-3.5" /> Kelola
        </button>
      </div>

      {/* Manager */}
      <div className="flex items-center gap-3 rounded-xl border border-navy/10 bg-navy/[0.03] p-3">
        <Avatar name={manager?.full_name ?? '—'} avatar={manager?.avatar} />
        <div className="min-w-0">
          <p className="text-[11px] uppercase tracking-wider text-navy/40">Manajer</p>
          <p className="text-sm font-semibold text-navy truncate">{manager?.full_name ?? 'Belum ditunjuk'}</p>
        </div>
      </div>

      {/* Department KPI */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-2">KPI Departemen</p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <KpiCell icon={<BarChart2 className="w-3.5 h-3.5 text-navy/50" />} label="KPI Rata-rata" value={deptKpi.toFixed(1)} highlight />
          <KpiCell icon={<Star className="w-3.5 h-3.5 text-amber-500" />} label="Rating Klien" value={avgRating.toFixed(1)} />
          <KpiCell icon={<TrendingUp className="w-3.5 h-3.5 text-blue-500" />} label="Penyelesaian" value={`${Math.round(avgCompletion)}%`} />
          <KpiCell icon={<Award className="w-3.5 h-3.5 text-emerald-500" />} label="Editor" value={String(members.length)} />
        </div>
      </div>

      {/* Performance distribution */}
      {memberMetrics.length > 0 && (
        <div>
          <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-2">Distribusi Kinerja</p>
          <div className="flex gap-2 flex-wrap">
            {Object.entries(bandCounts).map(([band, count]) => (
              count > 0 && (
                <span
                  key={band}
                  className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-1 rounded-full border ${BAND_STYLE[band]}`}
                >
                  {BAND_LABEL[band]} · {count}
                </span>
              )
            ))}
          </div>
        </div>
      )}

      {/* Member list */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-2">Anggota</p>
        {members.length === 0 ? (
          <p className="text-sm text-navy/40">Belum ada anggota.</p>
        ) : (
          <ul className="space-y-2.5">
            {members.map(e => {
              const metric = mockEditorMetrics.find(m => m.editor_id === e.editor_id)
              return (
                <li key={e.editor_id} className="flex items-center gap-3">
                  <Avatar name={e.full_name} avatar={e.avatar} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy truncate">{e.full_name}</p>
                    <div className="flex flex-wrap gap-1 mt-0.5">
                      {e.specialization.map(s => <SkillTag key={s} skill={s} />)}
                    </div>
                  </div>
                  {metric && (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold text-navy tabular-nums flex items-center gap-0.5">
                        <Star className="w-3 h-3 text-amber-500" />
                        {metric.kpi_average.toFixed(1)}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${BAND_STYLE[metric.performance_band]}`}>
                        {BAND_LABEL[metric.performance_band]}
                      </span>
                    </div>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
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
  const [name, setName] = useState(initial?.name ?? '')
  const [managerId, setManagerId] = useState(initial?.manager_id ?? mockAdminManagers[0]?.id ?? '')
  const [error, setError] = useState('')

  function submit() {
    if (!name.trim()) { setError('Nama departemen wajib diisi'); return }
    onSubmit(name.trim(), managerId)
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
        <select className="input" value={managerId} onChange={e => setManagerId(e.target.value)}>
          {mockAdminManagers.map(m => (
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

function SkillTag({ skill }: { skill: string }) {
  return (
    <span className="text-[10px] font-medium text-navy/60 bg-navy/5 px-1.5 py-0.5 rounded">
      {SPEC_LABELS[skill] ?? skill}
    </span>
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
