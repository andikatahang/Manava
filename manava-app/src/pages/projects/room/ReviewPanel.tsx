// Ulasan klien setelah proyek selesai — rating 1–5 + komentar. Tersimpan
// sebagai Review dan langsung dihitung ke KPI editor (avg client rating).

import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Award, Loader2 } from 'lucide-react'
import { StarRating } from '../../../components/ui/StarRating'
import { formatDate } from '../../../lib/utils'
import type { Review } from '../../../types'

export function ReviewPanel({ editorName, existing, canReview, mutation }: {
  editorName: string
  existing: Review | null
  canReview: boolean
  mutation: UseMutationResult<Review, Error, { rating: number; comment: string }>
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')

  // Sudah ada ulasan → tampilkan hasilnya (untuk semua role).
  if (existing) {
    return (
      <div className="card no-hover border-emerald-200 bg-emerald-50/40">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-emerald-700 mb-2">
          <Award className="w-3.5 h-3.5" /> Ulasan Klien — tersimpan ke KPI editor
        </p>
        <StarRating value={existing.rating} size={15} />
        <p className="text-sm text-navy/75 mt-2 leading-relaxed">{existing.comment}</p>
        <p className="text-[11px] text-navy/45 mt-2">
          {existing.reviewer_name} · {formatDate(existing.created_at)}
        </p>
      </div>
    )
  }

  if (!canReview) return null

  const valid = rating >= 1 && comment.trim().length >= 3

  return (
    <div className="card no-hover border-navy/15">
      <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-navy/60 mb-1">
        <Award className="w-3.5 h-3.5" /> Beri Ulasan Kinerja Editor
      </p>
      <p className="text-xs text-navy/55 mb-3">
        Bagaimana kinerja {editorName} di proyek ini? Penilaian Anda menjadi KPI editor.
      </p>
      <StarRating value={rating} size={22} interactive onChange={setRating} showValue={false} />
      <textarea
        className="input min-h-[80px] resize-y mt-3"
        value={comment}
        onChange={e => setComment(e.target.value)}
        placeholder="Ceritakan kualitas hasil, komunikasi, dan ketepatan waktu editor…"
        maxLength={1000}
      />
      {mutation.isError && <p className="text-xs text-red-600 mt-2">{mutation.error.message}</p>}
      <div className="flex justify-end mt-3">
        <button
          onClick={() => valid && mutation.mutate({ rating, comment: comment.trim() })}
          disabled={!valid || mutation.isPending}
          className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
        >
          {mutation.isPending
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Menyimpan…</>
            : 'Kirim Ulasan'}
        </button>
      </div>
    </div>
  )
}
