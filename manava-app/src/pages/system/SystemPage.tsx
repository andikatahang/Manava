// Sistem & Enkripsi — hanya tab "Kesehatan Sistem" yang punya sumber data
// nyata (GET /api/v1/health). Parameter global dan manajemen kunci enkripsi
// belum diimplementasikan di backend, jadi tab tersebut menampilkan pesan
// status alih-alih data tiruan.

import { useSearchParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { KeyRound, Settings2, ShieldCheck, CheckCircle2, XCircle } from 'lucide-react'
import { api } from '../../lib/api'
import { formatDateTime } from '../../lib/utils'

type SysTab = 'params' | 'keys' | 'health'
const SYS_TABS: readonly SysTab[] = ['params', 'keys', 'health']

interface HealthInfo {
  status: string
  env: string
  ts: string
}

function useHealth(enabled: boolean) {
  return useQuery({
    queryKey: ['system-health'],
    queryFn: () => api<HealthInfo>('/health'),
    enabled,
    refetchInterval: 30_000,
    retry: false,
  })
}

function PlaceholderCard({ icon: Icon, title, body }: { icon: typeof KeyRound; title: string; body: string }) {
  return (
    <div className="max-w-2xl">
      <div className="card text-center py-16">
        <Icon className="w-10 h-10 mx-auto mb-3 text-navy/30" />
        <p className="text-sm font-semibold text-navy">{title}</p>
        <p className="text-xs text-navy/50 mt-1.5 max-w-md mx-auto">{body}</p>
      </div>
    </div>
  )
}

export default function SystemPage() {
  // Tab lives in the URL (?tab=) so the sidebar sub-navigation can deep-link.
  const [searchParams, setSearchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const tab: SysTab = SYS_TABS.includes(tabParam as SysTab) ? (tabParam as SysTab) : 'params'
  const setTab = (id: SysTab) => setSearchParams({ tab: id })

  const health = useHealth(tab === 'health')
  const isUp = health.isSuccess && health.data.status === 'ok'

  return (
    <div className="space-y-6 max-w-[1140px]">
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
        <PlaceholderCard
          icon={Settings2}
          title="Parameter global belum tersedia"
          body="Penyimpanan parameter sistem (SLA, retensi data, kebijakan refund) belum diimplementasikan di backend. Parameter akan tampil dan dapat diubah di sini setelah modulnya aktif."
        />
      )}

      {tab === 'keys' && (
        <PlaceholderCard
          icon={KeyRound}
          title="Manajemen kunci enkripsi belum tersedia"
          body="Rotasi dan pemantauan kunci enkripsi untuk data identitas dan file deliverable akan aktif setelah modul manajemen kunci diimplementasikan di backend."
        />
      )}

      {tab === 'health' && (
        <div className="grid sm:grid-cols-2 gap-3">
          <article className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">API Server</p>
            <div className="flex items-center gap-2 mt-3">
              {health.isPending ? (
                <p className="text-[13px] text-[#596074]">Memeriksa…</p>
              ) : isUp ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" />
                  <p className="text-[15px] font-semibold text-[#021526]">Online</p>
                </>
              ) : (
                <>
                  <XCircle className="w-4 h-4 text-[#EF4444]" />
                  <p className="text-[15px] font-semibold text-[#021526]">Tidak terjangkau</p>
                </>
              )}
            </div>
            <p className="text-[11.5px] text-[#596074] mt-1.5">
              {isUp
                ? `Environment: ${health.data.env} · Waktu server: ${formatDateTime(health.data.ts)}`
                : health.isError
                ? 'GET /api/v1/health gagal — periksa apakah server API berjalan.'
                : 'Menghubungi endpoint kesehatan…'}
            </p>
          </article>
          <article className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] p-5">
            <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">Pemantauan</p>
            <h3 className="text-[15px] font-semibold text-[#021526] mt-2">Pemeriksaan berkala</h3>
            <p className="text-[11.5px] text-[#596074] mt-1.5">
              Status di atas diambil langsung dari endpoint <span className="font-mono">/api/v1/health</span> dan
              diperbarui otomatis setiap 30 detik selama tab ini terbuka. Metrik subsistem lain
              (database, cron, object storage) akan menyusul setelah instrumentasinya tersedia.
            </p>
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
