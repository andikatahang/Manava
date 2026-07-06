// Profil akun yang sedang login — identitas dari /auth/me; jika akun ini
// seorang editor, baris Editor + KPI-nya diambil dari /editors.
import { useState } from 'react'
import { Star, TrendingUp, Briefcase, Shield, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useMe } from '../../hooks/queries/useMe'
import { useEditors } from '../../hooks/queries/useEditors'
import { changePassword } from '../../lib/leaveRequests'
import { ApiError } from '../../lib/api'

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'System Admin',
  hr_admin: 'HR Admin',
  admin_manager: 'Admin Manager',
  editor: 'Editor',
}

const SPEC_LABELS: Record<string, string> = {
  product_retouch: 'Product Retouch',
  color_correction: 'Color Correction',
  video_edit: 'Video Edit',
  color_grading: 'Color Grading',
  portrait_retouch: 'Portrait Retouch',
  background_removal: 'BG Removal',
  vfx: 'VFX',
  motion_graphics: 'Motion Graphics',
}

interface PasswordForm {
  current: string
  newPass: string
  confirm: string
}

export default function ProfilePage() {
  const meQuery = useMe()
  const me = meQuery.data
  // Editor profile lookup only matters for editor accounts.
  const editorsQuery = useEditors(me?.role === 'editor')
  const myEditor = (editorsQuery.data ?? []).find(e => e.user_id === me?.user_id)
  const myMetrics = myEditor?.metrics

  // Password change state
  const [pwForm, setPwForm] = useState<PasswordForm>({ current: '', newPass: '', confirm: '' })
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [pwLoading, setPwLoading] = useState(false)
  const [pwSuccess, setPwSuccess] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)

  if (meQuery.isLoading) return <p className="text-sm text-navy/50">Memuat profil…</p>
  if (!me) return <p className="text-sm text-red-600">Gagal memuat profil.</p>

  const pwValid = pwForm.current.length > 0 && pwForm.newPass.length >= 8 && pwForm.newPass === pwForm.confirm

  async function handlePasswordChange() {
    if (!pwValid) return
    setPwLoading(true)
    setPwError(null)
    setPwSuccess(false)
    try {
      await changePassword({ current_password: pwForm.current, new_password: pwForm.newPass })
      setPwSuccess(true)
      setPwForm({ current: '', newPass: '', confirm: '' })
      setTimeout(() => setPwSuccess(false), 4000)
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) {
        setPwError('Kata sandi saat ini salah.')
      } else {
        setPwError(e instanceof Error ? e.message : 'Gagal mengubah kata sandi.')
      }
    } finally {
      setPwLoading(false)
    }
  }

  const rows: Array<[string, string]> = [
    ['Nama Lengkap', me.full_name],
    ['Email', me.email],
    ['Username', me.username ?? '—'],
    ['Role', ROLE_LABEL[me.role] ?? me.role],
    ...(myEditor
      ? ([
          ['Departemen', myEditor.department],
          ['Bergabung', formatDate(myEditor.onboarded_at)],
          ['Gaji Pokok', formatCurrency(myEditor.base_salary)],
        ] as Array<[string, string]>)
      : []),
  ]

  return (
    <div className="space-y-6">
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Identity card */}
        <div className="card text-center">
          <div className="w-20 h-20 rounded-2xl bg-navy flex items-center justify-center text-white text-2xl font-bold mx-auto mb-3">
            {me.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <h2 className="text-lg font-bold text-navy">{me.full_name}</h2>
          <p className="text-sm text-navy/50 mt-0.5">{myEditor?.department ?? ROLE_LABEL[me.role] ?? me.role}</p>
          {myEditor && <StatusBadge status={myEditor.status} />}
          {myEditor && (
            <div className="flex flex-wrap justify-center gap-1.5 mt-3">
              {myEditor.specialization.map(s => (
                <span key={s} className="text-xs bg-navy-50 text-navy px-2.5 py-1 rounded-full font-medium">
                  {SPEC_LABELS[s] ?? s}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Details */}
        <div className="card lg:col-span-2">
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-4">Informasi Akun</p>
          <div className="grid sm:grid-cols-2 gap-0">
            {rows.map(([label, value]) => (
              <div key={label} className="py-3 border-b border-border last:border-0 sm:odd:pr-6">
                <p className="text-xs text-navy/40 mb-0.5">{label}</p>
                <p className="text-sm font-medium text-navy">{value}</p>
              </div>
            ))}
          </div>

          {/* Quick KPI snapshot (editor accounts only) */}
          {myMetrics && (
            <div className="mt-5 pt-4 border-t border-border">
              <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">Ringkasan KPI Saya</p>
              <div className="grid grid-cols-3 gap-3">
                <div className="bg-amber-50 rounded-xl p-3 text-center">
                  <Star className="w-4 h-4 text-amber-500 mx-auto mb-1" />
                  <p className="text-base font-bold text-navy">{myMetrics.avg_client_rating.toFixed(1)}</p>
                  <p className="text-xs text-navy/50">Rating Klien</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3 text-center">
                  <TrendingUp className="w-4 h-4 text-blue-500 mx-auto mb-1" />
                  <p className="text-base font-bold text-navy">{myMetrics.completion_rate}%</p>
                  <p className="text-xs text-navy/50">Penyelesaian</p>
                </div>
                <div className="bg-emerald-50 rounded-xl p-3 text-center">
                  <Briefcase className="w-4 h-4 text-emerald-600 mx-auto mb-1" />
                  <p className="text-base font-bold text-navy">{myMetrics.kpi_average.toFixed(2)}</p>
                  <p className="text-xs text-navy/50">Skor KPI</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Security section */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Shield className="w-5 h-5 text-navy" />
          <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider">Keamanan</p>
        </div>

        <div className="max-w-md space-y-4">
          <div>
            <label className="text-xs font-medium text-navy/60 mb-1.5 block">Kata sandi saat ini</label>
            <div className="relative">
              <input
                type={showCurrent ? 'text' : 'password'}
                value={pwForm.current}
                onChange={e => setPwForm(f => ({ ...f, current: e.target.value }))}
                className="input pr-10"
                placeholder="Masukkan kata sandi lama"
              />
              <button
                type="button"
                onClick={() => setShowCurrent(!showCurrent)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors"
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-medium text-navy/60 mb-1.5 block">Kata sandi baru</label>
            <div className="relative">
              <input
                type={showNew ? 'text' : 'password'}
                value={pwForm.newPass}
                onChange={e => setPwForm(f => ({ ...f, newPass: e.target.value }))}
                className="input pr-10"
                placeholder="Minimal 8 karakter"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwForm.newPass.length > 0 && pwForm.newPass.length < 8 && (
              <p className="text-xs text-amber-600 mt-1">Kata sandi harus minimal 8 karakter</p>
            )}
          </div>

          <div>
            <label className="text-xs font-medium text-navy/60 mb-1.5 block">Konfirmasi kata sandi baru</label>
            <div className="relative">
              <input
                type={showConfirm ? 'text' : 'password'}
                value={pwForm.confirm}
                onChange={e => setPwForm(f => ({ ...f, confirm: e.target.value }))}
                className="input pr-10"
                placeholder="Ulangi kata sandi baru"
              />
              <button
                type="button"
                onClick={() => setShowConfirm(!showConfirm)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-navy/40 hover:text-navy transition-colors"
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            {pwForm.confirm.length > 0 && pwForm.newPass !== pwForm.confirm && (
              <p className="text-xs text-red-600 mt-1">Konfirmasi kata sandi tidak cocok</p>
            )}
          </div>

          {pwError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              {pwError}
            </div>
          )}

          {pwSuccess && (
            <div className="flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              Kata sandi berhasil diubah.
            </div>
          )}

          <button
            onClick={handlePasswordChange}
            disabled={!pwValid || pwLoading}
            className="btn-primary disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {pwLoading ? 'Menyimpan…' : 'Ubah Kata Sandi'}
          </button>
        </div>
      </div>
    </div>
  )
}
