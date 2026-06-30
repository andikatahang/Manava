import styled from 'styled-components'
import type { Editor } from '../../types'
import { StarRating } from '../../components/ui/StarRating'
import { SPEC_LABELS } from './specializations'
import { isAtCapacity, isAvailable } from './capacity'

function completionTextColor(rate: number): string {
  if (rate >= 90) return '#16a34a'
  if (rate >= 75) return '#ca8a04'
  return '#dc2626'
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

interface EditorCardProps {
  editor: Editor
  reviewCount: number
  onDetail?: (editor: Editor) => void
  onMessage?: (editor: Editor) => void
}

export function EditorCard({ editor, reviewCount, onDetail, onMessage }: EditorCardProps) {
  const initials = getInitials(editor.full_name)
  const isActive = editor.status === 'active'
  const available = isAvailable(editor)
  const isTopRated = available && editor.rating >= 4.7 && editor.completion_rate >= 90
  const skills = editor.specialization.slice(0, 2).map(s => SPEC_LABELS[s] ?? s).join(' · ')

  // Availability is distinct from active/inactive status: an active editor can
  // still be "full" (at capacity), an inactive editor is simply off-roster.
  const availability = !isActive
    ? { label: 'Nonaktif', cls: 'is-off' }
    : isAtCapacity(editor)
      ? { label: 'Penuh', cls: 'is-full' }
      : { label: 'Tersedia', cls: 'is-open' }

  return (
    <StyledWrapper>
      <div className={`card ${available ? '' : 'disabled'}`} aria-disabled={!available}>
        {/* Photo — bezel-less, full-bleed; shrinks on hover to reveal actions */}
        <div className="card-image">
          {editor.avatar ? (
            <img src={editor.avatar} alt={editor.full_name} width={480} height={640} loading="lazy" />
          ) : (
            <span className="initials">{initials}</span>
          )}
          <span className={`status ${isActive ? 'status-on' : 'status-off'}`}>
            <i className="dot" /> {isActive ? 'Aktif' : 'Nonaktif'}
          </span>
          {isTopRated && <p className="tag">Top Rated</p>}
        </div>

        {/* Identity + rating, anchored below the photo */}
        <div className="content">
          <h3 className="name">{editor.full_name}</h3>
          <p className="skills">{skills}</p>

          <div className="rating-row">
            <StarRating value={editor.rating} count={reviewCount} size={13} />
          </div>

          <div className="meta">
            <span className={`avail ${availability.cls}`}>
              <i className="dot" /> {availability.label}
            </span>
            <span className="completion" style={{ color: completionTextColor(editor.completion_rate) }}>
              {editor.completion_rate}% selesai
            </span>
          </div>

          {/* Revealed on hover via the photo-shrink mechanic */}
          <div className="actions">
            <button type="button" className="card-btn detail" onClick={() => onDetail?.(editor)}>
              Detail
            </button>
            <button
              type="button"
              className="card-btn pesan"
              disabled={!isActive}
              onClick={() => onMessage?.(editor)}
            >
              {isActive ? 'Pesan' : 'Tidak tersedia'}
            </button>
          </div>
        </div>
      </div>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  .card {
    width: 100%;
    display: flex;
    flex-direction: column;
    background: #e9e9e7;
    border: 1px solid rgba(2, 21, 38, 0.04);
    border-radius: 10px;
    overflow: hidden;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 1px 2px rgba(2, 21, 38, 0.04);
  }

  /* Photo zone — full bleed, no inset (bezel-less) */
  .card-image {
    position: relative;
    width: 100%;
    height: 230px;
    background: #021526;
    overflow: hidden;
  }
  .card-image img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
    transition: transform 0.5s ease;
  }
  .initials {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 2.4em;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 4px;
    padding: 12px 16px;
  }
  .name {
    font-family: 'Inter Display', 'Open Runde', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #021526;
    line-height: 1.25;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .skills {
    font-size: 12px;
    color: #596074;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .rating-row {
    margin-top: 4px;
  }

  /* Status badge (active/inactive) — top-left over the photo */
  .status {
    position: absolute;
    left: 12px;
    top: 12px;
    display: inline-flex;
    align-items: center;
    gap: 5px;
    padding: 4px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    backdrop-filter: blur(4px);
  }
  .status .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
  }
  .status-on {
    background: rgba(209, 250, 229, 0.95);
    color: #065f46;
  }
  .status-on .dot {
    background: #10b981;
  }
  .status-off {
    background: rgba(229, 231, 235, 0.95);
    color: #4b5563;
  }
  .status-off .dot {
    background: #9ca3af;
  }

  /* Availability + completion meta row */
  .meta {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 8px;
    margin-top: 4px;
    font-size: 12px;
  }
  .avail {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    font-weight: 600;
  }
  .avail .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
  }
  .is-open {
    color: #047857;
  }
  .is-open .dot {
    background: #10b981;
  }
  .is-full {
    color: #b45309;
  }
  .is-full .dot {
    background: #f59e0b;
  }
  .is-off {
    color: #6b7280;
  }
  .is-off .dot {
    background: #9ca3af;
  }
  .completion {
    font-weight: 700;
  }

  /* Buttons sit below the fold; the shrinking photo reveals them on hover */
  .actions {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-top: 10px;
  }
  .card-btn {
    height: 38px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
  }
  .card-btn.detail {
    background: transparent;
    border: 1px solid #e0e0e0;
    color: #555;
  }
  .card-btn.detail:hover {
    border-color: rgba(2, 21, 38, 0.4);
    color: #1b1b1b;
  }
  .card-btn.pesan {
    background: #021526;
    border: 1px solid #021526;
    color: #fff;
  }
  .card-btn.pesan:hover {
    background: #032b4a;
  }
  .card-btn:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
  .card-btn.pesan:disabled:hover {
    background: #021526;
  }

  /* Hover: lift the card, brighten the surface, shrink the photo to reveal actions */
  .card:hover {
    background: #fff;
    border-color: rgba(2, 21, 38, 0.09);
    box-shadow: 0 14px 44px -16px rgba(2, 21, 38, 0.18);
    transform: translateY(-4px);
  }
  .card:hover .card-image img {
    transform: scale(1.05);
  }

  /* Unavailable editors stay visible but read as disabled */
  .card.disabled {
    opacity: 0.6;
  }
  .card.disabled .card-image img {
    filter: grayscale(1);
  }
  .card.disabled:hover {
    background: #e9e9e7;
    border-color: rgba(2, 21, 38, 0.04);
    box-shadow: 0 1px 2px rgba(2, 21, 38, 0.04);
    transform: none;
  }
  .card.disabled:hover .card-image img {
    transform: none;
  }

  @media (prefers-reduced-motion: reduce) {
    .card:hover {
      transform: none;
    }
    .card:hover .card-image img {
      transform: none;
    }
  }

  .tag {
    position: absolute;
    right: 12px;
    top: 12px;
    background: rgba(254, 243, 199, 0.95);
    backdrop-filter: blur(4px);
    color: #92400e;
    padding: 4px 9px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
`

export default EditorCard
