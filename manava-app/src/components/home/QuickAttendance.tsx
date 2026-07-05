// DB-backed quick clock-in/out card. Clock-in needs the rotating daily code
// (typed by everyone, visible only on HR's attendance page); clock-out is one
// tap. Timestamps come from the server — this card never sends a time.

import { useEffect, useState } from 'react'
import { Clock, KeyRound, LogIn, LogOut, Sparkles, CheckCircle2 } from 'lucide-react'
import { useAttendanceToday, useAttendanceMutations } from '../../hooks/queries/useAttendance'
import { fmtTimeWIB } from '../../lib/attendance'

function fmtElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000))
  const h = String(Math.floor(totalSec / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0')
  const s = String(totalSec % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

export function QuickAttendance() {
  const todayQuery = useAttendanceToday()
  const { clockIn, clockOut } = useAttendanceMutations()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [now, setNow] = useState<Date>(new Date())

  const record = todayQuery.data?.record ?? null
  const settings = todayQuery.data?.settings
  const isIn = !!record?.clock_in && !record?.clock_out
  const isDone = !!record?.clock_in && !!record?.clock_out

  useEffect(() => {
    if (!isIn) return
    const id = setInterval(() => setNow(new Date()), 1000)
    return () => clearInterval(id)
  }, [isIn])

  const elapsed = isIn && record?.clock_in ? now.getTime() - new Date(record.clock_in).getTime() : 0

  function handleClockIn() {
    if (!code.trim()) {
      setError('Masukkan kode presensi hari ini.')
      return
    }
    setError(null)
    clockIn.mutate(code.trim().toUpperCase(), {
      onSuccess: () => setCode(''),
      onError: e => setError(e instanceof Error ? e.message : 'Gagal clock-in.'),
    })
  }

  function handleClockOut() {
    setError(null)
    clockOut.mutate(undefined, {
      onError: e => setError(e instanceof Error ? e.message : 'Gagal clock-out.'),
    })
  }

  const subtitle = isDone
    ? `Selesai — masuk ${fmtTimeWIB(record?.clock_in)} · pulang ${fmtTimeWIB(record?.clock_out)} WIB.`
    : isIn
      ? `Clock-in pada ${fmtTimeWIB(record?.clock_in)} WIB${record?.status === 'late' ? ' (terlambat)' : ''} · jangan lupa clock-out sebelum ${settings?.clock_out_time ?? '17:00'}.`
      : settings
        ? `Masuk sebelum ${settings.clock_in_time} WIB · toleransi ${settings.grace_minutes} menit. Minta kode harian dari HR.`
        : 'Catat kehadiran dengan kode presensi harian dari HR.'

  return (
    <section
      aria-labelledby="quick-attendance-heading"
      className="relative overflow-hidden rounded-[16px] bg-[#021526] text-white p-5 sm:p-6"
      style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
    >
      {/* ambient glow */}
      <div
        aria-hidden
        className="pointer-events-none absolute -right-16 -top-20 w-64 h-64 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(208,241,0,0.18) 0%, rgba(2,21,38,0) 70%)' }}
      />

      <div className="relative flex flex-col sm:flex-row sm:items-center gap-5 sm:gap-6">
        <div className="flex-1 min-w-0">
          <p className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.16em] text-[#D0F100]">
            <Sparkles className="w-3 h-3" />
            Aksi cepat absensi
          </p>
          <h2 id="quick-attendance-heading" className="text-[clamp(1.4rem,3vw,1.8rem)] font-bold tracking-[-0.03em] leading-[1.1] mt-2">
            {isDone ? 'Hari kerja selesai' : isIn ? 'Sedang bertugas' : 'Mulai hari kerja Anda'}
          </h2>
          <p className="text-[13px] text-white/65 mt-1.5 leading-relaxed">{subtitle}</p>
          {error && (
            <p role="alert" className="text-[12px] text-red-300 mt-2">{error}</p>
          )}
        </div>

        {/* Timer + action */}
        <div className="flex flex-wrap items-center gap-4 sm:gap-5 flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">
              <Clock className="w-3 h-3" />
              {isDone ? 'Selesai' : isIn ? 'Berjalan' : 'Siap mulai'}
            </span>
            <span
              className="text-[clamp(1.7rem,4vw,2.4rem)] font-bold text-white tabular-nums tracking-[-0.04em] leading-none mt-1.5"
              aria-live="polite"
            >
              {isIn ? fmtElapsed(elapsed) : isDone ? `${fmtTimeWIB(record?.clock_in)}–${fmtTimeWIB(record?.clock_out)}` : '00:00:00'}
            </span>
          </div>

          {isDone ? (
            <span className="inline-flex items-center gap-2 bg-white/10 text-white/80 font-semibold px-5 py-3 rounded-full text-[13.5px]">
              <CheckCircle2 className="w-4 h-4 text-[#D0F100]" />
              Tercatat
            </span>
          ) : isIn ? (
            <button
              type="button"
              onClick={handleClockOut}
              disabled={clockOut.isPending}
              className="group inline-flex items-center gap-2 bg-white hover:brightness-95 text-[#021526] font-semibold px-5 py-3 rounded-full text-[13.5px] transition-all duration-150 shadow-[0_10px_30px_-10px_rgba(255,255,255,0.4)] disabled:opacity-60"
            >
              <LogOut className="w-4 h-4" />
              {clockOut.isPending ? 'Menyimpan…' : 'Clock-out'}
            </button>
          ) : (
            <div className="flex items-center gap-2">
              <div className="relative">
                <KeyRound className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  onKeyDown={e => { if (e.key === 'Enter') handleClockIn() }}
                  placeholder="Kode"
                  maxLength={6}
                  aria-label="Kode presensi hari ini"
                  className="w-28 bg-white/10 border border-white/15 rounded-full pl-9 pr-3 py-3 text-[13.5px] font-semibold tracking-[0.2em] uppercase placeholder:tracking-normal placeholder:font-normal placeholder:text-white/35 focus:outline-none focus:border-[#D0F100]/60"
                />
              </div>
              <button
                type="button"
                onClick={handleClockIn}
                disabled={clockIn.isPending}
                className="group inline-flex items-center gap-2 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-5 py-3 rounded-full text-[13.5px] transition-all duration-150 shadow-[0_10px_30px_-10px_rgba(208,241,0,0.6)] disabled:opacity-60"
              >
                <LogIn className="w-4 h-4" />
                {clockIn.isPending ? 'Memeriksa…' : 'Clock-in'}
              </button>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
