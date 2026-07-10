import { useEffect, useState } from 'react'
import { Lock, Percent, CheckCircle2 } from 'lucide-react'
import type { UserRole } from '../../types'
import { usePayrollSettings, usePayrollSettingsMutation } from '../../hooks/queries/usePayroll'
import type { PayrollSettings } from '../../lib/payroll'
import { ApiError } from '../../lib/api'

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

// Konfigurasi perusahaan masih read-only, tetapi pengaturan payroll (tarif
// BPJS, bracket PPh21, denda presensi) sudah tersimpan di backend dan dapat
// diubah oleh HR Admin / Superadmin.
export default function SettingsPage({ role }: { role: UserRole }) {
  const canEditPayroll = role === 'superadmin' || role === 'hr_admin'

  return (
    <div className="max-w-2xl space-y-6">
      <div className="card bg-navy/[0.03] border-navy/10 p-4">
        <div className="flex gap-3">
          <Lock className="w-4 h-4 text-navy/60 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-navy">Konfigurasi perusahaan bersifat baca-saja</p>
            <p className="text-xs text-navy/50 mt-0.5">
              Identitas perusahaan di bawah masih konfigurasi aplikasi. Pengaturan payroll di bagian
              bawah sudah tersimpan di server dan dapat diubah.
            </p>
          </div>
        </div>
      </div>

      <Section title="Perusahaan">
        <FieldRow label="Nama Perusahaan" desc="Tampil di faktur dan kontrak" value="Manava Visual Services" />
        <FieldRow label="Zona Waktu" desc="Dipakai untuk semua waktu dan perhitungan SLA" value="Asia/Jakarta (WIB)" />
        <FieldRow label="Mata Uang" desc="Mata uang dasar untuk semua transaksi" value="IDR — Rupiah" />
      </Section>

      {canEditPayroll && <PayrollSettingsSection />}
    </div>
  )
}

// Field metadata: key, label, and whether the stored value is a rate
// (fraction of gross, edited as %) or a rupiah amount.
const RATE_FIELDS: Array<{ key: keyof PayrollSettings; label: string }> = [
  { key: 'bpjs_kesehatan_rate', label: 'BPJS Kesehatan' },
  { key: 'bpjs_tk_jkk_rate', label: 'BPJS TK — JKK (kecelakaan kerja)' },
  { key: 'bpjs_tk_jkm_rate', label: 'BPJS TK — JKM (kematian)' },
  { key: 'bpjs_tk_jht_rate', label: 'BPJS TK — JHT (hari tua)' },
  { key: 'bpjs_tk_jp_rate', label: 'BPJS TK — JP (pensiun)' },
  { key: 'pph21_bracket_1_rate', label: 'PPh21 tarif bracket 1' },
  { key: 'pph21_bracket_2_rate', label: 'PPh21 tarif bracket 2' },
  { key: 'pph21_bracket_3_rate', label: 'PPh21 tarif bracket 3' },
]

const AMOUNT_FIELDS: Array<{ key: keyof PayrollSettings; label: string }> = [
  { key: 'pph21_bracket_1_limit', label: 'Batas bracket 1 (Rp/bulan)' },
  { key: 'pph21_bracket_2_limit', label: 'Batas bracket 2 (Rp/bulan)' },
  { key: 'presensi_penalty_per_day', label: 'Denda presensi per hari bolong (Rp)' },
]

function PayrollSettingsSection() {
  const { data: settings, isLoading, error } = usePayrollSettings()
  const save = usePayrollSettingsMutation()
  const [form, setForm] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  useEffect(() => {
    if (!settings) return
    const next: Record<string, string> = {}
    for (const f of RATE_FIELDS) next[f.key] = String((settings[f.key] as number) * 100)
    for (const f of AMOUNT_FIELDS) next[f.key] = String(settings[f.key] as number)
    setForm(next)
  }, [settings])

  if (isLoading) return <div className="card p-5 text-sm text-navy/50">Memuat pengaturan payroll…</div>
  if (error || !settings) return <div className="card p-5 text-sm text-red-600">Gagal memuat pengaturan payroll.</div>

  function submit() {
    setSaveError(null)
    setSaved(false)
    const payload: Partial<PayrollSettings> = {}
    for (const f of RATE_FIELDS) {
      const pct = Number(form[f.key])
      if (Number.isNaN(pct) || pct < 0 || pct > 100) {
        setSaveError(`Nilai "${f.label}" harus berupa persen 0–100`)
        return
      }
      ;(payload as Record<string, number>)[f.key] = pct / 100
    }
    for (const f of AMOUNT_FIELDS) {
      const amount = Number(form[f.key])
      if (!Number.isInteger(amount) || amount < 0) {
        setSaveError(`Nilai "${f.label}" harus berupa angka bulat ≥ 0`)
        return
      }
      ;(payload as Record<string, number>)[f.key] = amount
    }
    save.mutate(payload, {
      onSuccess: () => setSaved(true),
      onError: err => setSaveError(err instanceof ApiError ? err.message : 'Gagal menyimpan pengaturan'),
    })
  }

  return (
    <Section title="Payroll — Pajak & BPJS">
      <div className="p-5 space-y-4">
        <div className="flex items-center gap-2 text-xs text-navy/50">
          <Percent className="w-3.5 h-3.5" />
          Tarif diisi dalam persen dari gaji bruto; batas bracket dan denda dalam rupiah.
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          {RATE_FIELDS.map(f => (
            <div key={f.key}>
              <label className="label">{f.label} (%)</label>
              <input
                type="number" min={0} max={100} step="any" className="input"
                value={form[f.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
          {AMOUNT_FIELDS.map(f => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              <input
                type="number" min={0} step={1} className="input"
                value={form[f.key] ?? ''}
                onChange={e => setForm(prev => ({ ...prev, [f.key]: e.target.value }))}
              />
            </div>
          ))}
        </div>

        {saveError && (
          <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{saveError}</p>
        )}
        {saved && !saveError && (
          <p className="inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
            <CheckCircle2 className="w-3.5 h-3.5" /> Pengaturan payroll tersimpan.
          </p>
        )}

        <button className="btn-primary" disabled={save.isPending} onClick={submit}>
          {save.isPending ? 'Menyimpan…' : 'Simpan Pengaturan Payroll'}
        </button>
      </div>
    </Section>
  )
}
