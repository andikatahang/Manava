import { useMemo, useState } from 'react'
import { AlertOctagon, Plus, Filter, Calendar } from 'lucide-react'
import { StatPillsRow } from '../../components/page/PageHeader'
import { Modal } from '../../components/ui/Modal'
import {
  useWarnings, useWarningMutations,
  type Warning, type WarningSeverity as Severity,
  type WarningStatus as Status, type WarningTargetRole as TargetRole,
} from '../../hooks/queries/useWarnings'
import { useUsers } from '../../hooks/queries/useUsers'
import type { UserRole } from '../../types'

// Pool of candidate targets: real user accounts with role editor or
// admin_manager, so every warning is addressed to an account that can see it.
interface Candidate { id: string; name: string; role: TargetRole; subLabel: string }

const ROLE_LABEL: Record<TargetRole, string> = {
  editor: 'Editor',
  admin_manager: 'Admin Manager',
}

const SEVERITY_TONE: Record<Severity, string> = {
  ringan: 'bg-[#FEF3C7] text-[#B45309] border-[#FCD34D]',
  sedang: 'bg-[#FFEDD5] text-[#C2410C] border-[#FDBA74]',
  berat:  'bg-[#FEE2E2] text-[#B91C1C] border-[#FCA5A5]',
}

const STATUS_TONE: Record<Status, string> = {
  aktif:       'bg-[#021526] text-white',
  diakui:      'bg-[#DCFCE7] text-[#047857]',
  kedaluwarsa: 'bg-[#E5EBF0] text-[#596074]',
}

interface WarningPageProps { role: UserRole }

const HEADER_BY_ROLE: Record<UserRole, { eyebrow: string; title: string; description: string; canIssue: boolean }> = {
  superadmin:    { eyebrow: 'HR oversight', title: 'Peringatan Kerja', description: '', canIssue: false },
  hr_admin:      { eyebrow: 'HR enforcement', title: 'Peringatan Kerja', description: 'Terbitkan peringatan kerja kepada editor atau manajer berdasarkan KPI, kepatuhan absensi, atau performa departemen.', canIssue: true },
  admin_manager: { eyebrow: 'Tim saya', title: 'Peringatan Diterima', description: 'Peringatan kerja yang diterbitkan HR Admin terhadap Anda atau anggota tim Anda.', canIssue: false },
  editor:        { eyebrow: 'Catatan untuk saya', title: 'Peringatan Diterima', description: 'Peringatan kerja yang HR Admin terbitkan untuk Anda. Akui peringatan dan ambil tindakan korektif sebelum kedaluwarsa.', canIssue: false },
  client:        { eyebrow: 'HR', title: 'Peringatan Kerja', description: '', canIssue: false },
  mediator:      { eyebrow: 'HR', title: 'Peringatan Kerja', description: '', canIssue: false },
  finance:       { eyebrow: 'HR', title: 'Peringatan Kerja', description: '', canIssue: false },
}

