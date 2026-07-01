import { User, ArrowRight } from 'lucide-react'
import styled from 'styled-components'
import { StatusBadge } from '../../components/ui/Badge'
import {
  STAGES, completedStages, progressPercent, progressColor,
  attentionFor, projectCategory,
} from './lifecycle'
import type { Project } from '../../types'

const TONE_DOT: Record<string, string> = {
  amber: '#d97706',
  navy: '#021526',
  red: '#dc2626',
  emerald: '#059669',
}

interface ClientProjectCardProps {
  project: Project
  onDetail: (project: Project) => void
  /** Person shown under the title — defaults to the editor (client's view). */
  personName?: string
  personLabel?: string
}

export function ClientProjectCard({ project, onDetail, personName, personLabel }: ClientProjectCardProps) {
  const { Icon, label } = projectCategory(project.title)
  const person = personName ?? project.editor_name
  const pct = progressPercent(project.status)
  const color = progressColor(project.status)
  const done = completedStages(project.status)
  const stageLabel = project.status === 'completed'
    ? 'Selesai'
    : STAGES[Math.min(done, STAGES.length - 1)]
  const attention = attentionFor(project.status)

  return (
    <StyledWrapper>
      <div className="card" onClick={() => onDetail(project)}>
        {/* Media — bezel-less project type marker */}
        <div className="card-image">
          <span className="type">
            <Icon className="type-icon" />
            <span className="type-label">{label}</span>
          </span>
          <span className="status">
            <StatusBadge status={project.status} />
          </span>
        </div>

        <div className="content">
          <h3 className="title">{project.title}</h3>
          <p className="editor" title={personLabel ? `${personLabel}: ${person}` : person}>
            <User className="editor-icon" />
            {person}
          </p>

          {/* Progress line */}
          <div className="progress">
            <div className="progress-head">
              <span className="stage">{stageLabel}</span>
              <span className="pct" style={{ color }}>{pct}%</span>
            </div>
            <div className="track">
              <span className="fill" style={{ width: `${pct}%`, background: color }} />
            </div>
          </div>

          {/* Next action, if any */}
          {attention && (
            <p className="attention">
              <span className="dot" style={{ background: TONE_DOT[attention.tone] }} />
              {attention.label}
            </p>
          )}

          {/* Spacer keeps the CTA pinned to the bottom so cards stay equal height. */}
          <div className="grow" aria-hidden />

          <button
            type="button"
            className="detail-btn"
            onClick={e => { e.stopPropagation(); onDetail(project) }}
          >
            Detail proyek <ArrowRight className="btn-icon" />
          </button>
        </div>
      </div>
    </StyledWrapper>
  )
}

const StyledWrapper = styled.div`
  height: 100%;

  .card {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    background: #fff;
    border: 1px solid rgba(2, 21, 38, 0.07);
    border-radius: 16px;
    overflow: hidden;
    position: relative;
    cursor: pointer;
    transition: transform 0.25s ease, box-shadow 0.25s ease, border-color 0.25s ease;
    box-shadow: 0 1px 2px rgba(2, 21, 38, 0.04);
  }

  /* Media zone — project type on navy */
  .card-image {
    position: relative;
    width: 100%;
    height: 132px;
    background: #021526;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .type {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 8px;
    color: rgba(255, 255, 255, 0.92);
    transition: transform 0.4s ease;
  }
  .type-icon {
    width: 34px;
    height: 34px;
    stroke-width: 1.5;
  }
  .type-label {
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.18em;
    color: rgba(255, 255, 255, 0.6);
  }
  .status {
    position: absolute;
    right: 12px;
    top: 12px;
  }

  .content {
    flex: 1;
    display: flex;
    flex-direction: column;
    padding: 16px;
  }
  /* Absorbs leftover space so every card's CTA lines up at the bottom. */
  .grow {
    flex: 1 1 auto;
    min-height: 0;
  }
  .title {
    font-family: 'Inter Display', 'Open Runde', sans-serif;
    font-size: 15px;
    font-weight: 600;
    letter-spacing: -0.01em;
    color: #021526;
    line-height: 1.3;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
    overflow: hidden;
    min-height: 39px;
  }
  .editor {
    display: flex;
    align-items: center;
    gap: 5px;
    margin-top: 4px;
    font-size: 12px;
    color: #596074;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .editor-icon {
    width: 12px;
    height: 12px;
    flex-shrink: 0;
  }

  .progress {
    margin-top: 14px;
  }
  .progress-head {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    margin-bottom: 6px;
  }
  .stage {
    font-size: 12px;
    font-weight: 600;
    color: #021526;
  }
  .pct {
    font-size: 12px;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  .track {
    height: 6px;
    background: rgba(2, 21, 38, 0.07);
    border-radius: 999px;
    overflow: hidden;
  }
  .fill {
    display: block;
    height: 100%;
    border-radius: 999px;
    transition: width 0.4s ease;
  }

  .attention {
    display: flex;
    align-items: center;
    gap: 6px;
    margin-top: 12px;
    font-size: 12px;
    font-weight: 500;
    color: #475063;
  }
  .dot {
    width: 6px;
    height: 6px;
    border-radius: 999px;
    flex-shrink: 0;
  }

  .detail-btn {
    margin-top: 16px;
    height: 40px;
    width: 100%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    border-radius: 10px;
    background: #021526;
    border: 1px solid #021526;
    color: #fff;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.2s ease;
  }
  .detail-btn:hover {
    background: #032b4a;
  }
  .btn-icon {
    width: 15px;
    height: 15px;
    transition: transform 0.2s ease;
  }
  .detail-btn:hover .btn-icon {
    transform: translateX(2px);
  }

  .card:hover {
    border-color: rgba(2, 21, 38, 0.12);
    box-shadow: 0 16px 40px -20px rgba(2, 21, 38, 0.28);
    transform: translateY(-3px);
  }
  .card:hover .type {
    transform: scale(1.06);
  }

  @media (prefers-reduced-motion: reduce) {
    .card, .type, .fill, .btn-icon { transition: none; }
    .card:hover { transform: none; }
    .card:hover .type { transform: none; }
  }
`

export default ClientProjectCard
