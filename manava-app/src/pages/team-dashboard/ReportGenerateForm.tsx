// Laporan Bulanan Departemen (Admin Manager, level taktis).
// Semua laporan dibuat di sini: saat tombol "Generate Laporan dengan AI"
// ditekan, sistem meng-agregasi presensi & cuti serta proyek setiap karyawan
// departemen dan AI menyusun narasi ringkasannya. Manager mereview lalu
// meneruskan ke HR Admin.

import { useState } from 'react'
import { Send, AlertCircle, CheckCircle2, Clock, Calendar, AlertTriangle, Receipt, Sparkles } from 'lucide-react'
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

const PROJECT_STATUS: Record<string, string> = {
  completed: 'Selesai',
  in_progress: 'Berjalan',
  in_review: 'Review',
  revision: 'Revisi',
}

export default function ReportGenerateForm({ onSuccess }: { onSuccess?: () => void }) {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [generated, setGenerated] = useState(false)
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftQuery = useDraftReport(period, generated)
  const { forwardReport } = useReportMutations()

  const draft = generated ? draftQuery.data : undefined
  const isForwarded = draft?.status === 'forwarded'

  function changePeriod(p: string) {
    setPeriod(p)
    setGenerated(false)
  }

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
        <MonthPicker value={period} onChange={changePeriod} />
        {!generated && (
          <button
            onClick={() => setGenerated(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-[#D0F100]" />
            Generate Laporan dengan AI
          </button>
        )}
        {generated && isForwarded && draft?.forwarded_at && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terkirim ke HR Admin • {formatDateId(draft.forwarded_at)}
          </span>
        )}
        {generated && draft && !isForwarded && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-semibold text-amber-700">
            <Sparkles className="w-3.5 h-3.5" />
            Draft digenerate AI — review sebelum diteruskan
          </span>
        )}
      </div>

      {!generated && (
        <p className="text-[13px] text-navy/60">
          Pilih periode lalu tekan tombol di atas — sistem akan meng-agregasi presensi &amp; cuti
          serta proyek setiap karyawan departemen Anda, dan AI menyusun narasi ringkasannya.
        </p>
      )}

      {generated && draftQuery.isLoading && (
        <div className="flex items-center gap-2 text-sm text-navy/60 py-6">
          <Sparkles className="w-4 h-4 animate-pulse text-[#021526]" />
          AI sedang menyusun laporan bulanan…
        </div>
      )}

      {draft && (
        <>
          {/* Narasi AI */}
          {draft.ai_narrative && (
            <div className="p-4 rounded-[12px] bg-[#021526] text-white">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D0F100]">
                <Sparkles className="w-3.5 h-3.5" /> Ringkasan AI
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/90">{draft.ai_narrative}</p>
            </div>
          )}

          {/* Agregat departemen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <DraftStat
              icon={Clock}
              label="Kehadiran"
              value={`${draft.attendance_summary.present_pct}%`}
              hint={`${draft.attendance_summary.present_count} hadir • ${draft.attendance_summary.late_count} terlambat`}
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

          {/* Rincian per karyawan: presensi & cuti + proyek */}
          <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden overflow-x-auto">
            <div className="px-4 py-3 border-b border-black/[0.05]">
              <p className="text-[12px] font-bold text-[#021526]">
                Presensi, Cuti &amp; Proyek Karyawan ({draft.editor_reports?.length ?? 0})
              </p>
            </div>
            <table className="w-full text-[12.5px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#596074] bg-[#021526]/[0.02]">
                  <th className="px-4 py-2">Karyawan</th>
                  <th className="px-4 py-2 text-center">Hadir</th>
                  <th className="px-4 py-2 text-center">Terlambat</th>
                  <th className="px-4 py-2 text-center">Alpa</th>
                  <th className="px-4 py-2 text-center">Cuti Disetujui</th>
                  <th className="px-4 py-2">Proyek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05]">
                {(draft.editor_reports ?? []).map(r => (
                  <tr key={r.user_id}>
                    <td className="px-4 py-2.5 font-semibold text-[#021526] whitespace-nowrap">{r.editor_name}</td>
                    <td className="px-4 py-2.5 text-center text-[#021526]">{r.attendance_summary.present} hari</td>
                    <td className="px-4 py-2.5 text-center text-[#021526]">{r.attendance_summary.late}</td>
                    <td className="px-4 py-2.5 text-center text-[#021526]">{r.attendance_summary.absent}</td>
                    <td className="px-4 py-2.5 text-center text-[#021526]">
                      {r.leave_summary.cuti_approved + r.leave_summary.izin_approved} kali
                    </td>
                    <td className="px-4 py-2.5 text-[#021526]">
                      {r.project_summary.length === 0
                        ? <span className="text-[#596074]">—</span>
                        : r.project_summary.map((p, i) => (
                            <span key={i} className="block text-[12px]">
                              {p.title} <span className="text-[#596074]">({PROJECT_STATUS[p.status] ?? p.status})</span>
                            </span>
                          ))}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {isForwarded && draft.manager_notes && (
            <div className="p-3 rounded-lg bg-[#021526]/[0.03] border border-black/[0.06] text-[13px] text-navy/80">
              <span className="font-semibold text-navy">Catatan manajer: </span>{draft.manager_notes}
            </div>
          )}

          {!isForwarded && (
            <button
              onClick={() => setConfirmOpen(true)}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 transition-colors"
            >
              <Send className="w-4 h-4" />
              Teruskan Laporan ke HR Admin
            </button>
          )}
        </>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Teruskan Laporan ke HR Admin">
        <div className="space-y-4">
          <p className="text-[13px] text-navy/70">
            Laporan periode <span className="font-semibold text-navy">{period}</span> (termasuk narasi AI
            dan rincian presensi, cuti, serta proyek karyawan) akan dibekukan dan diteruskan ke dashboard
            HR Admin sebagai bahan review kinerja dan finalisasi payroll. Tindakan ini tidak dapat diulang
            untuk periode yang sama.
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
