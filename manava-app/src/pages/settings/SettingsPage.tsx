import { Lock } from 'lucide-react'
import type { UserRole } from '../../types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">{title}</p>
      <div className="card space-y-0 p-0 divide-y divide-border">{children}</div>
    </div>
  )
}

function FieldRow({ label, desc, value }: { label: string; desc?: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy">{label}</p>
        {desc && <p className="text-xs text-navy/50 mt-0.5">{desc}</p>}
      </div>
      <p className="flex-shrink-0 text-sm font-semibold text-navy">{value}</p>
    </div>
  )
}

// Konfigurasi perusahaan saat ini masih berupa konstanta aplikasi (belum ada
// tabel settings di backend), jadi halaman ini menampilkannya read-only tanpa
// tombol simpan palsu. Form edit akan hadir bersama modul settings.
export default function SettingsPage(_props: { role: UserRole }) {
  return (
    <div className="max-w-2xl space-y-6">
      <div className="card bg-navy/[0.03] border-navy/10 p-4">
        <div className="flex gap-3">
          <Lock className="w-4 h-4 text-navy/60 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">Pengaturan bersifat baca-saja</p>
            <p className="text-xs text-navy/50 mt-0.5">
              Nilai di bawah adalah konfigurasi aplikasi saat ini. Penyimpanan pengaturan per-perusahaan
              belum diimplementasikan di backend, sehingga belum dapat diubah dari halaman ini.
            </p>
          </div>
        </div>
      </div>

      <Section title="Perusahaan">
        <FieldRow label="Nama Perusahaan" desc="Tampil di faktur dan kontrak" value="Manava Visual Services" />
        <FieldRow label="Zona Waktu" desc="Dipakai untuk semua waktu dan perhitungan SLA" value="Asia/Jakarta (WIB)" />
        <FieldRow label="Mata Uang" desc="Mata uang dasar untuk semua transaksi" value="IDR — Rupiah" />
      </Section>
    </div>
  )
}
