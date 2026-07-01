import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Briefcase } from 'lucide-react'
import { Modal } from '../../components/ui/Modal'
import { EDITOR_CAPACITY } from '../../data/mockData'
import { getInitials } from '../../lib/utils'
import { SPEC_LABELS } from './specializations'
import { isAtCapacity } from './capacity'
import type { Editor } from '../../types'

interface BookingModalProps {
  /** Editor being booked; `null` keeps the modal closed. */
  editor: Editor | null
  onClose: () => void
}

/**
 * Booking flow for a single editor. Runs the real-time capacity check: an
 * editor already handling `EDITOR_CAPACITY` active projects cannot accept new
 * work, so the confirm action is disabled and the reason is shown.
 */
export function BookingModal({ editor, onClose }: BookingModalProps) {
  const [booked, setBooked] = useState(false)

  if (!editor) return null

  const activeProjects = editor.active_projects
  const atCapacity = isAtCapacity(editor)
  const slotsLeft = Math.max(EDITOR_CAPACITY - activeProjects, 0)
  const skills = editor.specialization.map(s => SPEC_LABELS[s] ?? s).join(' · ')

  function handleClose() {
    setBooked(false)
    onClose()
  }

  return (
    <Modal open onClose={handleClose} title="Pesan Editor" size="sm">
      {booked ? (
        <div className="text-center py-4">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6 text-emerald-600" />
          </div>
          <p className="text-sm font-semibold text-navy">Permintaan pemesanan terkirim</p>
          <p className="text-sm text-navy/55 mt-1">
            {editor.full_name} akan menerima brief Anda untuk menyusun Revision Envelope.
          </p>
          <button onClick={handleClose} className="btn-primary justify-center w-full mt-5">
            Selesai
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Editor identity */}
          <div className="flex items-center gap-3">
            {editor.avatar ? (
              <img
                src={editor.avatar}
                alt={editor.full_name}
                width={48}
                height={48}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <span className="w-12 h-12 rounded-full bg-navy text-white text-sm font-semibold flex items-center justify-center">
                {getInitials(editor.full_name)}
              </span>
            )}
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy truncate">{editor.full_name}</p>
              <p className="text-xs text-navy/50 truncate">{skills}</p>
            </div>
          </div>

          {/* Real-time capacity check */}
          {atCapacity ? (
            <div role="alert" className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5">
              <AlertTriangle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-red-800">Editor sedang penuh</p>
                <p className="text-sm text-red-700 mt-0.5">
                  {editor.full_name} sudah menangani {activeProjects} proyek aktif (maksimum{' '}
                  {EDITOR_CAPACITY}). Pemesanan baru tidak tersedia hingga ada slot yang kosong.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2.5 rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5">
              <Briefcase className="w-4 h-4 text-emerald-600 shrink-0" />
              <p className="text-sm text-navy/75">
                Kapasitas:{' '}
                <strong className="text-navy">
                  {activeProjects}/{EDITOR_CAPACITY}
                </strong>{' '}
                proyek aktif · {slotsLeft} slot tersisa.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-1">
            <button onClick={handleClose} className="btn-secondary flex-1 justify-center">
              Batal
            </button>
            <button
              onClick={() => setBooked(true)}
              disabled={atCapacity}
              className="btn-primary flex-1 justify-center disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Konfirmasi Pemesanan
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
