// Detailed report view - formal letterhead layout, print/PDF friendly

import { useState } from 'react'
import { Printer, ArrowLeft } from 'lucide-react'
import { useReportDetail } from '../../hooks/queries/useReports'
import logoDark from '../../assets/logo-dark.png'

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

  const docRef = `MNV/DR/${report.period.replace('-', '')}/${report.id.slice(-6).toUpperCase()}`

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
          <Printer className="w-4 h-4" /> {isPrinting ? 'Mempersiapkan…' : 'Print / Simpan PDF'}
        </button>
      </div>

      {/* Report Content — formal letterhead document */}
      <div id="report-content" className="report-doc bg-white mx-auto max-w-[820px] shadow-card sm:p-10 p-6 print:shadow-none print:p-0">
        {/* Letterhead */}
        <div className="flex items-start justify-between pb-5 border-b-[3px] border-navy">
          <div className="flex items-center gap-3">
            <img src={logoDark} alt="Manava" className="h-8 w-auto object-contain" />
            <div className="leading-tight">
              <p className="text-[13px] font-bold text-navy tracking-tight">Manava ERP</p>
              <p className="text-[10px] text-navy/50">Human Resource &amp; Operations Report</p>
            </div>
          </div>
          <div className="text-right leading-tight">
            <p className="text-[10px] uppercase tracking-[0.12em] text-navy/40">No. Dokumen</p>
            <p className="text-[11px] font-semibold text-navy tabular-nums">{docRef}</p>
          </div>
        </div>

        {/* Title block */}
        <div className="pt-6 pb-5">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.16em] text-navy/40 mb-1.5">
            Laporan Departemen Bulanan
          </p>
          <h1 className="text-[26px] font-bold text-navy leading-tight">{report.department_name}</h1>
          <p className="text-sm text-navy/50 mt-1">Periode {formatPeriod(report.period)}</p>
        </div>

        {/* Meta info table */}
        <table className="w-full text-sm mb-8 border-collapse">
          <tbody>
            <MetaRow label="Departemen" value={report.department_name} />
            <MetaRow label="Manajer Departemen" value={report.manager_name} />
            <MetaRow label="Periode Laporan" value={formatPeriod(report.period)} />
            <MetaRow label="Status" value={report.status === 'forwarded' ? 'Diteruskan ke HR Admin' : 'Draft'} />
            {report.reimbursement_summary && (
              <MetaRow
                label="Klaim Dana Disetujui"
                value={`Rp${report.reimbursement_summary.approved_total.toLocaleString('id-ID')} (${report.reimbursement_summary.approved_count} klaim)`}
              />
            )}
            <MetaRow label="Tanggal Diteruskan" value={formatDate(report.forwarded_at ?? report.submitted_at)} last />
          </tbody>
        </table>

        {/* Section 1: Attendance */}
        <Section index="01" title="Kehadiran Departemen">
          <MetricTable
            rows={[
              ['Total Hari Kerja Tercatat', String(report.attendance_summary.total_days)],
              ['Tingkat Kehadiran (Hadir)', `${report.attendance_summary.present_pct}%`],
              ['Keterlambatan', `${report.attendance_summary.late_pct}%`],
              ['Tanpa Keterangan (Bolong)', `${report.attendance_summary.absent_pct}%`],
              ['Cuti/Izin', `${report.attendance_summary.leave_pct}%`],
            ]}
          />
          {report.attendance_summary.top_editors.length > 0 && (
            <div className="mt-4">
              <p className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-navy/40 mb-2">
                Peringkat Kehadiran Terbaik
              </p>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-navy/15">
                    <th className="text-left font-semibold text-navy/60 py-1.5 w-10">#</th>
                    <th className="text-left font-semibold text-navy/60 py-1.5">Nama Editor</th>
                    <th className="text-right font-semibold text-navy/60 py-1.5">Hari Hadir</th>
                  </tr>
                </thead>
                <tbody>
                  {report.attendance_summary.top_editors.map((e, i) => (
                    <tr key={i} className="border-b border-navy/[0.06]">
                      <td className="py-1.5 text-navy/50 tabular-nums">{i + 1}</td>
                      <td className="py-1.5 text-navy">{e.name}</td>
                      <td className="py-1.5 text-right font-semibold text-navy tabular-nums">{e.present_count} hari</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Section 2: KPI */}
        <Section index="02" title="Kinerja Tim (KPI)">
          <MetricTable
            rows={[
              ['Skor KPI Rata-rata Departemen', report.kpi_summary.avg_kpi.toFixed(2)],
              ['Editor Kategori Sangat Baik', String(report.kpi_summary.excellent_count)],
              ['Editor Kategori Baik', String(report.kpi_summary.good_count)],
              ['Editor Perlu Peningkatan', String(report.kpi_summary.needs_count)],
            ]}
          />
        </Section>

        {/* Section 3: Leave */}
        <Section index="03" title="Cuti & Izin">
          <MetricTable
            rows={[
              ['Pengajuan Disetujui', String(report.leave_summary.approved_count)],
              ['Pengajuan Ditolak', String(report.leave_summary.rejected_count)],
              ['Menunggu Persetujuan', String(report.leave_summary.pending_count)],
              ['Total Hari Cuti Disetujui', `${report.leave_summary.cuti_approved} hari`],
              ['Total Hari Izin Disetujui', `${report.leave_summary.izin_approved} hari`],
            ]}
          />
        </Section>

        {/* Section 4: Warnings */}
        <Section index="04" title="Peringatan Kerja" isLast={false}>
          <MetricTable
            rows={[
              ['Total Peringatan Diterbitkan', String(report.warning_summary.total_count)],
              ['Kategori Ringan', String(report.warning_summary.ringan_count)],
              ['Kategori Sedang', String(report.warning_summary.sedang_count)],
              ['Kategori Berat', String(report.warning_summary.berat_count)],
            ]}
          />
        </Section>

        {/* Section 5: Rincian presensi, cuti & proyek per karyawan */}
        <Section index="05" title="Presensi, Cuti & Proyek Karyawan" isLast={false}>
          {(report.editor_reports?.length ?? 0) === 0 ? (
            <p className="text-sm text-navy/50">Tidak ada data karyawan pada periode ini.</p>
          ) : (
            <table className="w-full text-[12.5px] border-collapse">
              <thead>
                <tr className="border-y border-black/[0.08] text-left text-navy/50">
                  <th className="py-2 pr-2 font-semibold">Karyawan</th>
                  <th className="py-2 px-2 font-semibold text-center">Hadir</th>
                  <th className="py-2 px-2 font-semibold text-center">Terlambat</th>
                  <th className="py-2 px-2 font-semibold text-center">Alpa</th>
                  <th className="py-2 px-2 font-semibold text-center">Cuti Disetujui</th>
                  <th className="py-2 pl-2 font-semibold">Proyek</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-black/[0.05] text-navy">
                {(report.editor_reports ?? []).map(r => (
                  <tr key={r.user_id}>
                    <td className="py-2 pr-2 font-semibold">{r.editor_name}</td>
                    <td className="py-2 px-2 text-center">{r.attendance_summary.present} hari</td>
                    <td className="py-2 px-2 text-center">{r.attendance_summary.late}</td>
                    <td className="py-2 px-2 text-center">{r.attendance_summary.absent}</td>
                    <td className="py-2 px-2 text-center">{r.leave_summary.cuti_approved + r.leave_summary.izin_approved}</td>
                    <td className="py-2 pl-2">
                      {r.project_summary.length === 0
                        ? '—'
                        : r.project_summary.map(p => p.title).join(', ')}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Section>

        {/* Section 6: Narasi AI */}
        {report.ai_narrative && (
          <Section index="06" title="Ringkasan Naratif (AI)" isLast={!report.manager_notes}>
            <div className="border-l-[3px] border-navy/20 pl-4 py-1 text-sm text-navy/80 leading-relaxed">
              {report.ai_narrative}
            </div>
          </Section>
        )}

        {/* Section 7: Manager Notes */}
        {report.manager_notes && (
          <Section index="07" title="Catatan Manajer" isLast>
            <div className="border-l-[3px] border-navy/20 pl-4 py-1 text-sm text-navy/80 leading-relaxed whitespace-pre-wrap italic">
              {report.manager_notes}
            </div>
          </Section>
        )}

        {/* Signature block */}
        <div className="grid grid-cols-2 gap-8 mt-12 pt-8 print:break-inside-avoid">
          <div>
            <p className="text-xs text-navy/50 mb-16">Diketahui oleh,</p>
            <p className="text-sm font-semibold text-navy border-t border-navy/30 pt-2 inline-block min-w-[180px]">
              {report.manager_name}
            </p>
            <p className="text-[11px] text-navy/50">Manajer Departemen</p>
          </div>
          <div>
            <p className="text-xs text-navy/50 mb-16">Diterima oleh,</p>
            <p className="text-sm font-semibold text-navy border-t border-navy/30 pt-2 inline-block min-w-[180px]">
              HR Admin
            </p>
            <p className="text-[11px] text-navy/50">Human Resources</p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-navy/15 mt-10 pt-4 flex items-center justify-between text-[10px] text-navy/40">
          <span>Dihasilkan otomatis oleh sistem Manava ERP — metrik dihitung dari data operasional real-time.</span>
          <span className="tabular-nums shrink-0 ml-4">{docRef}</span>
        </div>
      </div>

      {/* Print Styles */}
      <style>{`
        @media print {
          @page { size: A4; margin: 16mm 14mm; }
          body { background: white; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
          .no-print { display: none !important; }
          .report-doc { box-shadow: none !important; max-width: none !important; }
        }
      `}</style>
    </div>
  )
}

function MetaRow({ label, value, last }: { label: string; value: string; last?: boolean }) {
  return (
    <tr className={last ? '' : 'border-b border-navy/[0.06]'}>
      <td className="py-1.5 pr-4 text-navy/45 font-medium w-[38%] align-top">{label}</td>
      <td className="py-1.5 text-navy font-semibold">{value}</td>
    </tr>
  )
}

function Section({
  index, title, children, isLast,
}: {
  index: string
  title: string
  children: React.ReactNode
  isLast?: boolean
}) {
  return (
    <div className={`print:break-inside-avoid ${isLast ? '' : 'mb-7'}`}>
      <div className="flex items-baseline gap-2.5 mb-3 pb-1.5 border-b-2 border-navy">
        <span className="text-[11px] font-bold text-navy/30 tabular-nums">{index}</span>
        <h2 className="text-[15px] font-bold text-navy tracking-tight">{title}</h2>
      </div>
      {children}
    </div>
  )
}

function MetricTable({ rows }: { rows: [string, string][] }) {
  return (
    <table className="w-full text-sm border-collapse">
      <tbody>
        {rows.map(([label, value], i) => (
          <tr key={label} className={i === rows.length - 1 ? '' : 'border-b border-navy/[0.06]'}>
            <td className="py-1.5 text-navy/60">{label}</td>
            <td className="py-1.5 text-right font-semibold text-navy tabular-nums">{value}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function formatPeriod(period: string): string {
  const [y, m] = period.split('-')
  const monthNames = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
  ]
  return `${monthNames[Number(m) - 1] ?? m} ${y}`
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr)
  return d.toLocaleDateString('id-ID', { year: 'numeric', month: 'long', day: 'numeric' })
}
