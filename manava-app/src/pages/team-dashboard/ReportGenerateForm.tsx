// Draft Laporan Bulanan Departemen (Admin Manager, level taktis).
// Sistem meng-agregasi data harian editor secara otomatis; manager hanya
// mereview draft lalu meneruskannya ke HR Admin — tidak ada input manual.

import { useState } from 'react'
import { Send, AlertCircle, CheckCircle2, Clock, TrendingUp, Calendar, AlertTriangle, Receipt } from 'lucide-react'
import { useDraftReport, useReportMutations } from '../../hooks/queries/useReports'
import { Modal } from '../../components/ui/Modal'
import { MonthPicker } from '../../components/ui/MonthPicker'
import { ApiError } from '../../lib/api'

function getCurrentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatRupiah(n: number): string {
  return `Rp${n.toLocaleString('id-ID')}`
}

function formatDateId(iso: string): string {
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
}

export default function ReportGenerateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftQuery = useDraftReport(period)
  const { forwardReport } = useReportMutations()

  const draft = draftQuery.data
  const isForwarded = draft?.status === 'forwarded'

  function handleForward() {
    setError(null)
    forwardReport.mutate(
      { period, manager_notes: notes || undefined },
      {
        onSuccess: () => {
          setNotes('')
          setConfirmOpen(false)
          draftQuery.refetch()
          onSuccess?.()
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : 'Gagal meneruskan laporan'
          setError(msg)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <MonthPicker value={period} onChange={setPeriod} />
        {isForwarded && draft?.forwarded_at && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terkirim ke HR Admin • {formatDateId(draft.forwarded_at)}
          </span>
        )}
        {!isForwarded && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-semibold text-amber-700">
            Draft — agregasi otomatis oleh sistem
          </span>
        )}
      </div>

      {draftQuery.isLoading && (
        <p className="text-sm text-navy/50 py-4">Menghitung agregasi bulanan…</p>
      )}

      {draft && (
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          <DraftStat
            icon={Clock}
            label="Kehadiran"
            value={`${draft.attendance_summary.present_pct}%`}
            hint={`${draft.attendance_summary.present_count} hadir • ${draft.attendance_summary.late_count} terlambat`}
          />
          <DraftStat
            icon={TrendingUp}
            label="Rata-rata KPI (Kepuasan Klien)"
            value={draft.kpi_summary.avg_kpi.toFixed(2)}
            hint={`${draft.kpi_summary.excellent_count} excellent • ${draft.kpi_summary.needs_count} perlu perbaikan`}
          />
          <DraftStat
            icon={Calendar}
            label="Cuti Disetujui"
            value={String(draft.leave_summary.approved_count)}
            hint={`${draft.leave_summary.pending_count} menunggu keputusan`}
          />
          <DraftStat
            icon={AlertTriangle}
            label="Peringatan"
            value={String(draft.warning_summary.total_count)}
            hint={`${draft.warning_summary.berat_count} kategori berat`}
          />
          <DraftStat
            icon={Receipt}
            label="Klaim Dana Disetujui"
            value={formatRupiah(draft.reimbursement_summary?.approved_total ?? 0)}
            hint={`${draft.reimbursement_summary?.approved_count ?? 0} klaim • ${draft.reimbursement_summary?.pending_count ?? 0} menunggu`}
          />
        </div>
      )}

      {isForwarded && draft?.manager_notes && (
        <div className="p-3 rounded-lg bg-[#021526]/[0.03] border border-black/[0.06] text-[13px] text-navy/80">
          <span className="font-semibold text-navy">Catatan manajer: </span>{draft.manager_notes}
        </div>
      )}

      {!isForwarded && !draftQuery.isLoading && (
        <button
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 transition-colors"
        >
          <Send className="w-4 h-4" />
          Teruskan Laporan ke HR Admin
        </button>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Teruskan Laporan ke HR Admin">
        <div className="space-y-4">
          <p className="text-[13px] text-navy/70">
            Snapshot metrik periode <span className="font-semibold text-navy">{period}</span> akan
            dibekukan dan diteruskan ke dashboard HR Admin sebagai bahan review kinerja dan
            finalisasi payroll. Tindakan ini tidak dapat diulang untuk periode yang sama.
          </p>
          <div>
            <label className="block text-[12px] font-semibold text-navy mb-1.5">
              Catatan manajer (opsional)
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Sorotan atau konteks untuk HR Admin…"
              className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] text-navy focus:outline-none focus:ring-2 focus:ring-[#D0F100]"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-navy/70 hover:bg-navy/5 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleForward}
              disabled={forwardReport.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {forwardReport.isPending ? 'Meneruskan…' : 'Ya, Teruskan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}

function DraftStat({ icon: Icon, label, value, hint }: {
  icon: typeof Clock; label: string; value: string; hint: string
}) {
  return (
    <div className="p-4 rounded-[12px] bg-[#fbfbfb] border border-black/[0.06]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#596074]">
        <Icon className="w-3.5 h-3.5" />{label}
      </div>
      <p className="mt-2 text-2xl font-bold text-[#021526]">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-[#596074]">{hint}</p>
    </div>
  )
}
