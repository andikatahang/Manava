// Query & mutation untuk alur booking klien ⇄ editor (ruang proyek).
// Chat memakai polling ringan (refetchInterval) — cukup untuk skala demo
// tanpa menambah dependensi websocket.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '../../lib/api'
import type {
  Contract, EditorReview, InboxItem, Message, Project, Review,
  RevisionClassification, RevisionEnvelope, RevisionRequest,
} from '../../types'

export interface ProjectDetail extends Project {
  envelope: RevisionEnvelope | null
  contracts: Contract[]
  revisions: RevisionRequest[]
  reviews: Review[]
  viewer_access: 'client' | 'editor' | 'staff'
}

export function useProjectDetail(id: string | undefined) {
  return useQuery({
    queryKey: ['project', id],
    queryFn: () => api<ProjectDetail>(`/projects/${id}`),
    enabled: !!id,
    refetchInterval: 8000,
  })
}

export function useProjectMessages(id: string | undefined) {
  return useQuery({
    queryKey: ['project-messages', id],
    queryFn: () => api<Message[]>(`/projects/${id}/messages`),
    enabled: !!id,
    refetchInterval: 4000,
  })
}

export function useProjectInbox(enabled = true) {
  return useQuery({
    queryKey: ['project-inbox'],
    queryFn: () => api<InboxItem[]>('/projects/inbox'),
    enabled,
    refetchInterval: 30000,
  })
}

export function useEditorReviews(editorId: string | undefined) {
  return useQuery({
    queryKey: ['editor-reviews', editorId],
    queryFn: () => api<EditorReview[]>(`/editors/${editorId}/reviews`),
    enabled: !!editorId,
  })
}

// ── Mutations ────────────────────────────────────────────────────────────────

export function useProjectRoomMutations(projectId: string | undefined) {
  const qc = useQueryClient()
  const refresh = () => {
    void qc.invalidateQueries({ queryKey: ['project', projectId] })
    void qc.invalidateQueries({ queryKey: ['project-messages', projectId] })
    void qc.invalidateQueries({ queryKey: ['projects'] })
    void qc.invalidateQueries({ queryKey: ['project-inbox'] })
  }

  const sendMessage = useMutation({
    mutationFn: (body: string) =>
      api<Message>(`/projects/${projectId}/messages`, { method: 'POST', body: { body } }),
    onSuccess: refresh,
  })

  const sendBrief = useMutation({
    mutationFn: (input: { title: string; description: string; revision_limit: number; price: number }) =>
      api<Contract>(`/projects/${projectId}/brief`, { method: 'POST', body: input }),
    onSuccess: refresh,
  })

  const respondBrief = useMutation({
    mutationFn: (approve: boolean) =>
      api<{ contract: Contract; project_status: string }>(
        `/projects/${projectId}/brief/respond`,
        { method: 'POST', body: { approve } },
      ),
    onSuccess: refresh,
  })

  const sendDeliverable = useMutation({
    mutationFn: (input: { note: string; attachment?: string }) =>
      api<Message>(`/projects/${projectId}/deliverable`, { method: 'POST', body: input }),
    onSuccess: refresh,
  })

  const classifyRevision = useMutation({
    mutationFn: (request_text: string) =>
      api<RevisionClassification>(
        `/projects/${projectId}/revisions/classify`,
        { method: 'POST', body: { request_text } },
      ),
  })

  const submitRevision = useMutation({
    mutationFn: (input: {
      request_text: string
      ai_label: 'minor' | 'major' | 'uncertain'
      ai_confidence: number
      ai_summary: string
    }) => api<RevisionRequest>(`/projects/${projectId}/revisions`, { method: 'POST', body: input }),
    onSuccess: refresh,
  })

  const completeProject = useMutation({
    mutationFn: () => api<Project>(`/projects/${projectId}/complete`, { method: 'POST' }),
    onSuccess: refresh,
  })

  const submitReview = useMutation({
    mutationFn: (input: { rating: number; comment: string }) =>
      api<Review>(`/projects/${projectId}/review`, { method: 'POST', body: input }),
    onSuccess: () => {
      refresh()
      // Rating editor & KPI berubah — daftar editor perlu data terbaru.
      void qc.invalidateQueries({ queryKey: ['editors'] })
      void qc.invalidateQueries({ queryKey: ['editor-reviews'] })
    },
  })

  return {
    sendMessage, sendBrief, respondBrief, sendDeliverable,
    classifyRevision, submitRevision, completeProject, submitReview,
  }
}

// Klien membuka ruang diskusi baru dengan editor dari halaman Cari Editor.
export function useStartBooking() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (input: { editor_id: string; note?: string }) =>
      api<Project>('/projects', { method: 'POST', body: input }),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['projects'] })
      void qc.invalidateQueries({ queryKey: ['editors'] })
    },
  })
}
