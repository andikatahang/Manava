import type { Prisma } from '@prisma/client'
import { prisma } from '../../lib/prisma.js'
import { HttpError } from '../../middleware/errorHandler.js'

export const JOB_POSTING_SELECT = {
  job_id: true,
  title: true,
  department: true,
  position: true,
  work_type: true,
  work_system: true,
  description: true,
  min_gpa: true,
  min_education: true,
  required_skills: true,
  required_experience: true,
  specialization: true,
  status: true,
  created_by_id: true,
  created_at: true,
  updated_at: true,
  applicant_count: true,
} as const

export type JobPosting = Prisma.JobPostingGetPayload<{ select: typeof JOB_POSTING_SELECT }>

export interface CreateJobPostingInput {
  title: string
  department: string
  position: string
  work_type: 'fulltime' | 'parttime'
  work_system: 'remote' | 'hybrid' | 'onsite'
  description?: string | null
  min_gpa?: number | null
  min_education?: string | null
  required_skills: string[]
  required_experience?: string | null
  specialization: string[]
  status: 'open' | 'closed'
  created_by_id?: string
}

export interface UpdateJobPostingInput extends Partial<CreateJobPostingInput> {}

export interface JobPostingCriteria {
  min_age: number
  max_age: number
  min_education: string
  min_gpa: number
  skills: string[]
}

export function mapJobPostingToCriteria(job: JobPosting): JobPostingCriteria {
  return {
    min_age: 18,
    max_age: 35,
    min_education: job.min_education ?? 'D3',
    min_gpa: job.min_gpa ?? 3.0,
    skills: job.required_skills,
  }
}

export async function listJobPostings(includeClosed = false): Promise<JobPosting[]> {
  return prisma.jobPosting.findMany({
    where: includeClosed ? {} : { status: 'open' },
    select: JOB_POSTING_SELECT,
    orderBy: { created_at: 'desc' },
  })
}

export async function getJobPosting(job_id: string): Promise<JobPosting | null> {
  return prisma.jobPosting.findUnique({
    where: { job_id },
    select: JOB_POSTING_SELECT,
  })
}

export async function createJobPosting(input: CreateJobPostingInput): Promise<JobPosting> {
  return prisma.jobPosting.create({
    data: input,
    select: JOB_POSTING_SELECT,
  })
}

export async function updateJobPosting(job_id: string, input: UpdateJobPostingInput): Promise<JobPosting> {
  const existing = await prisma.jobPosting.findUnique({ where: { job_id } })
  if (!existing) throw new HttpError(404, 'Lowongan tidak ditemukan')
  return prisma.jobPosting.update({
    where: { job_id },
    data: input,
    select: JOB_POSTING_SELECT,
  })
}

export async function setJobPostingStatus(job_id: string, status: 'open' | 'closed'): Promise<JobPosting> {
  const existing = await prisma.jobPosting.findUnique({ where: { job_id } })
  if (!existing) throw new HttpError(404, 'Lowongan tidak ditemukan')
  return prisma.jobPosting.update({
    where: { job_id },
    data: { status },
    select: JOB_POSTING_SELECT,
  })
}

export async function deleteJobPosting(job_id: string): Promise<void> {
  const existing = await prisma.jobPosting.findUnique({ where: { job_id } })
  if (!existing) throw new HttpError(404, 'Lowongan tidak ditemukan')
  // Only allow deletion if no applications linked (or we set job_id to null on applications)
  await prisma.jobPosting.delete({ where: { job_id } })
}

export async function incrementApplicantCount(job_id: string): Promise<void> {
  await prisma.jobPosting.update({
    where: { job_id },
    data: { applicant_count: { increment: 1 } },
  })
}