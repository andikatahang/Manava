import { useState } from 'react'
import { Settings, Bell, Shield, Database, Save, Building2 } from 'lucide-react'

type Tab = 'general' | 'projects' | 'notifications' | 'privacy'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-navy hover:bg-navy/90' : 'bg-gray-200 hover:bg-gray-300'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

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

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)

  // General
  const [company, setCompany] = useState('Manava Visual Services')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [currency, setCurrency] = useState('IDR')

  // Project defaults
  const [allowance, setAllowance] = useState('3')
  const [topupTimeout, setTopupTimeout] = useState('72')
  const [mediatorSla, setMediatorSla] = useState('48')
  const [escrowSla, setEscrowSla] = useState('1')
  const [aiThreshold, setAiThreshold] = useState('85')

  // Notifications
  const [notifRevision, setNotifRevision] = useState(true)
  const [notifEscrow, setNotifEscrow] = useState(true)
  const [notifDispute, setNotifDispute] = useState(true)
  const [notifLeave, setNotifLeave] = useState(false)
  const [notifPayroll, setNotifPayroll] = useState(true)
  const [emailDigest, setEmailDigest] = useState(false)

  // Privacy
  const [retention, setRetention] = useState('7')
  const [anonDays, setAnonDays] = useState('90')
  const [auditLog, setAuditLog] = useState(true)

  const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'general', label: 'Umum', icon: Building2 },
    { id: 'projects', label: 'Default Proyek', icon: Settings },
    { id: 'notifications', label: 'Notifikasi', icon: Bell },
    { id: 'privacy', label: 'Data & Privasi', icon: Shield },
  ]

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-navy text-white hover:bg-navy/90' : 'text-navy/60 hover:text-navy hover:bg-navy-50/40'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <div className="space-y-5">
          <Section title="Perusahaan">
            <FieldRow label="Nama Perusahaan" desc="Tampil di faktur dan kontrak">
              <input value={company} onChange={e => setCompany(e.target.value)} className="input w-56 py-2 text-sm" />
            </FieldRow>
            <FieldRow label="Zona Waktu" desc="Dipakai untuk semua waktu dan perhitungan SLA">
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="input w-44 py-2 text-sm">
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                <option value="UTC">UTC</option>
              </select>
            </FieldRow>
            <FieldRow label="Mata Uang" desc="Mata uang dasar untuk semua transaksi">
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input w-32 py-2 text-sm">
                <option value="IDR">IDR — Rupiah</option>
                <option value="USD">USD — Dollar</option>
                <option value="SGD">SGD — Singapore $</option>
              </select>
            </FieldRow>
          </Section>
        </div>
      )}

      {/* Project Defaults */}
      {tab === 'projects' && (
        <div className="space-y-5">
          <Section title="Revision Envelope">
            <FieldRow label="Allowance Gratis Default" desc="Putaran revisi gratis di setiap proyek baru">
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="20" value={allowance} onChange={e => setAllowance(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">putaran</span>
              </div>
            </FieldRow>
            <FieldRow label="Ambang Keyakinan AI" desc="Di bawah % ini memicu eskalasi ke mediator">
              <div className="flex items-center gap-2">
                <input type="number" min="50" max="100" value={aiThreshold} onChange={e => setAiThreshold(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">%</span>
              </div>
            </FieldRow>
          </Section>
          <Section title="Timer SLA">
            <FieldRow label="Batas Waktu Top-up" desc="Jam bagi klien untuk membayar revisi MAJOR">
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="168" value={topupTimeout} onChange={e => setTopupTimeout(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">jam</span>
              </div>
            </FieldRow>
            <FieldRow label="SLA Mediator" desc="Jam bagi mediator untuk menyelesaikan sengketa">
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="168" value={mediatorSla} onChange={e => setMediatorSla(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">jam</span>
              </div>
            </FieldRow>
            <FieldRow label="SLA Pencairan Escrow" desc="Jam untuk mencairkan escrow setelah pembayaran akhir diterima">
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="24" value={escrowSla} onChange={e => setEscrowSla(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">jam</span>
              </div>
            </FieldRow>
          </Section>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="space-y-5">
          <Section title="Peringatan Aplikasi">
            <FieldRow label="Revisi Dikirim" desc="Saat klien mengirim permintaan revisi baru">
              <Toggle checked={notifRevision} onChange={setNotifRevision} />
            </FieldRow>
            <FieldRow label="Pergerakan Escrow" desc="DP diterima, pembayaran akhir, pencairan">
              <Toggle checked={notifEscrow} onChange={setNotifEscrow} />
            </FieldRow>
            <FieldRow label="Sengketa Dibuka" desc="Saat sengketa diajukan pada proyek mana pun">
              <Toggle checked={notifDispute} onChange={setNotifDispute} />
            </FieldRow>
            <FieldRow label="Permohonan Cuti" desc="Saat editor mengajukan permohonan cuti">
              <Toggle checked={notifLeave} onChange={setNotifLeave} />
            </FieldRow>
            <FieldRow label="Penggajian Dibuat" desc="Saat slip gaji bulanan dibuat">
              <Toggle checked={notifPayroll} onChange={setNotifPayroll} />
            </FieldRow>
          </Section>
          <Section title="Email">
            <FieldRow label="Ringkasan Harian" desc="Email ringkasan semua aktivitas dikirim pukul 08:00">
              <Toggle checked={emailDigest} onChange={setEmailDigest} />
            </FieldRow>
          </Section>
        </div>
      )}

      {/* Privacy */}
      {tab === 'privacy' && (
        <div className="space-y-5">
          <Section title="Retensi Data">
            <FieldRow label="Catatan Keuangan" desc="Tahun penyimpanan faktur, log escrow, dan catatan penggajian (minimum IFRS 15: 7 tahun)">
              <div className="flex items-center gap-2">
                <input type="number" min="5" max="15" value={retention} onChange={e => setRetention(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">tahun</span>
              </div>
            </FieldRow>
            <FieldRow label="Anonimisasi Pasca-Pengakhiran" desc="Hari setelah pengakhiran sebelum data pribadi editor dianonimkan">
              <div className="flex items-center gap-2">
                <input type="number" min="30" max="365" value={anonDays} onChange={e => setAnonDays(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">hari</span>
              </div>
            </FieldRow>
          </Section>
          <Section title="Audit">
            <FieldRow label="Log Audit Permanen" desc="Catat semua perubahan lingkup, klasifikasi revisi, dan peristiwa pembayaran (tidak bisa dinonaktifkan di produksi)">
              <Toggle checked={auditLog} onChange={setAuditLog} />
            </FieldRow>
          </Section>
          <div className="card bg-amber-50 border-amber-200 p-4">
            <div className="flex gap-3">
              <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">Kepatuhan IFRS 15 Aktif</p>
                <p className="text-xs text-amber-700 mt-0.5">Peristiwa pengakuan pendapatan dicatat permanen dan tidak bisa diubah. Hubungi petugas kepatuhan Anda sebelum mengubah pengaturan retensi.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4" />{saved ? 'Tersimpan!' : 'Simpan Perubahan'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Pengaturan berhasil diperbarui.</span>}
      </div>
    </div>
  )
}
