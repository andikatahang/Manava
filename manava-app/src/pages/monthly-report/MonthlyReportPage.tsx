// Halaman Laporan Bulanan untuk Admin Manager - standalone dengan PDF export
import { useState, useRef } from 'react'
import { FileDown, Printer, Send, AlertCircle, CheckCircle2, Clock, Calendar, AlertTriangle, Receipt, Sparkles } from 'lucide-react'
import { useDraftReport, useReportMutations } from '../../hooks/queries/useReports'
import { Modal } from '../../components/ui/Modal'
import { MonthPicker } from '../../components/ui/MonthPicker'
import { ApiError } from '../../lib/api'
import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

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

function formatPeriodLabel(period: string): string {
  const [y, m] = period.split('-')
  const monthNames = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']
  const monthIdx = Number(m) - 1
  return `${monthNames[monthIdx] ?? m} ${y}`
}

const PROJECT_STATUS: Record<string, string> = {
  completed: 'Selesai',
  in_progress: 'Berjalan',
  in_review: 'Review',
  revision: 'Revisi',
}

export default function MonthlyReportPage() {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [generated, setGenerated] = useState(false)
  const [notes, setNotes] = useState('')
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [exporting, setExporting] = useState(false)
  const reportRef = useRef<HTMLDivElement>(null)

  const draftQuery = useDraftReport(period, generated)
  const { forwardReport } = useReportMutations()

  const draft = generated ? draftQuery.data : undefined
  const isForwarded = draft?.status === 'forwarded'
  const canForward = generated && draft !== undefined && !isForwarded
  const draftModeLabel = isForwarded ? 'Laporan sudah diteruskan ke HR Admin' : 'Draft belum diteruskan ke HR Admin'

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
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : 'Gagal meneruskan laporan'
          setError(msg)
        },
      },
    )
  }

  async function handleExportPDF() {
    if (!reportRef.current || !draft) return

    setExporting(true)
    try {
      // Capture the report content as canvas
      const canvas = await html2canvas(reportRef.current, {
        scale: 2,
        useCORS: true,
        logging: false,
        backgroundColor: '#ffffff',
      })

      // Calculate PDF dimensions (A4 size)
      const imgWidth = 210 // A4 width in mm
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      // Create PDF
      const pdf = new jsPDF('p', 'mm', 'a4')
      const imgData = canvas.toDataURL('image/png')

      let heightLeft = imgHeight
      let position = 0

      // Add first page
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= 297 // A4 height in mm

      // Add additional pages if content is longer than one page
      while (heightLeft > 0) {
        position = heightLeft - imgHeight
        pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
        heightLeft -= 297
      }

      // Save PDF
      pdf.save(`Laporan-Bulanan-${formatPeriodLabel(period)}.pdf`)
    } catch (err) {
      console.error('Error generating PDF:', err)
      setError('Gagal mengekspor PDF. Silakan coba lagi.')
    } finally {
      setExporting(false)
    }
  }

  function handlePrint() {
    window.print()
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#021526] mb-2">Laporan Bulanan Departemen</h1>
        <p className="text-[13px] text-[#596074]">
          Generate dan kelola laporan bulanan departemen Anda dengan bantuan AI, lalu teruskan ke HR Admin
        </p>
      </div>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
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
        {generated && draft && (
          <>
            <button
              onClick={handleExportPDF}
              disabled={exporting}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EDEDED] text-[#021526] text-[13px] font-semibold hover:bg-[#021526]/[0.04] transition-colors disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              {exporting ? 'Mengekspor...' : 'Download PDF'}
            </button>
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-white border border-[#EDEDED] text-[#021526] text-[13px] font-semibold hover:bg-[#021526]/[0.04] transition-colors print:hidden"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
          </>
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
            Draft digenerate AI — belum dikirim ke HR Admin
          </span>
        )}
        {generated && draft && !isForwarded && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 border border-sky-200 text-[12px] font-semibold text-sky-700">
            <Sparkles className="w-3.5 h-3.5" />
            Klik tombol kirim untuk meneruskan laporan ke HR Admin
          </span>
        )}
        {generated && draft && isForwarded && (
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-[12px] font-semibold text-emerald-700">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {draftModeLabel}
          </span>
        )}
      </div>

      {error && (
        <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {!generated && (
        <div className="card p-6">
          <p className="text-[13px] text-navy/60">
            Pilih periode lalu tekan tombol di atas — sistem akan meng-agregasi presensi &amp; cuti
            serta proyek setiap karyawan departemen Anda, dan AI menyusun narasi ringkasannya.
            Setelah review, Anda dapat mengekspor ke PDF atau meneruskan ke HR Admin.
          </p>
        </div>
      )}

      {generated && draftQuery.isLoading && (
        <div className="card p-12 text-center">
          <Sparkles className="w-8 h-8 mx-auto mb-3 animate-pulse text-[#021526]" />
          <p className="text-sm text-navy/60">AI sedang menyusun laporan bulanan…</p>
        </div>
      )}

      {/* Report Content - Print-friendly */}
      {draft && (
        <div ref={reportRef} className="space-y-4 print:space-y-6">
          {/* Print Header (only visible when printing) */}
          <div className="hidden print:block mb-6">
            <h1 className="text-xl font-bold text-[#021526]">Laporan Bulanan Departemen</h1>
            <p className="text-sm text-[#596074] mt-1">
              Periode: {formatPeriodLabel(period)} • Departemen: {draft.department_name}
            </p>
          </div>

          {/* Narasi AI */}
          {draft.ai_narrative && (
            <div className="p-4 rounded-[12px] bg-[#021526] text-white print:border print:border-[#021526] print:bg-white print:text-[#021526]">
              <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[#D0F100] print:text-[#021526]">
                <Sparkles className="w-3.5 h-3.5" /> Ringkasan AI
              </p>
              <p className="mt-2 text-[13px] leading-relaxed text-white/90 print:text-[#021526]">{draft.ai_narrative}</p>
            </div>
          )}

          {/* Agregat departemen */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 print:grid-cols-4">
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

          {/* Rincian per karyawan */}
          <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden overflow-x-auto print:border-[#021526]">
            <div className="px-4 py-3 border-b border-black/[0.05] print:border-[#021526]">
              <p className="text-[12px] font-bold text-[#021526]">
                Presensi, Cuti &amp; Proyek Karyawan ({draft.editor_reports?.length ?? 0})
              </p>
            </div>
            <table className="w-full text-[12.5px] print:text-[11px]">
              <thead>
                <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[#596074] bg-[#021526]/[0.02] print:bg-white print:border-b print:border-[#021526]">
                  <th className="px-4 py-2">Karyawan</th>
                  <th className="px-4 py-2 text-center">Hadir</th>
                  <th className="px-4 py-2 text-center">Terlambat</th>
                  <th className="px-4 py-2 text-center">Alpa</th>
                  <th className="px-4 py-2 text-center">Cuti Disetujui</th>
                  <th className="px-4 py-2">Proyek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] print:divide-[#021526]/20">
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
                            <span key={i} className="block text-[12px] print:text-[10px]">
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
            <div className="p-3 rounded-lg bg-[#021526]/[0.03] border border-black/[0.06] text-[13px] text-navy/80 print:border-[#021526]">
              <span className="font-semibold text-navy">Catatan manajer: </span>{draft.manager_notes}
            </div>
          )}

          {canForward && (
            <div className="print:hidden">
              <button
                onClick={() => setConfirmOpen(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 transition-colors"
              >
                <Send className="w-4 h-4" />
                Teruskan Laporan ke HR Admin
              </button>
            </div>
          )}
        </div>
      )}

      <Modal open={confirmOpen} onClose={() => setConfirmOpen(false)} title="Teruskan Laporan ke HR Admin">
        <div className="space-y-4">
          <p className="text-[13px] text-navy/70">
            Laporan periode <span className="font-semibold text-navy">{formatPeriodLabel(period)}</span> (termasuk narasi AI
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

      {/* Print styles */}
      <style>{`
        @media print {
          body { background: white; }
          .print\\:hidden { display: none !important; }
          .print\\:block { display: block !important; }
          .print\\:border { border-width: 1px !important; }
          .print\\:border-\\[\\#021526\\] { border-color: #021526 !important; }
          .print\\:bg-white { background-color: white !important; }
          .print\\:text-\\[\\#021526\\] { color: #021526 !important; }
          .print\\:grid-cols-4 { grid-template-columns: repeat(4, minmax(0, 1fr)) !important; }
          .print\\:text-\\[11px\\] { font-size: 11px !important; }
          .print\\:text-\\[10px\\] { font-size: 10px !important; }
          .print\\:space-y-6 > * + * { margin-top: 1.5rem !important; }
          @page { margin: 20mm; }
        }
      `}</style>
    </div>
  )
}

function DraftStat({ icon: Icon, label, value, hint }: {
  icon: typeof Clock; label: string; value: string; hint: string
}) {
  return (
    <div className="p-4 rounded-[12px] bg-[#fbfbfb] border border-black/[0.06] print:border-[#021526]">
      <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-[#596074]">
        <Icon className="w-3.5 h-3.5 print:hidden" />{label}
      </div>
      <p className="mt-2 text-2xl font-bold text-[#021526] print:text-xl">{value}</p>
      <p className="mt-0.5 text-[11.5px] text-[#596074] print:text-[10px]">{hint}</p>
    </div>
  )
}
