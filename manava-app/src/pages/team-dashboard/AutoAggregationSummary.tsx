// Auto-Aggregation Summary for Admin Manager (Tactical Level)
// Shows auto-calculated metrics from the database for decision-making

import { useMemo } from 'react'
import { TrendingUp, Users, Clock, AlertTriangle, Award, FileText, Calendar } from 'lucide-react'
import { useMe } from '../../hooks/queries/useMe'
import { useDepartments } from '../../hooks/queries/useDepartments'
import { useTeamAttendance } from '../../hooks/queries/useAttendance'
import { useEditorMonthlyKpi } from '../../hooks/queries/useKpi'
import { useLeaveRequests } from '../../hooks/queries/useLeaveRequests'
import { useWarnings, type Warning } from '../../hooks/queries/useWarnings'
import type { Editor, LeaveRequest } from '../../types'

interface AggregatedMetrics {
  totalEditors: number
  attendanceSummary: {
    present: number
    late: number
    absent: number
    leave: number
  }
  kpiSummary: {
    average: number
    excellent: number
    good: number
    needsImprovement: number
  }
  leaveSummary: {
    approved: number
    pending: number
    rejected: number
  }
  warningSummary: {
    total: number
    unacknowledged: number
  }
}

function getCurrentMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

function getMonthName(period: string): string {
  const [year, month] = period.split('-')
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']
  return `${monthNames[parseInt(month) - 1]} ${year}`
}

