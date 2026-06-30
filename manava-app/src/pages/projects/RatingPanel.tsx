import { useState } from 'react'
import { Star } from 'lucide-react'
import { Avatar } from '../../components/ui/Avatar'
import { StarRating } from '../../components/ui/StarRating'
import { formatDateTime } from '../../lib/utils'
import type { Project, Review, UserRole } from '../../types'

/**
 * Project rating for a completed project. The client gives a 1–5 star rating
 * with an optional comment; once submitted, both parties see the review.
 */
export function RatingPanel({
  project,
  role = 'client',
  review,
  onSubmit,
}: {
  project: Project
  role?: UserRole
  review?: Review
  onSubmit: (rating: number, comment: string) => void
}) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const isClient = role === 'client'

  // Submitted review — shown to both parties.
  if (review) {
    return (
      <div className="rounded-xl border border-border bg-white p-5">
        <div className="flex items-center gap-3 mb-3">
          <Avatar name={review.reviewer_name} size="md" />
          <div>
            <p className="text-sm font-semibold text-navy">{review.reviewer_name}</p>
            <p className="text-xs text-navy/45">{formatDateTime(review.created_at)}</p>
          </div>
        </div>
        <StarRating value={review.rating} size={18} />
        {review.comment && <p className="text-sm text-navy/75 leading-relaxed mt-3">{review.comment}</p>}
      </div>
    )
  }

  // No review yet — only the client can rate.
  if (!isClient) {
    return (
      <div className="text-center py-10 text-navy/40">
        <Star className="w-9 h-9 mx-auto mb-2 opacity-40" />
        <p className="text-sm">Klien belum memberikan penilaian.</p>
      </div>
    )
  }

  return (
    <div className="space-y-5 max-w-lg">
      <div>
        <p className="text-sm font-medium text-navy mb-2">
          Beri penilaian untuk hasil kerja {project.editor_name}
        </p>
        <StarRating value={rating} interactive onChange={setRating} size={30} showValue={false} />
      </div>
      <div>
        <label className="label" htmlFor="review-comment">Komentar (opsional)</label>
        <textarea
          id="review-comment"
          rows={4}
          value={comment}
          onChange={e => setComment(e.target.value)}
          className="input resize-none"
          placeholder="Bagaimana pengalaman bekerja dengan editor ini?"
        />
      </div>
      <div className="flex justify-end">
        <button
          onClick={() => onSubmit(rating, comment.trim())}
          disabled={rating === 0}
          className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Kirim Penilaian
        </button>
      </div>
    </div>
  )
}
