// Tampilan bukti nota klaim reimbursement: tombol "Lihat Bukti" yang mengambil
// gambar via endpoint terautentikasi lalu menampilkannya dalam modal.

import { useState } from 'react'
import { ImageIcon } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { apiBlob } from '../../lib/api'

export function ProofButton({ claimId, proofName }: { claimId: string; proofName: string | null }) {
  const [url, setUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function open() {
    setLoading(true)
    setError(null)
    try {
      const blob = await apiBlob(`/reimbursements/${claimId}/proof`)
      setUrl(URL.createObjectURL(blob))
    } catch {
      setError('Gagal memuat bukti')
    } finally {
      setLoading(false)
    }
  }

  function close() {
    if (url) URL.revokeObjectURL(url)
    setUrl(null)
  }

  return (
    <>
      <button
        onClick={open}
        disabled={loading}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-semibold text-navy/70 bg-navy/[0.04] border border-black/[0.08] hover:bg-navy/[0.08] disabled:opacity-50 transition-colors"
      >
        <ImageIcon className="w-3.5 h-3.5" /> {loading ? 'Memuat…' : 'Bukti'}
      </button>
      {error && <span className="ml-2 text-[11px] text-red-600">{error}</span>}
      <Modal open={!!url} onClose={close} title={proofName ?? 'Bukti Klaim'} size="lg">
        {url && (
          <img
            src={url}
            alt={proofName ?? 'Bukti klaim'}
            className="max-h-[70vh] w-auto mx-auto rounded-lg border border-black/[0.06]"
          />
        )}
      </Modal>
    </>
  )
}
