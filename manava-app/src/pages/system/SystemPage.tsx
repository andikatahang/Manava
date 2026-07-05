import { useSearchParams } from 'react-router-dom'
import { KeyRound, Settings2, RotateCw, ShieldCheck, Database, AlertTriangle } from 'lucide-react'
import { StatPillsRow } from '../../components/page/PageHeader'

interface SysParam {
  key: string
  value: string
  description: string
  updatedAt: string
}

const SYSTEM_PARAMS: SysParam[] = [
  { key: 'major_topup_timeout_hours',    value: '72',       description: 'Batas waktu top-up MAJOR revision',            updatedAt: '2026-05-12 10:14' },
  { key: 'dispute_sla_hours',            value: '48',       description: 'SLA mediator decision sebelum eskalasi cron',  updatedAt: '2026-04-02 09:08' },
  { key: 'attendance_cutoff_dom_hour',   value: '30:18:00', description: 'Cutoff bulanan attendance clarification (WIB)', updatedAt: '2026-01-01 00:00' },
  { key: 'refund_dp_pct_on_cancel',      value: '0.80',     description: 'Persentase refund DP saat pembatalan paksa',   updatedAt: '2026-02-21 14:32' },
  { key: 'financial_data_retention_yrs', value: '7',        description: 'Retensi data finansial (UU No. 8/1997)',       updatedAt: '2026-01-01 00:00' },
  { key: 'dispute_data_retention_yrs',   value: '10',       description: 'Retensi data dispute',                          updatedAt: '2026-01-01 00:00' },
]

interface EncKey {
  alias: string
  scope: string
  age: string
  rotateDue: string
}

const ENC_KEYS: EncKey[] = [
  { alias: 'editor_identity_v3',      scope: 'Editor.identity_file_path',      age: '94 hari', rotateDue: '5 bulan' },
  { alias: 'applicant_identity_v2',   scope: 'Applicant.identity_file_path',   age: '184 hari', rotateDue: '<30 hari' },
  { alias: 'deliverable_original_v1', scope: 'Deliverable.original_file_path', age: '12 hari', rotateDue: '11 bulan' },
]

type SysTab = 'params' | 'keys' | 'health'
const SYS_TABS: readonly SysTab[] = ['params', 'keys', 'health']

