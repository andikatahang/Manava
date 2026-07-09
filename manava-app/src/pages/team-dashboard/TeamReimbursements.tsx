// Persetujuan Klaim Dana Operasional — Admin Manager (level taktis).
// Server hanya mengirim klaim dari editor di departemen manajer ini.

import { Check, X, Receipt } from 'lucide-react'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useReimbursements, useReimbursementMutations } from '../../hooks/queries/useReimbursements'
import type { ReimbursementClaim } from '../../types'

export function TeamReimbursements() {
  const claimsQuery = useReimbursements()
  const { approve, reject } = useReimbursementMutations()
  const claims = claimsQuery.data ?? []
  const pending = claims.filter(c => c.status === 'pending')
  const decided = claims.filter(c => c.status !== 'pending')

  if (claimsQuery.isLoading) {
    return <p className="text-sm text-navy/50 py-4">Memuat klaim…</p>
  }

  return (
    <div className="space-y-6">
      <div className="card space-y-4">
        <div className="border-b border-border pb-4">
          <h3 className="text-lg font-bold text-navy">Persetujuan Klaim Dana Operasional</h3>
          <p className="text-sm text-navy/60 mt-1">
            Klaim dari editor di departemen Anda. Total klaim disetujui otomatis masuk ke
            Draft Laporan Bulanan Departemen sebagai bahan finalisasi payroll oleh HR Admin.
          </p>
        </div>

        {pending.length === 0 ? (
          <div className="text-center py-8">
            <Receipt className="w-8 h-8 mx-auto mb-3 text-navy/20" />
            <p className="text-sm font-medium text-navy">Tidak ada klaim menunggu keputusan</p>
          </div>
        ) : (
          <ClaimTable
            claims={pending}
            actions={c => (
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => approve.mutate(c)}
                  disabled={approve.isPending || reject.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100 disabled:opacity-50 transition-colors"
                >
                  <Check className="w-3.5 h-3.5" /> Setujui
                </button>
                <button
                  onClick={() => reject.mutate(c)}
                  disabled={approve.isPending || reject.isPending}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11.5px] font-semibold text-red-700 bg-red-50 border border-red-200 hover:bg-red-100 disabled:opacity-50 transition-colors"
                >
                  <X className="w-3.5 h-3.5" /> Tolak
                </button>
              </div>
            )}
          />
        )}
      </div>

      {decided.length > 0 && (
        <div className="card space-y-4">
          <h4 className="text-sm font-bold text-navy">Riwayat Keputusan</h4>
          <ClaimTable claims={decided} />
        </div>
      )}
    </div>
  )
}

function ClaimTable({ claims, actions }: {
  claims: ReimbursementClaim[]
  actions?: (claimId: string) => React.ReactNode
}) {
  return (
    <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead className="bg-[#021526]/[0.03]">
          <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">
            <th className="px-4 py-3">Editor</th>
            <th className="px-4 py-3">Keperluan</th>
            <th className="px-4 py-3 text-right">Nominal</th>
            <th className="px-4 py-3">Diajukan</th>
            <th className="px-4 py-3">{actions ? 'Aksi' : 'Status'}</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-black/[0.05]">
          {claims.map(c => (
            <tr key={c.claim_id}>
              <td className="px-4 py-3 font-semibold text-navy whitespace-nowrap">{c.user_name}</td>
              <td className="px-4 py-3 text-navy/80">{c.purpose}</td>
              <td className="px-4 py-3 text-right font-semibold text-navy whitespace-nowrap">{formatCurrency(c.amount)}</td>
              <td className="px-4 py-3 text-navy/60 whitespace-nowrap">{formatDate(c.created_at)}</td>
              <td className="px-4 py-3">
                {actions ? actions(c.claim_id) : <StatusBadge status={c.status} />}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
