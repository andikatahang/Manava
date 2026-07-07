// Modal aksi editor di ruang proyek: kirim brief penawaran (judul, deskripsi,
// batas revisi default 5, harga) dan kirim preview hasil kerja.

import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { FileText, PackageCheck } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import type { Contract, Message } from '../../../types'

type BriefInput = { title: string; description: string; revision_limit: number; price: number }

export function BriefFormModal({ open, onClose, mutation }: {
  open: boolean
  onClose: () => void
  mutation: UseMutationResult<Contract, Error, BriefInput>
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [revisionLimit, setRevisionLimit] = useState(5)
  const [price, setPrice] = useState('')

  const priceNumber = Number(price.replace(/[^\d]/g, '')) || 0
  const valid = title.trim().length >= 3 && description.trim().length >= 10 && priceNumber >= 1

  function submit() {
    if (!valid || mutation.isPending) return
    mutation.mutate(
      {
        title: title.trim(),
        description: description.trim(),
        revision_limit: revisionLimit,
        price: priceNumber,
      },
      { onSuccess: onClose },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Kirim Brief Penawaran" size="lg">
      <div className="space-y-4">
        <p className="text-xs text-navy/55 -mt-1">
          Brief adalah kesepakatan kerja: klien menyetujui judul, deskripsi cakupan, batas revisi
          minor gratis, dan harga sebelum pengerjaan dimulai.
        </p>
        <div>
          <label className="label">Judul proyek</label>
          <input
            className="input"
            value={title}
            onChange={e => setTitle(e.target.value)}
            placeholder="mis. Retouching Katalog Produk 40 Foto"
            maxLength={150}
          />
        </div>
        <div>
          <label className="label">Deskripsi proyek & cakupan</label>
          <textarea
            className="input min-h-[110px] resize-y"
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Jelaskan hasil akhir, format file, dan apa saja yang termasuk dalam pengerjaan…"
            maxLength={2000}
          />
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="label">Batas revisi minor (gratis)</label>
            <input
              type="number"
              className="input"
              value={revisionLimit}
              min={0}
              max={20}
              onChange={e => setRevisionLimit(Math.max(0, Math.min(20, Number(e.target.value) || 0)))}
            />
            <p className="text-[11px] text-navy/45 mt-1">Default 5x. Revisi major dihitung terpisah.</p>
          </div>
          <div>
            <label className="label">Harga proyek (Rp)</label>
            <input
              className="input"
              inputMode="numeric"
              value={price}
              onChange={e => setPrice(e.target.value.replace(/[^\d]/g, ''))}
              placeholder="mis. 8000000"
            />
            {priceNumber > 0 && (
              <p className="text-[11px] text-navy/45 mt-1">
                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(priceNumber)}
              </p>
            )}
          </div>
        </div>
        {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary text-sm">Batal</button>
          <button
            onClick={submit}
            disabled={!valid || mutation.isPending}
            className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <FileText className="w-4 h-4" />
            {mutation.isPending ? 'Mengirim…' : 'Kirim Brief ke Klien'}
          </button>
        </div>
      </div>
    </Modal>
  )
}

export function DeliverableModal({ open, onClose, mutation }: {
  open: boolean
  onClose: () => void
  mutation: UseMutationResult<Message, Error, { note: string; attachment?: string }>
}) {
  const [note, setNote] = useState('')
  const [attachment, setAttachment] = useState('')

  const attachmentValid = !attachment.trim() || /^https?:\/\/\S+$/.test(attachment.trim())
  const valid = note.trim().length >= 1 && attachmentValid

  function submit() {
    if (!valid || mutation.isPending) return
    mutation.mutate(
      { note: note.trim(), attachment: attachment.trim() || undefined },
      { onSuccess: () => { setNote(''); setAttachment(''); onClose() } },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Kirim Preview Hasil Kerja">
      <div className="space-y-4">
        <p className="text-xs text-navy/55 -mt-1">
          Preview dikirim ke klien untuk ditinjau — klien dapat menyetujui hasil (proyek selesai)
          atau meminta revisi.
        </p>
        <div>
          <label className="label">Catatan untuk klien</label>
          <textarea
            className="input min-h-[100px] resize-y"
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="mis. Preview ronde 1: 20 foto pertama sudah selesai, mohon dicek konsistensi warnanya…"
            maxLength={2000}
          />
        </div>
        <div>
          <label className="label">Tautan lampiran <span className="text-navy/40 font-normal">(opsional)</span></label>
          <input
            className="input"
            value={attachment}
            onChange={e => setAttachment(e.target.value)}
            placeholder="https://drive.google.com/…"
          />
          {!attachmentValid && (
            <p className="text-[11px] text-red-600 mt-1">Tautan harus diawali http:// atau https://</p>
          )}
        </div>
        {mutation.isError && <p className="text-xs text-red-600">{mutation.error.message}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary text-sm">Batal</button>
          <button
            onClick={submit}
            disabled={!valid || mutation.isPending}
            className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <PackageCheck className="w-4 h-4" />
            {mutation.isPending ? 'Mengirim…' : 'Kirim Preview'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
