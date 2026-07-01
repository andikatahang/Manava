import { useState } from 'react'
import { Save, Lock } from 'lucide-react'
import type { UserRole } from '../../types'

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">{title}</p>
      <div className="card space-y-0 p-0 divide-y divide-border">{children}</div>
    </div>
  )
}

function FieldRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy">{label}</p>
        {desc && <p className="text-xs text-navy/50 mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

// Company-wide settings are owned by HR Admin and apply to every user.
// Other roles can view the values but cannot change them.
export default function SettingsPage({ role }: { role: UserRole }) {
  const canEdit = role === 'hr_admin'
  const [saved, setSaved] = useState(false)

  const [company, setCompany] = useState('Manava Visual Services')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [currency, setCurrency] = useState('IDR')

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {!canEdit && (
        <div className="card bg-navy/[0.03] border-navy/10 p-4">
          <div className="flex gap-3">
            <Lock className="w-4 h-4 text-navy/60 shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-navy">Pengaturan dikelola HR Admin</p>
              <p className="text-xs text-navy/50 mt-0.5">
                Pengaturan umum berlaku untuk seluruh pengguna dan hanya dapat diubah oleh HR Admin.
                Anda dapat melihatnya, tetapi tidak dapat mengubahnya.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-5">
        <Section title="Perusahaan">
          <FieldRow label="Nama Perusahaan" desc="Tampil di faktur dan kontrak">
            <input
              value={company}
              onChange={e => setCompany(e.target.value)}
              disabled={!canEdit}
              className="input w-56 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            />
          </FieldRow>
          <FieldRow label="Zona Waktu" desc="Dipakai untuk semua waktu dan perhitungan SLA">
            <select
              value={timezone}
              onChange={e => setTimezone(e.target.value)}
              disabled={!canEdit}
              className="input w-44 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
              <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
              <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
              <option value="UTC">UTC</option>
            </select>
          </FieldRow>
          <FieldRow label="Mata Uang" desc="Mata uang dasar untuk semua transaksi">
            <select
              value={currency}
              onChange={e => setCurrency(e.target.value)}
              disabled={!canEdit}
              className="input w-32 py-2 text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            >
              <option value="IDR">IDR — Rupiah</option>
              <option value="USD">USD — Dollar</option>
              <option value="SGD">SGD — Singapore $</option>
            </select>
          </FieldRow>
        </Section>
      </div>

      {canEdit && (
        <div className="flex items-center gap-3">
          <button onClick={handleSave} className="btn-primary">
            <Save className="w-4 h-4" />{saved ? 'Tersimpan!' : 'Simpan Perubahan'}
          </button>
          {saved && <span className="text-sm text-emerald-600 font-medium">Pengaturan berhasil diperbarui.</span>}
        </div>
      )}
    </div>
  )
}