export default function WarningPage({ role }: WarningPageProps) {
  const h = HEADER_BY_ROLE[role] ?? HEADER_BY_ROLE.hr_admin
  const [filter, setFilter] = useState<Status | 'all'>('all')
  const [showForm, setShowForm] = useState(false)
  const [selected, setSelected] = useState<Warning | null>(null)

  const warningsQuery = useWarnings()
  const mutations = useWarningMutations()
  const warnings = warningsQuery.data ?? []

  const usersQuery = useUsers(h.canIssue)
  const candidates = useMemo<Candidate[]>(
    () =>
      (usersQuery.data ?? [])
        .filter(u => u.is_active && (u.role === 'editor' || u.role === 'admin_manager'))
        .map(u => ({ id: u.user_id, name: u.full_name, role: u.role as TargetRole, subLabel: u.email })),
    [usersQuery.data],
  )

  async function issueWarning(input: { targetId: string; reason: string; severity: Severity }) {
    await mutations.create.mutateAsync({
      target_user_id: input.targetId,
      reason: input.reason.trim(),
      severity: input.severity,
    })
    setShowForm(false)
  }

  function updateStatus(id: string, status: Status) {
    mutations.updateStatus.mutate({ id, status })
    setSelected(prev => (prev && prev.id === id ? { ...prev, status } : prev))
  }

  const filtered = filter === 'all' ? warnings : warnings.filter(w => w.status === filter)

  const stats = [
    { label: 'Aktif',       value: warnings.filter(w => w.status === 'aktif').length, tone: 'red' as const,     hint: 'belum diakui' },
    { label: 'Diakui',      value: warnings.filter(w => w.status === 'diakui').length, tone: 'emerald' as const, hint: 'sudah dikonfirmasi' },
    { label: 'Severity berat', value: warnings.filter(w => w.severity === 'berat').length, tone: 'amber' as const, hint: 'butuh action plan' },
  ]

  return (
    <div className="space-y-6 max-w-[1140px]">
      {/* Stats + primary action (nama halaman sudah di bar atas) */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <StatPillsRow items={stats} cols={3} />
        {h.canIssue && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1.5 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-4 py-2 rounded-full text-[13px] tracking-[-0.01em] transition-all duration-150"
            style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
          >
            <Plus className="w-3.5 h-3.5" strokeWidth={2} />
            Terbitkan Peringatan
          </button>
        )}
      </div>

      <div className="flex items-center gap-1.5 overflow-x-auto" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
        <Filter className="w-3.5 h-3.5 text-[#596074] flex-shrink-0" />
        {(['all', 'aktif', 'diakui', 'kedaluwarsa'] as const).map(s => (
          <button
            key={s}
            type="button"
            onClick={() => setFilter(s)}
            className={`px-3 py-1.5 rounded-full text-[12px] font-semibold whitespace-nowrap transition-all ${filter === s ? 'bg-[#021526] text-white' : 'bg-white text-[#596074] border border-black/[0.06] hover:border-[#021526]/20'}`}
          >
            {s === 'all' ? 'Semua' : s[0].toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {/* Tabel minimalis — satu baris ringkas per peringatan; detail lengkap
          (catatan, penerbit) dibuka lewat tombol Detail. */}
      <div className="rounded-[12px] border border-black/[0.06] bg-white overflow-hidden">
        <div className="hidden sm:grid grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_190px] items-center gap-3 px-5 py-3 bg-[#fafafa] border-b border-black/[0.06] text-[11px] font-semibold uppercase tracking-wider text-[#596074]/80">
          <span>Penerima</span>
          <span>Severity</span>
          <span>Status</span>
          <span>Kedaluwarsa</span>
          <span />
        </div>

        {filtered.length === 0 ? (
          <p className="text-sm text-[#596074]/70 px-5 py-8 text-center">Tidak ada peringatan pada filter ini.</p>
        ) : (
          <ul className="divide-y divide-black/[0.05]">
            {filtered.map(w => (
              <li key={w.id} className="grid grid-cols-1 sm:grid-cols-[1.4fr_0.7fr_0.7fr_0.8fr_190px] items-center gap-2 sm:gap-3 px-5 py-3">
                <span className="flex items-center gap-2.5 min-w-0">
                  <span className="w-8 h-8 rounded-lg bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center flex-shrink-0">
                    <AlertOctagon className="w-4 h-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold text-[#021526] truncate">{w.targetName}</span>
                    <span className="block text-[11px] text-[#596074] truncate">{ROLE_LABEL[w.targetRole]}</span>
                  </span>
                </span>
                <span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.06em] border ${SEVERITY_TONE[w.severity]}`}>
                    {w.severity}
                  </span>
                </span>
                <span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10.5px] font-semibold ${STATUS_TONE[w.status]}`}>
                    {w.status}
                  </span>
                </span>
                <span className="text-[12.5px] text-[#596074] tabular-nums inline-flex items-center gap-1">
                  <Calendar className="w-3 h-3" /> {w.expiresAt}
                </span>
                <span className="flex sm:justify-end gap-2">
                  {(role === 'editor' || role === 'admin_manager') && w.status === 'aktif' && (
                    <button
                      onClick={() => updateStatus(w.id, 'diakui')}
                      className="bg-[#021526] hover:brightness-110 text-white font-semibold px-3 py-1.5 rounded-full text-[11.5px]"
                    >
                      Akui
                    </button>
                  )}
                  <button onClick={() => setSelected(w)} className="btn-secondary text-xs py-1.5 px-3.5">
                    Detail
                  </button>
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Terbitkan Peringatan Kerja" size="md">
        <IssueWarningForm
          candidates={candidates}
          onCancel={() => setShowForm(false)}
          onSubmit={issueWarning}
        />
      </Modal>

      <Modal open={!!selected} onClose={() => setSelected(null)} title="Detail Peringatan" size="md">
        {selected && (
          <WarningDetail
            warning={selected}
            role={role}
            onClose={() => setSelected(null)}
            onStatusChange={s => updateStatus(selected.id, s)}
          />
        )}
      </Modal>
    </div>
  )
}

interface IssueWarningFormProps {
  candidates: Candidate[]
  onCancel: () => void
  onSubmit: (input: { targetId: string; reason: string; severity: Severity }) => void
}

function IssueWarningForm({ candidates, onCancel, onSubmit }: IssueWarningFormProps) {
  const [targetId, setTargetId] = useState('')
  const [severity, setSeverity] = useState<Severity>('sedang')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')

  const target = candidates.find(c => c.id === targetId)
  const canSubmit = Boolean(targetId) && reason.trim().length > 0

  function handleSubmit() {
    if (!targetId) { setError('Pilih pengguna terlebih dahulu.'); return }
    if (!reason.trim()) { setError('Catatan wajib diisi.'); return }
    onSubmit({ targetId, reason, severity })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="label">Pengguna</label>
        <select
          className="input"
          value={targetId}
          onChange={e => { setTargetId(e.target.value); setError('') }}
        >
          <option value="" disabled>Pilih pengguna…</option>
          <optgroup label="Editor">
            {candidates.filter(c => c.role === 'editor').map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.subLabel}</option>
            ))}
          </optgroup>
          <optgroup label="Admin Manager">
            {candidates.filter(c => c.role === 'admin_manager').map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.subLabel}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Auto-derived role chip so HR sees who they're targeting. */}
      <div>
        <label className="label">Role</label>
        {target ? (
          <div className="flex items-center gap-2 rounded-xl border border-navy/10 bg-navy/[0.03] px-3 py-2.5">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-navy text-white">
              {ROLE_LABEL[target.role]}
            </span>
            <span className="text-sm text-navy/60 truncate">{target.subLabel}</span>
          </div>
        ) : (
          <p className="text-xs text-navy/40 px-1">Role akan muncul setelah pengguna dipilih.</p>
        )}
      </div>

      <div>
        <label className="label">Severity</label>
        <div className="flex flex-wrap gap-2">
          {(['ringan', 'sedang', 'berat'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSeverity(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold uppercase tracking-[0.06em] border transition-colors ${
                severity === s ? SEVERITY_TONE[s] : 'bg-white text-navy/60 border-black/[0.08] hover:border-navy/30'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-navy/45 mt-1.5">Berat berlaku 6 bulan · Sedang 3 bulan · Ringan 2 bulan.</p>
      </div>

      <div>
        <label className="label">
          Catatan <span className="text-red-600">*</span>
        </label>
        <textarea
          rows={4}
          className="input resize-none"
          value={reason}
          onChange={e => { setReason(e.target.value); setError('') }}
          placeholder="Jelaskan alasan peringatan — kebijakan yang dilanggar, bukti, dampak, dan ekspektasi tindak lanjut."
        />
        <p className="text-[11px] text-navy/45 mt-1">Wajib diisi. Akan disimpan di catatan HR dan dikirim ke penerima.</p>
      </div>

      {error && <p className="text-xs text-red-600">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button className="btn-secondary" onClick={onCancel}>Batal</button>
        <button
          className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          disabled={!canSubmit}
          onClick={handleSubmit}
        >
          Terbitkan
        </button>
      </div>
    </div>
  )
}

interface WarningDetailProps {
  warning: Warning
  role: UserRole
  onClose: () => void
  onStatusChange: (status: Status) => void
}

function WarningDetail({ warning, role, onClose, onStatusChange }: WarningDetailProps) {
  const canManage = role === 'hr_admin' || role === 'superadmin'
  return (
    <div className="space-y-5">
      {/* Header block: target + severity + status */}
      <div className="flex items-start gap-3">
        <span className="w-11 h-11 rounded-full bg-[#FEE2E2] text-[#B91C1C] flex items-center justify-center flex-shrink-0">
          <AlertOctagon className="w-5 h-5" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[11px] uppercase tracking-wider text-navy/40">Diterbitkan kepada</p>
          <h3 className="text-base font-semibold text-navy truncate leading-tight">{warning.targetName}</h3>
          <p className="text-xs text-navy/50 mt-0.5">{ROLE_LABEL[warning.targetRole]}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold uppercase tracking-[0.06em] border ${SEVERITY_TONE[warning.severity]}`}>
          Severity {warning.severity}
        </span>
        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold ${STATUS_TONE[warning.status]}`}>
          {warning.status}
        </span>
      </div>

      {/* Catatan */}
      <div>
        <p className="text-[11px] uppercase tracking-wider text-navy/40 mb-1.5">Catatan HR Admin</p>
        <div className="rounded-xl border border-black/[0.06] bg-[#fbfbfb] p-3.5">
          <p className="text-sm text-navy leading-relaxed whitespace-pre-wrap">{warning.reason}</p>
        </div>
      </div>

      {/* Meta grid */}
      <div className="grid grid-cols-2 gap-3">
        <DetailField label="Diterbitkan oleh" value={warning.issuedBy} />
        <DetailField label="Tanggal terbit" value={warning.issuedAt} icon={<Calendar className="w-3 h-3" />} />
        <DetailField label="Kedaluwarsa" value={warning.expiresAt} icon={<Calendar className="w-3 h-3" />} />
        <DetailField label="ID Peringatan" value={warning.id.toUpperCase()} />
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between gap-3 pt-1 border-t border-black/[0.06]">
        <p className="text-[11px] text-navy/50">
          {canManage
            ? 'Sebagai HR Admin, Anda dapat mengubah status peringatan.'
            : warning.status === 'aktif'
              ? 'Akui peringatan ini sebagai tanda Anda telah membacanya.'
              : 'Detail hanya-baca berdasarkan role Anda.'}
        </p>
        <div className="flex gap-2">
          {!canManage && warning.status === 'aktif' && (
            <button
              onClick={() => onStatusChange('diakui')}
              className="btn-secondary text-sm"
            >
              Akui peringatan
            </button>
          )}
          {canManage && warning.status === 'aktif' && (
            <button
              onClick={() => onStatusChange('diakui')}
              className="btn-secondary text-sm"
            >
              Tandai Diakui
            </button>
          )}
          {canManage && warning.status !== 'kedaluwarsa' && (
            <button
              onClick={() => onStatusChange('kedaluwarsa')}
              className="text-sm font-semibold text-red-600 hover:underline px-2"
            >
              Kedaluwarsakan
            </button>
          )}
          <button onClick={onClose} className="btn-primary text-sm">Tutup</button>
        </div>
      </div>
    </div>
  )
}

function DetailField({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border px-3 py-2">
      <p className="text-[10px] uppercase tracking-wider text-navy/40">{label}</p>
      <p className="text-sm font-semibold text-navy flex items-center gap-1 mt-0.5">{icon}{value}</p>
    </div>
  )
}
