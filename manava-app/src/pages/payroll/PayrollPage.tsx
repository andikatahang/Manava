// Payroll — attendance-driven payslips. HR generates one batch per period
// (base salary minus absence deduction, plus overtime); bonus/reimbursement
// are HR-entered while the slip is still Draft, then it moves
// Draft -> Siap Dibayar -> Dibayar (or Dibatalkan at any point before paid).

import { useState } from 'react'
import {
  Wallet, Sparkles, Clock, UserX, CheckCircle2, Ban, Send, Pencil,
} from 'lucide-react'
import { formatCurrency, formatDate } from '../../lib/utils'
import { STATUS_LABELS, type Payslip, type PayslipStatus } from '../../lib/payroll'
import { usePayslips, usePayrollMutations } from '../../hooks/queries/usePayroll'
import { Modal } from '../../components/ui/Modal'
import { ApiError } from '../../lib/api'

const STATUS_CHIP: Record<PayslipStatus, string> = {
  draft:     'bg-amber-50 text-amber-700 border-amber-200',
  finalized: 'bg-navy-50 text-navy border-navy/15',
  paid:      'bg-emerald-50 text-emerald-700 border-emerald-200',
  voided:    'bg-red-50 text-red-700 border-red-200',
}

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function PayrollPage() {
  const [period, setPeriod] = useState(currentPeriod())
  const { data: slips = [], isLoading, error } = usePayslips({ period })
  const { generate } = usePayrollMutations()
  const [detail, setDetail] = useState<Payslip | null>(null)
  const [genError, setGenError] = useState<string | null>(null)

  const totals = slips.reduce(
    (acc, s) => ({
      net: acc.net + (s.status !== 'voided' ? s.net_salary : 0),
      draft: acc.draft + (s.status === 'draft' ? 1 : 0),
      paid: acc.paid + (s.status === 'paid' ? 1 : 0),
    }),
    { net: 0, draft: 0, paid: 0 },
  )

  function runGenerate() {
    setGenError(null)
    generate.mutate(
      { period },
      { onError: err => setGenError(err instanceof ApiError ? err.message : 'Gagal generate payroll — coba lagi') },
    )
  }

  return (
    <div className="space-y-6">
      {/* Period picker + generate */}
      <div className="card p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-navy-50 flex items-center justify-center shrink-0">
            <Wallet className="w-4 h-4 text-navy" />
          </div>
          <div>
            <p className="text-sm font-semibold text-navy">Payroll</p>
            <p className="text-xs text-navy/50">Slip gaji dihitung otomatis dari presensi bulan berjalan.</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <input
            type="month"
            value={period}
            onChange={e => setPeriod(e.target.value)}
            className="px-3.5 py-2 rounded-xl border border-border bg-white text-sm text-navy focus:outline-none focus:border-navy/40 focus:ring-2 focus:ring-navy/10"
          />
          <button className="btn-primary" disabled={generate.isPending} onClick={runGenerate}>
            <Sparkles className="w-4 h-4" /> {generate.isPending ? 'Memproses…' : 'Generate Payroll'}
          </button>
        </div>
      </div>

      {genError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{genError}</p>
      )}

      {/* Stat strip */}
      <div className="card p-0 divide-y sm:divide-y-0 sm:divide-x divide-border grid sm:grid-cols-3">
        <StatBox icon={Wallet} label="Total Net (periode ini)" value={formatCurrency(totals.net)} tone="navy" />
        <StatBox icon={Clock} label="Draft" value={String(totals.draft)} tone="amber" />
        <StatBox icon={CheckCircle2} label="Sudah Dibayar" value={String(totals.paid)} tone="emerald" />
      </div>

      {/* Payslip table */}
      <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden overflow-x-auto">
        <table className="w-full text-[13px]" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
          <thead className="bg-[#021526]/[0.03]">
            <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">
              <th className="px-5 py-3">Editor</th>
              <th className="px-5 py-3 text-right hidden md:table-cell">Gaji Pokok</th>
              <th className="px-5 py-3 text-right hidden lg:table-cell">Potongan Absen</th>
              <th className="px-5 py-3 text-right hidden lg:table-cell">Lembur</th>
              <th className="px-5 py-3 text-right">Net</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3 text-right">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/[0.05]">
            {slips.map(s => (
              <tr key={s.payslip_id} className="hover:bg-[#021526]/[0.02] transition-colors">
                <td className="px-5 py-3.5">
                  <p className="font-semibold text-navy">{s.editor_name}</p>
                  <p className="text-[11px] text-navy/45">
                    {s.absent_days > 0 && <span className="inline-flex items-center gap-1 mr-2"><UserX className="w-3 h-3" />{s.absent_days} hari bolong</span>}
                    {s.working_days} hari kerja
                  </p>
                </td>
                <td className="px-5 py-3.5 text-right hidden md:table-cell text-navy/70">{formatCurrency(s.base_salary)}</td>
                <td className="px-5 py-3.5 text-right hidden lg:table-cell text-red-600">
                  {s.attendance_deduction > 0 ? `-${formatCurrency(s.attendance_deduction)}` : '—'}
                </td>
                <td className="px-5 py-3.5 text-right hidden lg:table-cell text-emerald-700">
                  {s.overtime_pay > 0 ? `+${formatCurrency(s.overtime_pay)}` : '—'}
                </td>
                <td className="px-5 py-3.5 text-right font-semibold text-navy">{formatCurrency(s.net_salary)}</td>
                <td className="px-5 py-3.5">
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${STATUS_CHIP[s.status]}`}>
                    {STATUS_LABELS[s.status]}
                  </span>
                </td>
                <td className="px-5 py-3.5 text-right">
                  <button
                    type="button"
                    onClick={() => setDetail(s)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-navy bg-navy/5 hover:bg-navy/10 transition-colors"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Detail
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {isLoading && <div className="text-center py-12 text-[13px] text-[#596074]">Memuat payroll…</div>}
        {error && <div className="text-center py-12 text-[13px] text-red-600">Gagal memuat data payroll.</div>}
        {!isLoading && !error && slips.length === 0 && (
          <div className="text-center py-12 text-[13px] text-[#596074]">
            Belum ada slip gaji untuk periode ini — klik Generate Payroll.
          </div>
        )}
      </div>

      <Modal open={!!detail} onClose={() => setDetail(null)} title={detail ? `Slip Gaji — ${detail.editor_name}` : ''} size="md">
        {detail && <PayslipDetail slip={detail} onClose={() => setDetail(null)} />}
      </Modal>
    </div>
  )
}

function PayslipDetail({ slip, onClose }: { slip: Payslip; onClose: () => void }) {
  const { adjust, finalize, pay, voidSlip } = usePayrollMutations()
  const [bonus, setBonus] = useState(String(slip.project_bonus))
  const [reimbursement, setReimbursement] = useState(String(slip.reimbursement_total))
  const [actionError, setActionError] = useState<string | null>(null)
  const busy = adjust.isPending || finalize.isPending || pay.isPending || voidSlip.isPending

  function run(fn: () => void) {
    setActionError(null)
    try {
      fn()
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : 'Aksi gagal — coba lagi')
    }
  }

  function saveAdjustment() {
    adjust.mutate(
      { id: slip.payslip_id, body: { project_bonus: Number(bonus) || 0, reimbursement_total: Number(reimbursement) || 0 } },
      { onError: err => setActionError(err instanceof ApiError ? err.message : 'Gagal menyimpan perubahan') },
    )
  }

  return (
    <div className="space-y-4">
      {actionError && (
        <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{actionError}</p>
      )}

      <div className="rounded-xl border border-border bg-primary-200 p-4 space-y-1.5 text-[13px]">
        <Row label="Periode" value={`${formatDate(slip.period_start)} – ${formatDate(slip.period_end)}`} />
        <Row label="Hari Kerja" value={`${slip.working_days} hari`} />
        <Row label="Hari Bolong" value={`${slip.absent_days} hari`} />
        <Row label="Menit Lembur" value={`${slip.overtime_minutes} menit`} />
      </div>

      <div className="space-y-1.5 text-[13px]">
        <Row label="Gaji Pokok" value={formatCurrency(slip.base_salary)} />
        <Row label="Potongan Absen" value={`-${formatCurrency(slip.attendance_deduction)}`} tone="text-red-600" />
        <Row label="Lembur" value={`+${formatCurrency(slip.overtime_pay)}`} tone="text-emerald-700" />
      </div>

      {slip.status === 'draft' ? (
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Bonus</label>
            <input type="number" min={0} className="input" value={bonus} onChange={e => setBonus(e.target.value)} />
          </div>
          <div>
            <label className="label">Reimbursement</label>
            <input type="number" min={0} className="input" value={reimbursement} onChange={e => setReimbursement(e.target.value)} />
          </div>
          <button className="btn-secondary col-span-2 justify-center" disabled={busy} onClick={saveAdjustment}>
            {adjust.isPending ? 'Menyimpan…' : 'Simpan Bonus/Reimbursement'}
          </button>
        </div>
      ) : (
        <div className="space-y-1.5 text-[13px]">
          <Row label="Bonus" value={formatCurrency(slip.project_bonus)} />
          <Row label="Reimbursement" value={formatCurrency(slip.reimbursement_total)} />
        </div>
      )}

      <div className="border-t border-border pt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-navy">Net Salary</span>
        <span className="text-lg font-bold text-navy">{formatCurrency(slip.net_salary)}</span>
      </div>

      <div className="flex flex-wrap gap-2 pt-1">
        {slip.status === 'draft' && (
          <>
            <button className="btn-primary flex-1 justify-center" disabled={busy} onClick={() => run(() => finalize.mutate(slip.payslip_id))}>
              <Send className="w-4 h-4" /> Finalisasi
            </button>
            <button
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-60 transition-colors"
              disabled={busy}
              onClick={() => run(() => voidSlip.mutate(slip.payslip_id))}
            >
              <Ban className="w-4 h-4" /> Batalkan
            </button>
          </>
        )}
        {slip.status === 'finalized' && (
          <>
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-60 transition-colors"
              disabled={busy}
              onClick={() => run(() => pay.mutate(slip.payslip_id))}
            >
              <CheckCircle2 className="w-4 h-4" /> Tandai Dibayar
            </button>
            <button
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-semibold bg-red-50 text-red-700 border border-red-200 hover:bg-red-100 disabled:opacity-60 transition-colors"
              disabled={busy}
              onClick={() => run(() => voidSlip.mutate(slip.payslip_id))}
            >
              <Ban className="w-4 h-4" /> Batalkan
            </button>
          </>
        )}
        {(slip.status === 'paid' || slip.status === 'voided') && (
          <button className="btn-secondary flex-1 justify-center" onClick={onClose}>Tutup</button>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-navy/55">{label}</span>
      <span className={`font-medium ${tone ?? 'text-navy'}`}>{value}</span>
    </div>
  )
}

function StatBox({
  icon: Icon, label, value, tone,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  tone: 'navy' | 'amber' | 'emerald'
}) {
  const toneText: Record<typeof tone, string> = { navy: 'text-navy', amber: 'text-amber-600', emerald: 'text-emerald-600' }
  const toneBg:   Record<typeof tone, string> = { navy: 'bg-navy/5', amber: 'bg-amber-50',     emerald: 'bg-emerald-50' }
  return (
    <div className="px-5 py-4 flex items-center gap-3">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${toneBg[tone]}`}>
        <Icon className={`w-4 h-4 ${toneText[tone]}`} />
      </div>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold text-navy/45 uppercase tracking-wider">{label}</p>
        <p className={`text-lg font-bold ${toneText[tone]}`}>{value}</p>
      </div>
    </div>
  )
}
