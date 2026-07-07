// Modal aksi editor di ruang proyek: kirim brief penawaran (judul, deskripsi,
// batas revisi default 5, harga) dan kirim preview hasil kerja.

import { useRef, useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { FileText, ImagePlus, PackageCheck, X } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import type { Contract, Message } from '../../../types'

// Batasi ukuran file di sisi klien agar tidak menabrak limit 12mb payload
// (base64 mengembang ~1.37x → cadangkan ke 8 MB file mentah).
const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

interface PickedImage {
  file: File
  data_url: string
  width: number
  height: number
}

async function readImage(file: File): Promise<PickedImage> {
  const data_url = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file'))
    reader.readAsDataURL(file)
  })
  const dims = await new Promise<{ width: number; height: number }>((resolve, reject) => {
    const img = new Image()
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight })
    img.onerror = () => reject(new Error('Gambar tidak dapat dibaca'))
    img.src = data_url
  })
  return { file, data_url, ...dims }
}

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
  mutation: UseMutationResult<Message, Error, {
    note: string
    attachment_url?: string
    image?: { data_url: string; width: number; height: number }
  }>
}) {
  const [note, setNote] = useState('')
  const [attachmentUrl, setAttachmentUrl] = useState('')
  const [picked, setPicked] = useState<PickedImage | null>(null)
  const [fileError, setFileError] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const urlValid = !attachmentUrl.trim() || /^https?:\/\/\S+$/.test(attachmentUrl.trim())
  const valid = note.trim().length >= 1 && urlValid && !fileError

  function reset() {
    setNote(''); setAttachmentUrl(''); setPicked(null); setFileError(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleFile(file: File | null) {
    setFileError(null)
    if (!file) { setPicked(null); return }
    if (!ACCEPTED_IMAGE_TYPES.includes(file.type)) {
      setFileError('Format gambar tidak didukung — gunakan PNG, JPEG, atau WebP.')
      setPicked(null); return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setFileError(`Ukuran gambar maksimum ${(MAX_IMAGE_BYTES / 1024 / 1024).toFixed(0)} MB.`)
      setPicked(null); return
    }
    try {
      const img = await readImage(file)
      setPicked(img)
    } catch (e) {
      setFileError(e instanceof Error ? e.message : 'Gagal memuat gambar.')
      setPicked(null)
    }
  }

  function submit() {
    if (!valid || mutation.isPending) return
    mutation.mutate(
      {
        note: note.trim(),
        attachment_url: !picked && attachmentUrl.trim() ? attachmentUrl.trim() : undefined,
        image: picked ? { data_url: picked.data_url, width: picked.width, height: picked.height } : undefined,
      },
      { onSuccess: () => { reset(); onClose() } },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Kirim Preview Hasil Kerja">
      <div className="space-y-4">
        <p className="text-xs text-navy/55 -mt-1">
          Preview dikirim ke klien untuk ditinjau. Gambar yang Anda unggah akan otomatis
          diberi <strong>watermark</strong> Manava + nama Anda sebelum dikirim ke klien.
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
          <label className="label">Unggah gambar preview <span className="text-navy/40 font-normal">(PNG/JPEG/WebP, maks 8 MB)</span></label>
          {picked ? (
            <div className="relative rounded-2xl overflow-hidden border border-border">
              <img src={picked.data_url} alt="Preview" className="w-full max-h-72 object-contain bg-navy/5" />
              <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                <span className="text-white/60 text-lg font-bold tracking-widest -rotate-12 select-none">PREVIEW · MANAVA</span>
              </div>
              <button
                onClick={() => handleFile(null)}
                className="absolute top-2 right-2 bg-navy/80 text-white rounded-full p-1 hover:bg-navy transition-colors"
                aria-label="Hapus gambar"
              >
                <X className="w-3.5 h-3.5" />
              </button>
              <div className="px-3 py-2 bg-white text-[11px] text-navy/55 border-t border-border">
                {picked.file.name} · {picked.width}×{picked.height} · {(picked.file.size / 1024).toFixed(0)} KB — watermark akan dipasang server saat dikirim
              </div>
            </div>
          ) : (
            <label className="flex items-center justify-center gap-2 border-2 border-dashed border-navy/15 rounded-2xl px-4 py-6 text-sm text-navy/55 cursor-pointer hover:border-navy/30 hover:bg-navy/[0.02] transition-colors">
              <ImagePlus className="w-4 h-4" />
              <span>Klik untuk pilih file gambar</span>
              <input
                ref={fileRef}
                type="file"
                accept={ACCEPTED_IMAGE_TYPES.join(',')}
                onChange={e => handleFile(e.target.files?.[0] ?? null)}
                className="hidden"
              />
            </label>
          )}
          {fileError && <p className="text-[11px] text-red-600 mt-1">{fileError}</p>}
        </div>

        <div>
          <label className="label">
            Atau tautan lampiran <span className="text-navy/40 font-normal">(opsional, dipakai jika tidak mengunggah gambar)</span>
          </label>
          <input
            className="input"
            value={attachmentUrl}
            onChange={e => setAttachmentUrl(e.target.value)}
            placeholder="https://drive.google.com/…"
            disabled={!!picked}
          />
          {!urlValid && (
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