export default function SystemPage() {
  // Tab lives in the URL (?tab=) so the sidebar sub-navigation can deep-link.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: SysTab = SYS_TABS.includes(tabParam as SysTab) ? (tabParam as SysTab) : 'params'
  const setTab = (id: SysTab) => setSearchParams({ tab: id })

  const healthStats = [
    { label: 'Sistem',              value: '✓',  tone: 'emerald' as const, hint: 'Semua subsistem online' },
    { label: 'Cron watchdog',       value: '30m', tone: 'blue' as const,    hint: 'Eksekusi terakhir 2 mnt lalu' },
    { label: 'DB latency p99',      value: '38ms', tone: 'navy' as const,   hint: 'Target < 100ms' },
    { label: 'Audit log entries',   value: '14.2K', tone: 'lime' as const,  hint: '30 hari terakhir' },
  ]

  return (
    <div className="space-y-6 max-w-[1140px]">
      <StatPillsRow items={healthStats} />

      {/* Tab nav */}
      <div className="flex items-center gap-1 bg-[#021526]/[0.04] p-1 rounded-full w-fit" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
        {([
          { id: 'params', label: 'Parameter Global', icon: Settings2 },
          { id: 'keys',   label: 'Kunci Enkripsi',   icon: KeyRound },
          { id: 'health', label: 'Kesehatan Sistem', icon: ShieldCheck },
        ] as const).map(t => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[12.5px] font-semibold tracking-[-0.01em] transition-all ${tab === t.id ? 'bg-white text-[#021526] shadow-[0_2px_8px_-2px_rgba(2,21,38,0.12)]' : 'text-[#596074] hover:text-[#021526]'}`}
          >
            <t.icon className="w-3.5 h-3.5" />
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'params' && (
        <section className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden">
          <table className="w-full text-[13px]" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
            <thead className="bg-[#021526]/[0.03]">
              <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">
                <th className="px-5 py-3">Parameter</th>
                <th className="px-5 py-3">Value</th>
                <th className="px-5 py-3 hidden md:table-cell">Update terakhir</th>
                <th className="px-5 py-3 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {SYSTEM_PARAMS.map(p => (
                <tr key={p.key} className="hover:bg-[#021526]/[0.02] transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-mono text-[12px] text-[#021526]">{p.key}</p>
                    <p className="text-[11.5px] text-[#596074] mt-0.5">{p.description}</p>
                  </td>
                  <td className="px-5 py-3.5 font-mono text-[12.5px] font-semibold text-[#021526] tabular-nums">{p.value}</td>
                  <td className="px-5 py-3.5 hidden md:table-cell text-[#596074] text-[12px] tabular-nums">{p.updatedAt}</td>
                  <td className="px-5 py-3.5 text-right">
                    <button className="text-[11.5px] font-semibold text-[#021526] hover:underline">Ubah</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {tab === 'keys' && (
        <section className="space-y-3">
          {ENC_KEYS.map(k => {
            const urgent = k.rotateDue.includes('<')
            return (
              <article
                key={k.alias}
                className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="flex items-start gap-4">
                  <span className={`w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0 ${urgent ? 'bg-[#FEE2E2] text-[#B91C1C]' : 'bg-[#021526]/[0.06] text-[#021526]'}`}>
                    <KeyRound className="w-5 h-5" />
                  </span>
                  <div>
                    <p className="font-mono text-[13px] font-semibold text-[#021526]">{k.alias}</p>
                    <p className="text-[12px] text-[#596074] mt-0.5">Scope: <span className="font-mono">{k.scope}</span></p>
                    <p className="text-[11.5px] text-[#596074]/80 mt-1">Usia kunci {k.age} · Rotasi jatuh tempo dalam <span className={urgent ? 'text-[#B91C1C] font-semibold' : 'text-[#021526] font-medium'}>{k.rotateDue}</span></p>
                  </div>
                </div>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-4 py-2 rounded-full text-[12.5px] transition-all"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Rotasi sekarang
                </button>
              </article>
            )
          })}
          <p className="text-[11.5px] text-[#596074]/80 px-1">
            Kunci enkripsi melindungi data identitas dan file deliverable original. Rotasi rutin sesuai kebijakan kunci.
          </p>
        </section>
      )}

      {tab === 'health' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <article className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">Subsistem</p>
            <h3 className="text-[15px] font-semibold text-[#021526] mt-2">Status real-time</h3>
            <ul className="mt-3 space-y-2 text-[12.5px] text-[#596074]">
              <li className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-[#10B981]" /> PostgreSQL primary · OK</li>
              <li className="flex items-center gap-2"><Database className="w-3.5 h-3.5 text-[#10B981]" /> PostgreSQL replica · OK</li>
              <li className="flex items-center gap-2"><ShieldCheck className="w-3.5 h-3.5 text-[#10B981]" /> Cron `disputeSlaWatchdog` · OK</li>
              <li className="flex items-center gap-2"><AlertTriangle className="w-3.5 h-3.5 text-[#F59E0B]" /> Object storage · degraded (warning)</li>
            </ul>
          </article>
          <article className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">Capability matrix</p>
            <h3 className="text-[15px] font-semibold text-[#021526] mt-2">DENY rate</h3>
            <p className="text-[clamp(1.6rem,3vw,2rem)] font-bold text-[#021526] tabular-nums mt-2 leading-none">0.4%</p>
            <p className="text-[11.5px] text-[#596074] mt-1.5">Spike 0.7% terjadi 3 hari lalu — investigasi closed. Baseline normal 0.3–0.5%.</p>
          </article>
        </div>
      )}

      <p className="text-[11.5px] text-[#596074]/80">
        SUPERADMIN bertugas mengelola sistem (parameter, kunci enkripsi, kesehatan subsistem) dan akun pengguna.
        Tidak ada otoritas atas keputusan bisnis seperti dispute, escrow release, payroll, atau approval cuti.
      </p>
    </div>
  )
}
