import { mockDepartments } from '../data/mockData'

// Maps an applicant skill (as picked on the apply form) to its home department.
const SKILL_DEPARTMENT: Record<string, string> = {
  'Product Retouch': 'Photo Retouching',
  'Color Correction': 'Photo Retouching',
  'Portrait Retouch': 'Photo Retouching',
  'BG Removal': 'Photo Retouching',
  'Video Edit': 'Video Editing',
  'Motion Graphics': 'Video Editing',
  'Color Grading': 'Color Grading',
  'VFX': 'Color Grading',
}

export interface DeptRecommendation {
  department: string
  matched: string[] // applicant skills that pointed to this department
}

// Lightweight "AI" match: tally the applicant's skills per department and pick
// the department with the strongest overlap. Returns null when no skill maps.
export function recommendDepartment(skills: string[]): DeptRecommendation | null {
  const existing = new Set(mockDepartments.map(d => d.name))
  const tally = new Map<string, string[]>()

  for (const skill of skills) {
    const dept = SKILL_DEPARTMENT[skill]
    if (!dept || !existing.has(dept)) continue
    tally.set(dept, [...(tally.get(dept) ?? []), skill])
  }

  let best: DeptRecommendation | null = null
  for (const [department, matched] of tally) {
    if (!best || matched.length > best.matched.length) best = { department, matched }
  }
  return best
}
