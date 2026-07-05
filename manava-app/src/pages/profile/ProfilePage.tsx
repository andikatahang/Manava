// Profil akun yang sedang login — identitas dari /auth/me; jika akun ini
// seorang editor, baris Editor + KPI-nya diambil dari /editors.
import { Star, TrendingUp, Briefcase } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useMe } from '../../hooks/queries/useMe'
import { useEditors } from '../../hooks/queries/useEditors'

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

export default function ProfilePage() {
  const meQuery = useMe()
  const me = meQuery.data
  // Editor profile lookup only matters for editor accounts.
  const editorsQuery = useEditors(me?.role === 'editor')
  const myEditor = (editorsQuery.data ?? []).find(e => e.user_id === me?.user_id)
  const myMetrics = myEditor?.metrics

  if (meQuery.isLoading) return <p className="text-sm text-navy/50">Memuat profil…</p>
  if (!me) return <p className="text-sm text-red-600">Gagal memuat profil.</p>

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
    </div>
  )
}
