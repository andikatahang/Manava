import { useState } from 'react'
import { Minus, Plus } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import type { RevisionEnvelope } from '../../types'

interface EnvelopeBuilderProps {
  open: boolean
  onClose: () => void
  projectId: string
  /** Existing envelope to edit; omit to draft a new one. */
  initial?: RevisionEnvelope
  onSave: (envelope: RevisionEnvelope) => void
}

/**
 * Modal for drafting a Revision Envelope — the digital work agreement that
 * locks scope (INCLUDED / EXCLUDED) and the free-revision ALLOWANCE before a
 * project begins. Saving produces a draft; confirmation happens in the panel.
 */
export function EnvelopeBuilder({ open, onClose, projectId, initial, onSave }: EnvelopeBuilderProps) {
  const [included, setIncluded] = useState(initial?.included_scope ?? '')
  const [excluded, setExcluded] = useState(initial?.excluded_scope ?? '')
  const [allowance, setAllowance] = useState(initial?.allowance_count ?? 3)

  const valid = included.trim().length > 0 && excluded.trim().length > 0

  function handleSave() {
    if (!valid) return
    onSave({
      envelope_id: initial?.envelope_id ?? `env-${projectId}`,
      project_id: projectId,
      included_scope: included.trim(),
      excluded_scope: excluded.trim(),
      allowance_count: allowance,
      allowance_consumed: initial?.allowance_consumed ?? 0,
    })
    onClose()
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={initial ? 'Edit Revision Envelope' : 'Susun Revision Envelope'}
      size="lg"
    >
      <div className="space-y-4">
        <p className="text-sm text-navy/60">
          Tentukan batas pekerjaan sebelum proyek dimulai. Setelah disepakati, lingkup ini mengikat
          kedua pihak dan menjadi dasar klasifikasi revisi.
        </p>

        <div>
          <label className="label" htmlFor="env-included">Lingkup termasuk (INCLUDED)</label>
          <textarea
            id="env-included"
            rows={3}
            value={included}
            onChange={e => setIncluded(e.target.value)}
            className="input resize-none"
            placeholder="mis. Koreksi warna, white balance, penghapusan noda minor untuk 20 foto"
          />
        </div>

        <div>
          <label className="label" htmlFor="env-excluded">Lingkup tidak termasuk (EXCLUDED)</label>
          <textarea
            id="env-excluded"
            rows={3}
            value={excluded}
            onChange={e => setExcluded(e.target.value)}
            className="input resize-none"
            placeholder="mis. Penggantian latar penuh, komposit, perubahan bentuk tubuh"
          />
        </div>

        <div>
          <span className="label">Jatah revisi gratis (ALLOWANCE)</span>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setAllowance(n => Math.max(0, n - 1))}
              disabled={allowance <= 0}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-navy hover:bg-navy-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Kurangi jatah revisi"
            >
              <Minus className="w-4 h-4" />
            </button>
            <span className="text-lg font-bold text-navy tabular-nums w-10 text-center">{allowance}</span>
            <button
              type="button"
              onClick={() => setAllowance(n => n + 1)}
              className="w-9 h-9 rounded-xl border border-border flex items-center justify-center text-navy hover:bg-navy-50 transition-colors"
              aria-label="Tambah jatah revisi"
            >
              <Plus className="w-4 h-4" />
            </button>
            <span className="text-sm text-navy/50">putaran revisi gratis</span>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary">Batal</button>
          <button
            onClick={handleSave}
            disabled={!valid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Simpan Draf
          </button>
        </div>
      </div>
    </Modal>
  )
}