export function AutoAggregationSummary() {
  const meQuery = useMe()
  const departmentsQuery = useDepartments()
  const teamQuery = useTeamAttendance()
  const kpiQuery = useEditorMonthlyKpi()
  const leaveQuery = useLeaveRequests()
  const warningsQuery = useWarnings()

  const me = meQuery.data
  const currentPeriod = getCurrentMonth()

  // Filter to manager's department(s)
  const myDepartments = useMemo(
    () => (departmentsQuery.data ?? []).filter(d => d.manager.user_id === me?.user_id),
    [departmentsQuery.data, me],
  )

  const myEditors = useMemo(() => {
    const editors: Editor[] = []
    myDepartments.forEach(dept => {
      dept.editors.forEach(e => {
        if (e.status === 'active') editors.push(e)
      })
    })
    return editors
  }, [myDepartments])

  const editorIds = useMemo(() => myEditors.map(e => e.editor_id), [myEditors])

  // Auto-aggregate metrics from database
  const metrics = useMemo<AggregatedMetrics>(() => {
    const teamAttendance = teamQuery.data ?? []
    const kpiData = kpiQuery.data ?? []
    const leaveData = leaveQuery.data ?? []
    const warningsData = warningsQuery.data ?? []

    // Attendance aggregation
    const attendanceSummary = {
      present: teamAttendance.filter(m => m.today?.status === 'present').length,
      late: teamAttendance.filter(m => m.today?.status === 'late').length,
      absent: teamAttendance.filter(m => !m.today?.clock_in).length,
      leave: teamAttendance.filter(m => m.today?.status === 'leave').length,
    }

    // KPI aggregation (current month only)
    const currentMonthKpi = kpiData.filter(k => k.period === currentPeriod && editorIds.includes(k.editor_id))
    const avgKpi = currentMonthKpi.length > 0
      ? currentMonthKpi.reduce((sum, k) => sum + k.kpi_average, 0) / currentMonthKpi.length
      : 0

    // Performance band distribution
    const kpiSummary = {
      average: avgKpi,
      excellent: myEditors.filter(e => e.performance_band === 'excellent').length,
      good: myEditors.filter(e => e.performance_band === 'good').length,
      needsImprovement: myEditors.filter(e => e.performance_band === 'needs_improvement').length,
    }

    // Leave aggregation (current month)
    const currentMonthLeave = leaveData.filter((l: LeaveRequest) => {
      const startDate = new Date(l.start_date)
      return startDate.getFullYear() === parseInt(currentPeriod.split('-')[0])
        && startDate.getMonth() + 1 === parseInt(currentPeriod.split('-')[1])
        && editorIds.includes(l.requester_id)
    })

    const leaveSummary = {
      approved: currentMonthLeave.filter((l: LeaveRequest) => l.status === 'approved').length,
      pending: currentMonthLeave.filter((l: LeaveRequest) => l.status === 'pending').length,
      rejected: currentMonthLeave.filter((l: LeaveRequest) => l.status === 'rejected').length,
    }

    // Warning aggregation (current month, editors only)
    const currentMonthWarnings = warningsData.filter((w: Warning) => {
      const issuedDate = new Date(w.issuedAt)
      return issuedDate.getFullYear() === parseInt(currentPeriod.split('-')[0])
        && issuedDate.getMonth() + 1 === parseInt(currentPeriod.split('-')[1])
        && w.targetRole === 'editor'
    })

    const warningSummary = {
      total: currentMonthWarnings.length,
      unacknowledged: currentMonthWarnings.filter((w: Warning) => w.status !== 'diakui').length,
    }

    return {
      totalEditors: myEditors.length,
      attendanceSummary,
      kpiSummary,
      leaveSummary,
      warningSummary,
    }
  }, [teamQuery.data, kpiQuery.data, leaveQuery.data, warningsQuery.data, myEditors, editorIds, currentPeriod])

  const isLoading = meQuery.isLoading || departmentsQuery.isLoading || teamQuery.isLoading

  if (isLoading) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-navy/50">Memuat data agregasi...</p>
      </div>
    )
  }

  if (myDepartments.length === 0) {
    return (
      <div className="card text-center py-10">
        <p className="text-sm text-navy/50">Anda belum ditunjuk sebagai manajer departemen.</p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header with auto-calculation badge */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-navy">Agregasi Otomatis Data Tim</h2>
          <p className="text-sm text-navy/60 mt-1">
            Metrik teragregasi otomatis dari sistem untuk periode{' '}
            <strong className="text-navy">{getMonthName(currentPeriod)}</strong>
          </p>
        </div>
        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-full border border-emerald-200 shrink-0">
          <TrendingUp className="w-3.5 h-3.5" />
          AUTO-KALKULASI
        </span>
      </div>

      {/* Auto-aggregated metrics grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Team Size */}
        <MetricCard
          icon={Users}
          label="Jumlah Anggota Tim"
          value={metrics.totalEditors.toString()}
          subtitle="Editor aktif di departemen Anda"
          color="blue"
        />

        {/* Attendance Today */}
        <MetricCard
          icon={Clock}
          label="Kehadiran Hari Ini"
          value={`${metrics.attendanceSummary.present + metrics.attendanceSummary.late}/${metrics.totalEditors}`}
          subtitle={`Hadir: ${metrics.attendanceSummary.present} · Terlambat: ${metrics.attendanceSummary.late}`}
          color="green"
        />

        {/* Average KPI */}
        <MetricCard
          icon={Award}
          label="Rata-rata KPI Tim"
          value={metrics.kpiSummary.average > 0 ? metrics.kpiSummary.average.toFixed(1) : '—'}
          subtitle={`Excellent: ${metrics.kpiSummary.excellent} · Good: ${metrics.kpiSummary.good} · Needs Improvement: ${metrics.kpiSummary.needsImprovement}`}
          color="purple"
        />

        {/* Leave Requests */}
        <MetricCard
          icon={Calendar}
          label="Permohonan Cuti"
          value={metrics.leaveSummary.approved.toString()}
          subtitle={`Disetujui: ${metrics.leaveSummary.approved} · Pending: ${metrics.leaveSummary.pending} · Ditolak: ${metrics.leaveSummary.rejected}`}
          color="orange"
        />

        {/* Warnings */}
        <MetricCard
          icon={AlertTriangle}
          label="Peringatan Kerja"
          value={metrics.warningSummary.total.toString()}
          subtitle={`Total: ${metrics.warningSummary.total} · Belum diakui: ${metrics.warningSummary.unacknowledged}`}
          color="red"
        />

        {/* Ready to Report */}
        <MetricCard
          icon={FileText}
          label="Status Laporan"
          value="Siap Kirim"
          subtitle="Data sudah dihitung dan siap dikirim ke HR"
          color="navy"
        />
      </div>

      {/* Info box */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-blue-900">Informasi Agregasi Otomatis</p>
            <p className="text-xs text-blue-700 mt-1 leading-relaxed">
              Semua metrik di atas dihitung otomatis oleh sistem dari data presensi, KPI, cuti, dan peringatan
              yang tercatat dalam database. Anda tidak perlu memasukkan data manual — cukup review dan kirim
              laporan ke HR untuk periode ini.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

interface MetricCardProps {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  subtitle: string
  color: 'blue' | 'green' | 'purple' | 'orange' | 'red' | 'navy'
}

function MetricCard({ icon: Icon, label, value, subtitle, color }: MetricCardProps) {
  const colorClasses = {
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    green: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    purple: 'bg-purple-50 text-purple-600 border-purple-200',
    orange: 'bg-orange-50 text-orange-600 border-orange-200',
    red: 'bg-red-50 text-red-600 border-red-200',
    navy: 'bg-navy-50 text-navy border-navy-200',
  }

  return (
    <div className="card space-y-3">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center border shrink-0 ${colorClasses[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-medium text-navy/60 uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-navy mt-0.5">{value}</p>
        </div>
      </div>
      <p className="text-xs text-navy/50 leading-relaxed">{subtitle}</p>
    </div>
  )
}
