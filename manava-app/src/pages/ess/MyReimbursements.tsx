// Klaim Dana Operasional Proyek — editor (level operasional) mengajukan klaim;
// keputusan ada di Admin Manager departemen. Riwayat di sini milik sendiri.

import { useState } from 'react'
import { Plus, Receipt, AlertCircle } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { StatusBadge } from '../../components/ui/Badge'
import { formatCurrency, formatDate } from '../../lib/utils'
import { useReimbursements, useReimbursementMutations } from '../../hooks/queries/useReimbursements'
import { ApiError } from '../../lib/api'

export function MyReimbursements() {
  const claimsQuery = useReimbursements()
  const { submit } = useReimbursementMutations()
  const [modal, setModal] = useState(false)
  const [amount, setAmount] = useState('')
  const [purpose, setPurpose] = useState('')
  const [error, setError] = useState<string | null>(null)

  const claims = claimsQuery.data ?? []

  function handleSubmit() {
    setError(null)
    const value = Number(amount)
    if (!value || value <= 0) {
      setError('Masukkan nominal klaim yang valid')
      return
    }
    if (purpose.trim().length < 5) {
      setError('Jelaskan keperluan klaim (min. 5 karakter)')
      return
    }
    submit.mutate(
      { amount: value, purpose: purpose.trim() },
      {
        onSuccess: () => {
          setModal(false)
          setAmount('')
          setPurpose('')
        },
        onError: err => setError(err instanceof ApiError ? err.message : 'Gagal mengajukan klaim'),
      },
    )
  }

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-navy">Klaim Dana Operasional Proyek</h3>
          <p className="text-[12.5px] text-navy/60 mt-0.5">
            Diajukan ke Admin Manager departemen Anda; klaim disetujui masuk ke rekap payroll bulanan.
          </p>
        </div>
        <button
          onClick={() => setModal(true)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#021526] text-white text-[12.5px] font-semibold hover:bg-[#021526]/90 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" /> Ajukan Klaim
        </button>
      </div>

      {claimsQuery.isLoading && <p className="text-sm text-navy/50 py-4">Memuat riwayat klaim…</p>}

      {!claimsQuery.isLoading && claims.length === 0 && (
        <div className="card text-center py-10">
          <Receipt className="w-8 h-8 mx-auto mb-3 text-navy/20" />
          <p className="text-sm font-medium text-navy">Belum ada klaim</p>
          <p className="text-xs text-navy/50 mt-1">Ajukan klaim dana operasional saat ada pengeluaran proyek</p>
        </div>
      )}

      {claims.length > 0 && (
        <div className="rounded-[12px] border border-black/[0.06] bg-[#fbfbfb] overflow-hidden">
          <table className="w-full text-[13px]">
            <thead className="bg-[#021526]/[0.03]">
              <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[#596074]">
                <th className="px-4 py-3">Tanggal</th>
                <th className="px-4 py-3">Keperluan</th>
                <th className="px-4 py-3 text-right">Nominal</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/[0.05]">
              {claims.map(c => (
                <tr key={c.claim_id}>
                  <td className="px-4 py-3 text-navy/70 whitespace-nowrap">{formatDate(c.created_at)}</td>
                  <td className="px-4 py-3 text-navy">{c.purpose}</td>
                  <td className="px-4 py-3 text-right font-semibold text-navy whitespace-nowrap">{formatCurrency(c.amount)}</td>
                  <td className="px-4 py-3">
                    <StatusBadge status={c.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal open={modal} onClose={() => setModal(false)} title="Ajukan Klaim Dana Operasional">
        <div className="space-y-4">
          <div>
            <label className="block text-[12px] font-semibold text-navy mb-1.5">Nominal (Rp)</label>
            <input
              type="number"
              min={1}
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="cth. 150000"
              className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] text-navy focus:outline-none focus:ring-2 focus:ring-[#D0F100]"
            />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-navy mb-1.5">Keperluan</label>
            <textarea
              value={purpose}
              onChange={e => setPurpose(e.target.value)}
              rows={3}
              placeholder="cth. Lisensi plugin retouching untuk proyek klien A"
              className="w-full px-3 py-2 rounded-lg border border-black/10 text-[13px] text-navy focus:outline-none focus:ring-2 focus:ring-[#D0F100]"
            />
          </div>
          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <button
              onClick={() => setModal(false)}
              className="px-4 py-2 rounded-full text-[13px] font-semibold text-navy/70 hover:bg-navy/5 transition-colors"
            >
              Batal
            </button>
            <button
              onClick={handleSubmit}
              disabled={submit.isPending}
              className="px-4 py-2 rounded-full bg-[#021526] text-white text-[13px] font-semibold hover:bg-[#021526]/90 disabled:opacity-50 transition-colors"
            >
              {submit.isPending ? 'Mengirim…' : 'Ajukan'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
