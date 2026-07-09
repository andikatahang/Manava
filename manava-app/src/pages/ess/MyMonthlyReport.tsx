// Summary Bulanan Karyawan — editor (level operasional) me-review laporan
// bulanan individualnya (agregasi otomatis: KPI, presensi, cuti, proyek)
// lalu mengirimkannya ke Admin Manager departemennya. Gaya dokumen formal
// mengikuti referensi laporan perusahaan.

import { useState } from 'react'
import { Send, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { MonthPicker } from '../../components/ui/MonthPicker'
import { useMyReportDraft, useReportMutations } from '../../hooks/queries/useReports'
import { ApiError } from '../../lib/api'

function currentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-')
  const months = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  return `${months[Number(m) - 1] ?? m} ${y}`
}

const PROJECT_STATUS: Record<string, { label: string; cls: string }> = {
  completed: { label: 'Selesai (100%)', cls: 'text-emerald-700' },
  in_progress: { label: 'In Progress', cls: 'text-amber-700' },
  in_review: { label: 'Dalam Review', cls: 'text-blue-700' },
  revision: { label: 'Revisi', cls: 'text-amber-700' },
}

export function MyMonthlyReport() {
  const [period, setPeriod] = useState(currentPeriod())
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const draftQuery = useMyReportDraft(period)
  const { submitMyReport } = useReportMutations()

  const report = draftQuery.data
  const isSent = report?.status === 'submitted' || report?.status === 'consolidated'

  function handleSubmit() {
    setError(null)
    submitMyReport.mutate(
      { period, editor_notes: notes || undefined },
      {
        onSuccess: () => {
          setConfirmOpen(false)
          setNotes('')
          draftQuery.refetch()
        },
        onError: err => setError(err instanceof ApiError ? err.message : 'Gagal mengirim laporan'),
      },
    )
  }

  return (
    <div className="space-y-4 max-w-3xl">
      <div className="flex flex-wrap items-center gap-3">
        <MonthPicker value={period} onChange={setPeriod} />
        {isSent ? (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Terkirim ke Admin Manager{report?.submitted_at ? ` • ${new Date(report.submitted_at).toLocaleDateString('id-ID')}` : ''}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 border border-amber-200 text-[12px] font-semibold text-amber-700">
            Draft — agregasi otomatis oleh sistem
          </span>
        )}
      </div>

      {draftQuery.isLoading && <p className="text-sm text-navy/50 py-4">Menyusun laporan bulanan…</p>}

      {report && (
        <div className="rounded-[12px] border border-black/[0.08] bg-white shadow-sm overflow-hidden">
          {/* Kop laporan */}
          <div className="px-8 pt-8 pb-5 border-b-2 border-[#021526]">
            <h2 className="text-[22px] font-bold text-[#021526]">Manava ERP</h2>
            <p className="text-[12.5px] text-[#596074] mt-0.5">
              Summary Bulanan Karyawan • Periode {formatPeriod(report.period)}
            </p>
          </div>

          <div className="px-8 py-5 space-y-6">
            {/* Identitas */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[13px] pb-4 border-b border-black/[0.06]">
              <p><span className="text-[#596074]">Nama</span> : <span className="font-semibold text-[#021526]">{report.editor_name}</span></p>
              <p><span className="text-[#596074]">Divisi / Jabatan</span> : <span className="font-semibold text-[#021526]">{report.department} / Editor</span></p>
            </div>

            {/* Performa bulanan (KPI) */}
            <section>
              <h3 className="bg-[#021526]/[0.04] px-3 py-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#021526] rounded">
                Performa Bulanan (KPI)
              </h3>
              <p className="text-[13px] mt-3 mb-2">
                <span className="font-semibold">Skor Akhir KPI:</span>{' '}
                <span className="font-bold text-[#021526]">{report.kpi_summary.kpi_average.toFixed(1)} / 5.0</span>
              </p>
              <table className="w-full text-[12.5px] border-collapse">
                <thead>
                  <tr className="border-y border-black/[0.08] text-left text-[#596074]">
                    <th className="py-2 pr-2 font-semibold">Aspek Penilaian</th>
                    <th className="py-2 px-2 font-semibold text-center">Target</th>
                    <th className="py-2 px-2 font-semibold text-center">Aktual</th>
                    <th className="py-2 pl-2 font-semibold text-center">Skor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/[0.05] text-[#021526]">
                  <tr>
                    <td className="py-2 pr-2">Rating Kepuasan Klien</td>
                    <td className="py-2 px-2 text-center">≥ 4.5</td>
                    <td className="py-2 px-2 text-center">{report.kpi_summary.avg_client_rating.toFixed(1)}</td>
                    <td className="py-2 pl-2 text-center font-bold">{report.kpi_summary.avg_client_rating.toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2">Ketepatan Penyelesaian Proyek</td>
                    <td className="py-2 px-2 text-center">≥ 90%</td>
                    <td className="py-2 px-2 text-center">{report.kpi_summary.completion_rate}%</td>
                    <td className="py-2 pl-2 text-center font-bold">{(report.kpi_summary.completion_rate / 20).toFixed(1)}</td>
                  </tr>
                  <tr>
                    <td className="py-2 pr-2">Penilaian Manajer</td>
                    <td className="py-2 px-2 text-center">≥ 4.0</td>
                    <td className="py-2 px-2 text-center">{report.kpi_summary.manager_rating.toFixed(1)}</td>
                    <td className="py-2 pl-2 text-center font-bold">{report.kpi_summary.manager_rating.toFixed(1)}</td>
                  </tr>
                </tbody>
              </table>
              {report.editor_notes && (
                <p className="text-[11.5px] italic text-[#596074] mt-2">* Catatan: {report.editor_notes}</p>
              )}
            </section>

            {/* Presensi & cuti */}
            <section>
              <h3 className="bg-[#021526]/[0.04] px-3 py-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#021526] rounded">
                Presensi &amp; Cuti
              </h3>
              <table className="w-full text-[12.5px] border-collapse mt-3">
                <thead>
                  <tr className="border-y border-black/[0.08] text-[#596074]">
                    {['Total Hari Kerja', 'Hadir', 'Terlambat', 'Cuti/Izin', 'Alpa', 'Cuti Disetujui'].map(h => (
                      <th key={h} className="py-2 px-2 font-semibold text-center">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr className="text-center text-[#021526] font-medium">
                    <td className="py-2.5 px-2">{report.attendance_summary.total_days}</td>
                    <td className="py-2.5 px-2">{report.attendance_summary.present}</td>
                    <td className="py-2.5 px-2">{report.attendance_summary.late}</td>
                    <td className="py-2.5 px-2">{report.attendance_summary.leave}</td>
                    <td className="py-2.5 px-2">{report.attendance_summary.absent}</td>
                    <td className="py-2.5 px-2 font-bold text-blue-700">
                      {report.leave_summary.cuti_approved + report.leave_summary.izin_approved} kali
                    </td>
                  </tr>
                </tbody>
              </table>
            </section>

            {/* Rekap proyek */}
            <section>
              <h3 className="bg-[#021526]/[0.04] px-3 py-2 text-[11.5px] font-bold uppercase tracking-[0.1em] text-[#021526] rounded">
                Rekap Proyek
              </h3>
              {report.project_summary.length === 0 ? (
                <p className="text-[12.5px] text-[#596074] mt-3">Tidak ada proyek aktif pada periode ini.</p>
              ) : (
                <ul className="mt-3 space-y-1.5">
                  {report.project_summary.map((p, i) => {
                    const s = PROJECT_STATUS[p.status] ?? { label: p.status, cls: 'text-[#596074]' }
                    return (
                      <li key={i} className="text-[13px] text-[#021526]">
                        <span className="font-semibold">{p.title}</span>
                        {' — '}
                        <span className={`font-semibold ${s.cls}`}>{s.label}</span>
                      </li>
                    )
                  })}
                </ul>
              )}
            </section>

            {/* Tanda tangan */}
            <div className="grid grid-cols-2 gap-8 pt-6 pb-2 text-center text-[12.5px] text-[#021526]">
              <div>
                <p>Karyawan</p>
                <p className="mt-12 text-[#596074]">( {report.editor_name} )</p>
              </div>
              <div>
                <p>Admin Manager / HR</p>
                <p className="mt-12 text-[#596074]">( ______________________ )</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isSent && report && (
        <button
          onClick={() => setConfirmOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 transition-colors"
        >
          <Send className="w-4 h-4" />
          Kirim ke Admin Manager
        </button>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Kirim Laporan ke Admin Manager">
        <div className="space-y-4">
          <p className="text-[13px] text-navy/70">
            Laporan bulanan periode <span className="font-semibold text-navy">{formatPeriod(period)}</span> akan
            dibekukan dan dikirim ke Admin Manager departemen Anda untuk dikonsolidasikan
            menjadi laporan departemen. Tindakan ini tidak dapat diulang untuk periode yang sama.
          </p>
          <div>
            <label className="block text-[12px] font-semibold text-navy mb-1.5">Catatan (opsional)</label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              placeholder="Sorotan pencapaian atau kendala bulan ini…"
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
              onClick={handleSubmit}
              disabled={submitMyReport.isPending}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 disabled:opacity-50 transition-colors"
            >
              <Send className="w-3.5 h-3.5" />
              {submitMyReport.isPending ? 'Mengirim…' : 'Ya, Kirim'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
