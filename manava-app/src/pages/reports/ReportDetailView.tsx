// Detailed report view - printable layout untuk laporan departemen

import { useState } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import { useReportDetail } from '../../hooks/queries/useReports'

interface ReportDetailViewProps {
  reportId: string
  onBack?: () => void
}

export default function ReportDetailView({ reportId, onBack }: ReportDetailViewProps) {
  const { data: report, isLoading, error } = useReportDetail(reportId)
  const [isPrinting, setIsPrinting] = useState(false)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <p className="text-sm text-navy/50">Memuat laporan…</p>
      </div>
    )
  }

  if (error || !report) {
    return (
      <div className="card text-center py-8">
        <p className="text-sm font-medium text-red-600">Gagal memuat laporan</p>
      </div>
    )
  }

  const handlePrint = () => {
    setIsPrinting(true)
    setTimeout(() => {
      window.print()
      setIsPrinting(false)
    }, 100)
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center gap-2 no-print">
        {onBack && (
          <button
            onClick={onBack}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-navy bg-navy/5 hover:bg-navy/10 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Kembali
          </button>
        )}
        <button
          onClick={handlePrint}
          disabled={isPrinting}
          className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-navy bg-navy/5 hover:bg-navy/10 transition-colors disabled:opacity-50"
        >
          <Printer className="w-4 h-4" /> {isPrinting ? 'Mempersiapkan…' : 'Print'}
        </button>
      </div>

      {/* Report Content - Print Friendly */}
      <div id="report-content" className="bg-white p-8 space-y-8">
        {/* Header */}
        <div className="border-b-2 border-navy pb-6">
          <h1 className="text-2xl font-bold text-navy mb-2">Laporan Departemen</h1>
          <div className="grid grid-cols-2 gap-6 text-sm text-navy/70">
            <div>
              <p className="text-xs font-semibold text-navy/50 uppercase">Departemen</p>
              <p className="text-base font-semibold text-navy mt-1">{report.department_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-navy/50 uppercase">Manajer</p>
              <p className="text-base font-semibold text-navy mt-1">{report.manager_name}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-navy/50 uppercase">Periode</p>
              <p className="text-base font-semibold text-navy mt-1">{formatPeriod(report.period)}</p>
            </div>
            <div>
              <p className="text-xs font-semibold text-navy/50 uppercase">Tanggal Laporan</p>
              <p className="text-base font-semibold text-navy mt-1">{formatDate(report.submitted_at)}</p>
            </div>
          </div>
        </div>

        {/* Section 1: Attendance */}
        <Section title="Kehadiran Departemen">
          <div className="grid grid-cols-4 gap-4">
            <Stat label="Hari Kerja" value={report.attendance_summary.total_days} />
            <Stat label="Hadir" value={`${report.attendance_summary.present_pct}%`} />
            <Stat label="Terlambat" value={`${report.attendance_summary.late_pct}%`} />
            <Stat label="Bolong" value={`${report.attendance_summary.absent_pct}%`} />
          </div>
          {report.attendance_summary.top_editors.length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-semibold text-navy/50 uppercase mb-2">Top 3 Kehadiran Terbaik</p>
              <div className="space-y-1">
                {report.attendance_summary.top_editors.map((e: any, i: number) => (
                  <div key={i} className="flex justify-between text-sm">
                    <span>{e.name}</span>
                    <span className="font-medium text-navy">{e.present_count} hari</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Section>

        {/* Section 2: KPI */}
        <Section title="Kinerja Tim (KPI)">
          <div className="grid grid-cols-4 gap-4">
            <Stat label="KPI Rata-rata" value={report.kpi_summary.avg_kpi.toFixed(2)} />
            <Stat label="Sangat Baik" value={report.kpi_summary.excellent_count} />
            <Stat label="Baik" value={report.kpi_summary.good_count} />
            <Stat label="Perlu Peningkatan" value={report.kpi_summary.needs_count} />
          </div>
        </Section>

        {/* Section 3: Leave */}
        <Section title="Cuti & Izin">
          <div className="grid grid-cols-3 gap-4">
            <Stat label="Disetujui" value={report.leave_summary.approved_count} />
            <Stat label="Ditolak" value={report.leave_summary.rejected_count} />
            <Stat label="Menunggu" value={report.leave_summary.pending_count} />
          </div>
          <div className="mt-4 text-sm text-navy/70">
            <p><span className="font-medium">Cuti:</span> {report.leave_summary.cuti_approved} hari</p>
            <p><span className="font-medium">Izin:</span> {report.leave_summary.izin_approved} hari</p>
          </div>
        </Section>

        {/* Section 4: Warnings */}
        <Section title="Peringatan Kerja">
          <div className="grid grid-cols-4 gap-4">
            <Stat label="Total" value={report.warning_summary.total_count} />
            <Stat label="Ringan" value={report.warning_summary.ringan_count} />
            <Stat label="Sedang" value={report.warning_summary.sedang_count} />
            <Stat label="Berat" value={report.warning_summary.berat_count} />
          </div>
        </Section>

        {/* Section 5: Manager Notes */}
        {report.manager_notes && (
          <Section title="Catatan Manajer">
            <div className="p-4 bg-navy/5 border border-navy/10 rounded-lg text-sm text-navy/80 whitespace-pre-wrap">
              {report.manager_notes}
            </div>
          </Section>
        )}

        {/* Footer */}
        <div className="border-t-2 border-navy pt-6 text-xs text-navy/50 text-center">
          <p>Laporan otomatis sistem Manava ERP</p>
          <p>Untuk pertanyaan, hubungi departemen HR</p>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          body { background: white; }
          .no-print { display: none !important; }
          #report-content { box-shadow: none; border: none; }
          @page { margin: 1cm; }
        }
      `}</style>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-lg font-bold text-navy mb-4 pb-2 border-b border-navy/20">{title}</h2>
      {children}
    </div>
  )
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 bg-navy/5 border border-navy/10 rounded-lg">
      <p className="text-xs font-semibold text-navy/50 uppercase">{label}</p>
      <p className="text-xl font-bold text-navy mt-1">{value}</p>
    </div>
  )
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${monthNames[Number(m) - 1]} ${y}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
}
