import { ArrowRight } from 'lucide-react'
import styled from 'styled-components'
import type { JobApplication } from '../../lib/applications'

const STATUS_TONE: Record<string, string> = {
  new: '#d97706',
  interview: '#021526',
  approved: '#059669',
  rejected: '#dc2626',
}

function getInitials(name: string): string {
  return name.split(' ').map(p => p[0]).join('').slice(0, 2).toUpperCase()
}

interface ApplicantCardProps {
  application: JobApplication
  statusLabel: string
  onDetail: (application: JobApplication) => void
}

export function ApplicantCard({ application, statusLabel, onDetail }: ApplicantCardProps) {
  const initials = getInitials(application.full_name)
  const tone = STATUS_TONE[application.status] ?? '#64748b'

  return (
    <StyledWrapper>
      <div className="card">
        {/* Identity block — initials on navy */}
        <div className="card-image">
          <span className="initials">{initials}</span>
          <span className="tag" style={{ background: tone }}>{statusLabel}</span>
          <span className="gpa">IPK {application.gpa != null ? application.gpa.toFixed(2) : '—'}</span>
        </div>

        {/* Details */}
        <div className="content">
          <h3 className="name">{application.full_name}</h3>
          <p className="email">{application.email}</p>
          <p className="meta">
            {application.education ?? 'Pendidikan tidak terdeteksi'}
            {application.graduation_year ? ` · Lulus ${application.graduation_year}` : ''}
          </p>

          <div className="skills">
            {application.skills.length === 0 && (
              <span className="skill more">Keahlian tidak terdeteksi</span>
            )}
            {application.skills.slice(0, 3).map(s => (
              <span key={s} className="skill">{s}</span>
            ))}
            {application.skills.length > 3 && (
              <span className="skill more">+{application.skills.length - 3}</span>
            )}
          </div>

          <div className="actions">
            <button type="button" className="card-btn next" onClick={() => onDetail(application)}>
              Lihat Detail <ArrowRight className="ico" />
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
    background: #fbfbfb;
    border: 1px solid rgba(0, 0, 0, 0.05);
    border-radius: 8px;
    overflow: hidden;
    position: relative;
    transition: all 0.2s ease;
    box-shadow: 0 1px 2px rgba(2, 21, 38, 0.04);
  }

  .card-image {
    position: relative;
    width: 100%;
    height: 132px;
    background: #021526;
    overflow: hidden;
  }
  .initials {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    color: #fff;
    font-size: 2.2em;
    font-weight: 800;
    letter-spacing: 0.04em;
  }

  .tag {
    position: absolute;
    left: 12px;
    top: 12px;
    color: #fff;
    padding: 4px 10px;
    border-radius: 999px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .gpa {
    position: absolute;
    right: 12px;
    top: 12px;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(4px);
    color: #021526;
    padding: 4px 9px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
  }

  .content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    padding: 12px 16px 14px;
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
  .email {
    font-size: 12px;
    color: #596074;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }
  .meta {
    font-size: 12px;
    color: #8a90a0;
    margin-top: 1px;
  }

  .skills {
    display: flex;
    flex-wrap: wrap;
    gap: 5px;
    margin-top: 8px;
  }
  .skill {
    font-size: 11px;
    font-weight: 500;
    color: #1b1b1b;
    background: rgba(2, 21, 38, 0.05);
    border: 1px solid rgba(2, 21, 38, 0.06);
    padding: 2px 8px;
    border-radius: 999px;
  }
  .skill.more {
    color: #596074;
  }

  .actions {
    display: grid;
    grid-template-columns: 1fr;
    margin-top: 14px;
  }
  .card-btn {
    height: 38px;
    border-radius: 8px;
    font-size: 13px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 5px;
  }
  .card-btn .ico {
    width: 15px;
    height: 15px;
    transition: transform 0.2s ease;
  }
  .card-btn.next {
    background: #021526;
    border: 1px solid #021526;
    color: #fff;
  }
  .card-btn.next:hover {
    background: #032b4a;
  }
  .card-btn.next:hover .ico {
    transform: translateX(2px);
  }
  .card:hover {
    border-color: rgba(0, 0, 0, 0.1);
    box-shadow: 0 14px 44px -16px rgba(2, 21, 38, 0.18);
    transform: translateY(-2px);
  }

  @media (prefers-reduced-motion: reduce) {
    .card, .card-btn .ico { transition: none; }
    .card:hover { transform: none; }
  }
`

export default ApplicantCard
