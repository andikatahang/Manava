import { useState, useRef } from 'react'
import { Paperclip, X, FileText, ShieldAlert } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'

interface DisputeFormProps {
  open: boolean
  onClose: () => void
  onSubmit: (reason: string, evidence: string[]) => void
}

/**
 * Lets a project party (client or editor) open a dispute: a reason plus
 * simulated evidence attachments (filenames only — no upload).
 */
export function DisputeForm({ open, onClose, onSubmit }: DisputeFormProps) {
  const [reason, setReason] = useState('')
  const [evidence, setEvidence] = useState<string[]>([])
  const fileRef = useRef<HTMLInputElement>(null)

  const valid = reason.trim().length > 0

  function addFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (file) setEvidence(prev => [...prev, file.name])
    e.target.value = '' // allow re-selecting the same file
  }

  function reset() {
    setReason('')
    setEvidence([])
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleSubmit() {
    if (!valid) return
    onSubmit(reason.trim(), evidence)
    reset()
    onClose()
  }

  return (
    <Modal open={open} onClose={handleClose} title="Ajukan Sengketa" size="lg">
      <div className="space-y-4">
        <p className="text-sm text-navy/60">
          Jelaskan masalahnya dengan jelas dan lampirkan bukti pendukung. Mediator akan ditugaskan
          dengan SLA 48 jam.
        </p>

        <div>
          <label className="label" htmlFor="dispute-reason">Alasan sengketa</label>
          <textarea
            id="dispute-reason"
            rows={4}
            value={reason}
            onChange={e => setReason(e.target.value)}
            className="input resize-none"
            placeholder="mis. Revisi minor dalam lingkup brief diklasifikasi sebagai major…"
          />
        </div>

        <div>
          <span className="label">Bukti pendukung</span>
          <input ref={fileRef} type="file" className="hidden" onChange={addFile} />
          <button type="button" onClick={() => fileRef.current?.click()} className="btn-secondary text-sm">
            <Paperclip className="w-4 h-4" /> Lampirkan berkas
          </button>
          {evidence.length > 0 && (
            <div className="mt-3 space-y-2">
              {evidence.map((name, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border bg-navy-50/40 px-3 py-2">
                  <FileText className="w-3.5 h-3.5 text-navy/50 shrink-0" />
                  <span className="text-sm text-navy/80 flex-1 truncate">{name}</span>
                  <button
                    onClick={() => setEvidence(prev => prev.filter((_, idx) => idx !== i))}
                    className="p-0.5 rounded text-navy/40 hover:text-navy"
                    aria-label={`Hapus ${name}`}
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={handleClose} className="btn-secondary">Batal</button>
          <button
            onClick={handleSubmit}
            disabled={!valid}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ShieldAlert className="w-4 h-4" /> Kirim Sengketa
          </button>
        </div>
      </div>
    </Modal>
  )
}
