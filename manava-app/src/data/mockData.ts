import type { User, Editor, Applicant, JobPosting, Project, Dispute, EditorMetrics, Payslip, AttendanceRecord, LeaveRequest, EscrowAccount, Transaction, Message, RevisionRequest, RevisionEnvelope, Review } from '../types'

export const currentUser: User = {
  user_id: 'u1',
  full_name: 'Ahmad Superadmin',
  email: 'admin@manava.id',
  role: 'superadmin',
  is_active: true,
}

export const mockUsers: Record<string, User> = {
  superadmin: { user_id: 'u1', full_name: 'Ahmad Superadmin', email: 'admin@manava.id', role: 'superadmin', is_active: true },
  hr_admin: { user_id: 'u11', full_name: 'Hasna HR Admin', email: 'hasna@manava.id', role: 'hr_admin', is_active: true },
  editor: { user_id: 'u2', full_name: 'Budi Editor', email: 'budi@manava.id', role: 'editor', is_active: true },
  client: { user_id: 'u3', full_name: 'Citra Client', email: 'citra@client.com', role: 'client', is_active: true },
  mediator: { user_id: 'u4', full_name: 'Dewi Mediator', email: 'dewi@manava.id', role: 'mediator', is_active: true },
  admin_manager: { user_id: 'u5', full_name: 'Eko Manager', email: 'eko@manava.id', role: 'admin_manager', is_active: true },
  finance: { user_id: 'u6', full_name: 'Fani Finance', email: 'fani@manava.id', role: 'finance', is_active: true },
}

/**
 * Maximum concurrent active projects per editor. An editor at or above this
 * count is considered "full" (unavailable for new work). Single source of
 * truth for both the roster's availability display and the booking capacity
 * check.
 */
export const EDITOR_CAPACITY = 2

export const mockEditors: Editor[] = [
  { editor_id: 'e1', user_id: 'u2', full_name: 'Budi Santoso', email: 'budi@manava.id', department: 'Photo Retouching', specialization: ['product_retouch', 'color_correction'], base_salary: 8000000, status: 'active', onboarded_at: '2026-01-15', rating: 4.8, completion_rate: 94, active_projects: 2, performance_band: 'excellent', avatar: 'https://i.pravatar.cc/480?img=12' },
  { editor_id: 'e2', user_id: 'u7', full_name: 'Sari Dewi', email: 'sari@manava.id', department: 'Video Editing', specialization: ['video_edit', 'color_grading'], base_salary: 9000000, status: 'active', onboarded_at: '2026-02-01', rating: 4.5, completion_rate: 88, active_projects: 1, performance_band: 'good', avatar: 'https://i.pravatar.cc/480?img=47' },
  { editor_id: 'e3', user_id: 'u8', full_name: 'Andi Kurniawan', email: 'andi@manava.id', department: 'Photo Retouching', specialization: ['portrait_retouch', 'background_removal'], base_salary: 7500000, status: 'active', onboarded_at: '2026-03-10', rating: 3.9, completion_rate: 75, active_projects: 3, performance_band: 'good', avatar: 'https://i.pravatar.cc/480?img=33' },
  { editor_id: 'e4', user_id: 'u9', full_name: 'Maya Putri', email: 'maya@manava.id', department: 'Color Grading', specialization: ['color_grading', 'vfx'], base_salary: 10000000, status: 'active', onboarded_at: '2026-01-05', rating: 4.9, completion_rate: 97, active_projects: 2, performance_band: 'excellent', avatar: 'https://i.pravatar.cc/480?img=45' },
  { editor_id: 'e5', user_id: 'u10', full_name: 'Rizky Hakim', email: 'rizky@manava.id', department: 'Video Editing', specialization: ['video_edit', 'motion_graphics'], base_salary: 8500000, status: 'suspended', onboarded_at: '2026-02-20', rating: 2.8, completion_rate: 60, active_projects: 0, performance_band: 'needs_improvement', avatar: 'https://i.pravatar.cc/480?img=51' },
]

export const mockJobPostings: JobPosting[] = [
  { job_id: 'j1', title: 'Senior Photo Retoucher', specialization: ['product_retouch', 'color_correction'], status: 'open', created_at: '2026-06-01', applicant_count: 8 },
  { job_id: 'j2', title: 'Video Editor - E-commerce', specialization: ['video_edit', 'motion_graphics'], status: 'open', created_at: '2026-06-10', applicant_count: 5 },
  { job_id: 'j3', title: 'Junior Color Grader', specialization: ['color_grading'], status: 'closed', created_at: '2026-05-15', applicant_count: 12 },
]

export const mockApplicants: Applicant[] = [
  { applicant_id: 'a1', job_id: 'j1', name: 'Fajar Nugroho', email: 'fajar@mail.com', tahap: 'applied', portfolio_url: 'https://portfolio.fajar.com', created_at: '2026-06-12', avatar: 'https://i.pravatar.cc/480?img=15' },
  { applicant_id: 'a2', job_id: 'j1', name: 'Lina Sari', email: 'lina@mail.com', tahap: 'screening', score: 78, portfolio_url: 'https://linasari.com', created_at: '2026-06-11', avatar: 'https://i.pravatar.cc/480?img=20' },
  { applicant_id: 'a3', job_id: 'j1', name: 'Hendra Wijaya', email: 'hendra@mail.com', tahap: 'interview', score: 85, portfolio_url: 'https://hendra.portfolio.id', created_at: '2026-06-10', avatar: 'https://i.pravatar.cc/480?img=8' },
  { applicant_id: 'a4', job_id: 'j1', name: 'Nita Amalia', email: 'nita@mail.com', tahap: 'offered', score: 91, portfolio_url: 'https://nita.design', created_at: '2026-06-08', avatar: 'https://i.pravatar.cc/480?img=23' },
  { applicant_id: 'a5', job_id: 'j1', name: 'Bagas Prasetyo', email: 'bagas@mail.com', tahap: 'offer_accepted', score: 91, portfolio_url: 'https://bagas.com', created_at: '2026-06-05', offer_accepted_at: '2026-06-18', avatar: 'https://i.pravatar.cc/480?img=60' },
  { applicant_id: 'a6', job_id: 'j2', name: 'Candra Halim', email: 'candra@mail.com', tahap: 'applied', portfolio_url: 'https://candra.film', created_at: '2026-06-14', avatar: 'https://i.pravatar.cc/480?img=68' },
  { applicant_id: 'a7', job_id: 'j2', name: 'Putri Rahayu', email: 'putri@mail.com', tahap: 'screening', score: 72, portfolio_url: 'https://putri.edit.id', created_at: '2026-06-13', avatar: 'https://i.pravatar.cc/480?img=32' },
  { applicant_id: 'a8', job_id: 'j1', name: 'Wahyu Hidayat', email: 'wahyu@mail.com', tahap: 'rejected', portfolio_url: 'https://wahyu.com', created_at: '2026-06-09', avatar: 'https://i.pravatar.cc/480?img=51' },
]

export const mockProjects: Project[] = [
  { project_id: 'p1', client_id: 'u3', client_name: 'Citra Client', editor_id: 'e1', editor_name: 'Budi Santoso', title: 'Product Catalog Retouch - Tokopedia', description: '20 foto produk, gaya e-commerce bersih, latar putih', status: 'in_review', dp_amount: 1000000, final_amount: 1000000, project_value: 2000000, started_at: '2026-06-10', created_at: '2026-06-08' },
  { project_id: 'p2', client_id: 'u11', client_name: 'Zara Fashion', editor_id: 'e2', editor_name: 'Sari Dewi', title: 'Fashion Campaign Video Edit', description: 'Edit video 2 menit penuh dengan color grade', status: 'in_progress', dp_amount: 3000000, final_amount: 3000000, project_value: 6000000, started_at: '2026-06-15', created_at: '2026-06-14' },
  { project_id: 'p3', client_id: 'u12', client_name: 'Bintang Studio', editor_id: 'e4', editor_name: 'Maya Putri', title: 'Wedding Film Color Grade', description: 'Film pernikahan 90 menit, color grade sinematik', status: 'completed', dp_amount: 4000000, final_amount: 4000000, project_value: 8000000, started_at: '2026-05-20', completed_at: '2026-06-10', created_at: '2026-05-18' },
  { project_id: 'p4', client_id: 'u3', client_name: 'Citra Client', editor_id: 'e3', editor_name: 'Andi Kurniawan', title: 'Portrait Session Retouch', description: '15 foto potret, retouch kulit natural', status: 'revision', dp_amount: 800000, final_amount: 800000, project_value: 1600000, started_at: '2026-06-18', created_at: '2026-06-17' },
  { project_id: 'p5', client_id: 'u13', client_name: 'Mega Corp', editor_id: 'e1', editor_name: 'Budi Santoso', title: 'Corporate Headshots Batch', description: '50 headshot, tampilan profesional bersih', status: 'disputed', dp_amount: 2000000, final_amount: 2000000, project_value: 4000000, started_at: '2026-06-05', created_at: '2026-06-03' },
  { project_id: 'p6', client_id: 'u14', client_name: 'HomeDecor ID', editor_id: 'e2', editor_name: 'Sari Dewi', title: 'Product Video - Furniture Line', description: '5 video produk, masing-masing 30 detik', status: 'awaiting_dp', dp_amount: 2500000, final_amount: 2500000, project_value: 5000000, created_at: '2026-06-22' },
  { project_id: 'p7', client_id: 'u15', client_name: 'Lazada Official', editor_id: 'e1', editor_name: 'Budi Santoso', title: 'E-commerce Lifestyle Retouch', description: '30 foto lifestyle produk fashion, warna cerah konsisten', status: 'in_progress', dp_amount: 1500000, final_amount: 1500000, project_value: 3000000, started_at: '2026-06-20', created_at: '2026-06-19' },
  { project_id: 'p8', client_id: 'u16', client_name: 'Glow Beauty', editor_id: 'e1', editor_name: 'Budi Santoso', title: 'Skincare Product Set Retouch', description: '12 foto produk skincare, latar gradient lembut', status: 'revision', dp_amount: 900000, final_amount: 900000, project_value: 1800000, started_at: '2026-06-21', created_at: '2026-06-20' },
]

export const mockDisputes: Dispute[] = [
  { dispute_id: 'd1', project_id: 'p5', project_title: 'Corporate Headshots Batch', client_name: 'Mega Corp', editor_name: 'Budi Santoso', opened_by: 'Mega Corp', opened_by_role: 'client', reason: 'AI mengklasifikasi revisi sebagai MAJOR padahal jelas hanya penyesuaian warna minor dalam lingkup brief asli', status: 'in_mediation', opened_at: '2026-06-20T09:30:00', sla_deadline: '2026-06-22T09:30:00' },
  { dispute_id: 'd2', project_id: 'p4', project_title: 'Portrait Session Retouch', client_name: 'Citra Client', editor_name: 'Andi Kurniawan', opened_by: 'Andi Kurniawan', opened_by_role: 'editor', reason: 'Klien tidak merespons selama 9 hari. Perlu penyelesaian untuk melanjutkan.', status: 'open', opened_at: '2026-06-23T14:00:00', sla_deadline: '2026-06-25T14:00:00' },
  { dispute_id: 'd3', project_id: 'p6', project_title: 'Product Video - Furniture Line', client_name: 'HomeDecor ID', editor_name: 'Sari Dewi', opened_by: 'HomeDecor ID', opened_by_role: 'client', reason: 'Kualitas hasil kerja tidak sesuai brief. Warnanya meleset.', status: 'resolved', resolution_type: 'free_revision', resolution_note: 'Setelah meninjau brief dan hasil kerja, deviasi warna menjadi tanggung jawab editor. Revisi gratis diberikan.', opened_at: '2026-06-15T10:00:00', resolved_at: '2026-06-17T09:00:00', sla_deadline: '2026-06-17T10:00:00' },
]

// Client reviews of completed projects. Seeded empty so the rating form is the
// entry point on a completed project; submitting adds a review at runtime.
export const mockReviews: Review[] = []

export const mockEditorMetrics: EditorMetrics[] = [
  { editor_id: 'e1', editor_name: 'Budi Santoso', avg_client_rating: 4.8, completion_rate: 94, manager_rating: 4.5, kpi_average: 4.7, performance_band: 'excellent' },
  { editor_id: 'e2', editor_name: 'Sari Dewi', avg_client_rating: 4.5, completion_rate: 88, manager_rating: 4.2, kpi_average: 4.3, performance_band: 'excellent' },
  { editor_id: 'e3', editor_name: 'Andi Kurniawan', avg_client_rating: 3.9, completion_rate: 75, manager_rating: 3.5, kpi_average: 3.7, performance_band: 'good' },
  { editor_id: 'e4', editor_name: 'Maya Putri', avg_client_rating: 4.9, completion_rate: 97, manager_rating: 4.8, kpi_average: 4.9, performance_band: 'excellent' },
  { editor_id: 'e5', editor_name: 'Rizky Hakim', avg_client_rating: 2.8, completion_rate: 60, manager_rating: 2.5, kpi_average: 2.6, performance_band: 'needs_improvement' },
]

export const mockPayslips: Payslip[] = [
  { payslip_id: 'ps1', editor_id: 'e1', editor_name: 'Budi Santoso', period_start: '2026-06-01', period_end: '2026-06-30', base_salary: 8000000, attendance_deduction: 0, project_bonus: 800000, reimbursement_total: 0, net_salary: 8800000, status: 'paid', generated_at: '2026-07-01T00:00:00' },
  { payslip_id: 'ps2', editor_id: 'e2', editor_name: 'Sari Dewi', period_start: '2026-06-01', period_end: '2026-06-30', base_salary: 9000000, attendance_deduction: 300000, project_bonus: 600000, reimbursement_total: 0, net_salary: 9300000, status: 'paid', generated_at: '2026-07-01T00:00:00' },
  { payslip_id: 'ps3', editor_id: 'e3', editor_name: 'Andi Kurniawan', period_start: '2026-06-01', period_end: '2026-06-30', base_salary: 7500000, attendance_deduction: 500000, project_bonus: 160000, reimbursement_total: 0, net_salary: 7160000, status: 'finalized', generated_at: '2026-07-01T00:00:00' },
  // Budi Santoso (e1) — previous months, for the self-service history view
  { payslip_id: 'ps1-may', editor_id: 'e1', editor_name: 'Budi Santoso', period_start: '2026-05-01', period_end: '2026-05-31', base_salary: 8000000, attendance_deduction: 200000, project_bonus: 600000, reimbursement_total: 150000, net_salary: 8550000, status: 'paid', generated_at: '2026-06-01T00:00:00' },
  { payslip_id: 'ps1-apr', editor_id: 'e1', editor_name: 'Budi Santoso', period_start: '2026-04-01', period_end: '2026-04-30', base_salary: 8000000, attendance_deduction: 0, project_bonus: 400000, reimbursement_total: 0, net_salary: 8400000, status: 'paid', generated_at: '2026-05-01T00:00:00' },
]

export const mockAttendance: AttendanceRecord[] = [
  { date: '2026-06-02', clock_in: '08:02', clock_out: '17:05', status: 'present' },
  { date: '2026-06-03', clock_in: '08:15', clock_out: '17:00', status: 'present' },
  { date: '2026-06-04', clock_in: '08:00', clock_out: '17:10', status: 'present' },
  { date: '2026-06-05', clock_in: '09:30', clock_out: '17:00', status: 'partial' },
  { date: '2026-06-06', status: 'absent' },
  { date: '2026-06-09', clock_in: '08:05', clock_out: '17:00', status: 'present' },
  { date: '2026-06-10', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-06-11', status: 'leave' },
  { date: '2026-06-12', status: 'leave' },
  { date: '2026-06-13', clock_in: '08:10', clock_out: '17:05', status: 'present' },
  { date: '2026-06-16', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-06-17', clock_in: '08:05', clock_out: '17:10', status: 'present' },
  { date: '2026-06-18', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-06-19', clock_in: '08:20', clock_out: '17:00', status: 'present' },
  { date: '2026-06-20', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-06-23', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-06-24', clock_in: '08:05', clock_out: '17:00', status: 'present' },
  { date: '2026-06-25', clock_in: '08:00', status: 'present' },
  // May 2026 — previous month, surfaced in the attendance history view
  { date: '2026-05-04', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-05-05', clock_in: '08:10', clock_out: '17:05', status: 'present' },
  { date: '2026-05-06', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-05-07', clock_in: '09:20', clock_out: '17:00', status: 'partial' },
  { date: '2026-05-08', status: 'absent' },
  { date: '2026-05-11', clock_in: '08:05', clock_out: '17:00', status: 'present' },
  { date: '2026-05-12', clock_in: '08:00', clock_out: '17:10', status: 'present' },
  { date: '2026-05-13', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-05-14', status: 'leave' },
  { date: '2026-05-15', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-05-19', clock_in: '08:02', clock_out: '17:00', status: 'present' },
  { date: '2026-05-20', clock_in: '08:00', clock_out: '17:00', status: 'present' },
  { date: '2026-05-21', clock_in: '08:08', clock_out: '17:05', status: 'present' },
  { date: '2026-05-22', clock_in: '08:00', clock_out: '17:00', status: 'present' },
]

export const mockLeaveRequests: LeaveRequest[] = [
  { leave_id: 'l1', editor_id: 'e1', editor_name: 'Budi Santoso', leave_type: 'cuti', start_date: '2026-06-11', end_date: '2026-06-12', status: 'approved', created_at: '2026-06-09' },
  { leave_id: 'l2', editor_id: 'e3', editor_name: 'Andi Kurniawan', leave_type: 'izin', start_date: '2026-06-26', end_date: '2026-06-26', status: 'pending', created_at: '2026-06-24' },
  { leave_id: 'l3', editor_id: 'e2', editor_name: 'Sari Dewi', leave_type: 'cuti', start_date: '2026-07-14', end_date: '2026-07-18', status: 'pending', created_at: '2026-06-23' },
]

export const mockEscrowAccounts: EscrowAccount[] = [
  { escrow_id: 'es1', project_id: 'p1', project_title: 'Product Catalog Retouch - Tokopedia', client_name: 'Citra Client', held_balance: 1000000, released_balance: 0, refunded_balance: 0, updated_at: '2026-06-10' },
  { escrow_id: 'es2', project_id: 'p2', project_title: 'Fashion Campaign Video Edit', client_name: 'Zara Fashion', held_balance: 3000000, released_balance: 0, refunded_balance: 0, updated_at: '2026-06-15' },
  { escrow_id: 'es3', project_id: 'p3', project_title: 'Wedding Film Color Grade', client_name: 'Bintang Studio', held_balance: 0, released_balance: 8000000, refunded_balance: 0, updated_at: '2026-06-10' },
  { escrow_id: 'es4', project_id: 'p5', project_title: 'Corporate Headshots Batch', client_name: 'Mega Corp', held_balance: 2000000, released_balance: 0, refunded_balance: 0, updated_at: '2026-06-05' },
]

export const mockTransactions: Transaction[] = [
  { transaction_id: 't1', project_id: 'p1', project_title: 'Product Catalog Retouch', type: 'dp_payment', amount: 1000000, status: 'success', created_at: '2026-06-10T10:30:00' },
  { transaction_id: 't2', project_id: 'p2', project_title: 'Fashion Campaign Video Edit', type: 'dp_payment', amount: 3000000, status: 'success', created_at: '2026-06-15T14:00:00' },
  { transaction_id: 't3', project_id: 'p3', project_title: 'Wedding Film Color Grade', type: 'dp_payment', amount: 4000000, status: 'success', created_at: '2026-05-20T09:00:00' },
  { transaction_id: 't4', project_id: 'p3', project_title: 'Wedding Film Color Grade', type: 'final_payment', amount: 4000000, status: 'success', created_at: '2026-06-10T16:00:00' },
  { transaction_id: 't5', project_id: 'p3', project_title: 'Wedding Film Color Grade', type: 'escrow_release', amount: 8000000, status: 'success', created_at: '2026-06-10T16:01:00' },
  { transaction_id: 't6', project_id: 'p4', project_title: 'Portrait Session Retouch', type: 'dp_payment', amount: 800000, status: 'success', created_at: '2026-06-18T11:00:00' },
  { transaction_id: 't7', project_id: 'p5', project_title: 'Corporate Headshots Batch', type: 'dp_payment', amount: 2000000, status: 'success', created_at: '2026-06-05T09:00:00' },
]

export const mockMessages: Message[] = [
  { message_id: 'm1', project_id: 'p1', sender_id: 'u3', sender_name: 'Citra Client', sender_role: 'client', body: 'Halo, saya butuh 20 foto produk diretouch untuk toko Tokopedia saya. Latar putih bersih, warna akurat.', message_type: 'text', created_at: '2026-06-08T09:00:00' },
  { message_id: 'm2', project_id: 'p1', sender_id: 'u2', sender_name: 'Budi Santoso', sender_role: 'editor', body: 'Tentu! Saya bisa. Saya buatkan draf brief untuk Anda tinjau.', message_type: 'text', created_at: '2026-06-08T09:15:00' },
  { message_id: 'm3', project_id: 'p1', sender_id: 'u2', sender_name: 'Budi Santoso', sender_role: 'editor', body: 'Draf brief sudah siap. Mohon tinjau lingkup dan revision envelope-nya.', message_type: 'brief', created_at: '2026-06-08T10:00:00' },
  { message_id: 'm4', project_id: 'p1', sender_id: 'u3', sender_name: 'Citra Client', sender_role: 'client', body: 'Bagus! Bisakah revisi gratis ditambah dari 3 ke 5?', message_type: 'text', created_at: '2026-06-08T10:30:00' },
  { message_id: 'm5', project_id: 'p1', sender_id: 'u2', sender_name: 'Budi Santoso', sender_role: 'editor', body: 'Diperbarui jadi 5 revisi gratis. Brief dikirim ulang.', message_type: 'brief', created_at: '2026-06-08T11:00:00' },
  { message_id: 'm6', project_id: 'p1', sender_id: 'u3', sender_name: 'Citra Client', sender_role: 'client', body: 'Disetujui! Saya bayar deposit sekarang.', message_type: 'text', created_at: '2026-06-08T11:15:00' },
  { message_id: 'm7', project_id: 'p1', sender_id: 'system', sender_name: 'Sistem', sender_role: 'superadmin', body: 'Pembayaran DP diterima (Rp 1.000.000). Proyek kini BERJALAN.', message_type: 'system', created_at: '2026-06-08T11:20:00' },
  { message_id: 'm8', project_id: 'p1', sender_id: 'u2', sender_name: 'Budi Santoso', sender_role: 'editor', body: 'Semua 20 foto sudah diretouch dan siap ditinjau. Pratinjau berwatermark terlampir.', message_type: 'deliverable', created_at: '2026-06-13T15:00:00' },
  { message_id: 'm9', project_id: 'p1', sender_id: 'u3', sender_name: 'Citra Client', sender_role: 'client', body: 'Foto #7 ada sedikit semburat warna. Bisa diperbaiki?', message_type: 'revision_request', created_at: '2026-06-14T09:00:00' },
  { message_id: 'm10', project_id: 'p1', sender_id: 'system', sender_name: 'Sistem AI', sender_role: 'superadmin', body: 'Analisis AI: Revisi diklasifikasi sebagai MINOR (keyakinan: 88%). Dalam lingkup included. ALLOWANCE terpakai: 1/5.', message_type: 'ai_summary', created_at: '2026-06-14T09:01:00' },
]

export const mockRevisions: RevisionRequest[] = [
  { revision_id: 'r1', project_id: 'p1', request_text: 'Foto #7 ada sedikit semburat warna pada produk. Mohon perbaiki white balance.', ai_label: 'minor', ai_confidence: 0.88, final_label: 'minor', price: 0, status: 'accepted', created_at: '2026-06-14T09:00:00' },
  { revision_id: 'r2', project_id: 'p4', request_text: 'Tambahkan konsep latar yang benar-benar berbeda dengan suasana alam luar ruangan', ai_label: 'major', ai_confidence: 0.95, final_label: 'major', price: 320000, status: 'awaiting_topup', created_at: '2026-06-22T10:00:00' },
  { revision_id: 'r3', project_id: 'p5', request_text: 'Sesuaikan pencahayaan agar lebih lembut pada semua 50 headshot', ai_label: 'minor', ai_confidence: 0.72, final_label: undefined, status: 'disputed', created_at: '2026-06-19T14:00:00' },
  { revision_id: 'r4', project_id: 'p3', request_text: 'Tingkatkan kehangatan pada adegan upacara sebesar 10–15%.', ai_label: 'minor', ai_confidence: 0.91, final_label: 'minor', price: 0, status: 'resubmitted', created_at: '2026-06-01T10:00:00' },
  { revision_id: 'r5', project_id: 'p3', request_text: 'Turunkan kontras pada rekaman resepsi — klien lebih suka tampilan film matte.', ai_label: 'minor', ai_confidence: 0.84, final_label: 'minor', price: 0, status: 'resolved', created_at: '2026-06-05T11:00:00' },
]

export const mockRevisionEnvelopes: RevisionEnvelope[] = [
  { envelope_id: 'env1', project_id: 'p1', included_scope: 'Koreksi warna, white balance, penghapusan noda minor, pembersihan latar untuk semua 20 foto', excluded_scope: 'Penggantian latar penuh, penambahan/penghapusan objek, perombakan tekstur kulit', allowance_count: 5, allowance_consumed: 1 },
  { envelope_id: 'env2', project_id: 'p2', included_scope: 'Color grading, sinkronisasi audio, potongan & transisi dasar, kartu judul sesuai panduan merek', excluded_scope: 'Pembuatan motion graphics, VFX, pengambilan ulang rekaman, restrukturisasi besar', allowance_count: 3, allowance_consumed: 0 },
  { envelope_id: 'env3', project_id: 'p3', included_scope: 'Color grade sinematik, koreksi eksposur, pemulihan highlight/shadow untuk seluruh film 90 menit', excluded_scope: 'Perubahan musik latar, efek video, potongan adegan, pengambilan ulang', allowance_count: 3, allowance_consumed: 2 },
  { envelope_id: 'env4', project_id: 'p4', included_scope: 'Retouch kulit natural, penghapusan noda, pencerahan halus untuk 15 potret', excluded_scope: 'Perubahan latar, kerja komposit, manipulasi berat, pembentukan ulang tubuh', allowance_count: 3, allowance_consumed: 2 },
  { envelope_id: 'env5', project_id: 'p5', included_scope: 'Retouch headshot profesional: warna kulit, penajaman mata, pengurangan kerutan pakaian untuk 50 foto', excluded_scope: 'Penggantian rambut, ganti latar, pembentukan ulang tubuh, menambah/menghapus subjek', allowance_count: 3, allowance_consumed: 3 },
  { envelope_id: 'env6', project_id: 'p6', included_scope: 'Edit video produk, pencocokan warna ke panduan merek, overlay logo untuk 5 video (30 detik masing-masing)', excluded_scope: 'Rendering 3D, infografis animasi, produksi sulih suara, pengambilan ulang', allowance_count: 3, allowance_consumed: 0 },
]

export interface KpiSnapshot {
  editor_id: string
  quarter: string
  avg_client_rating: number
  completion_rate: number
  manager_rating: number
  kpi_average: number
}

export const mockKpiHistory: KpiSnapshot[] = [
  // Budi Santoso – consistent excellent
  { editor_id: 'e1', quarter: 'Q3 2025', avg_client_rating: 4.5, completion_rate: 88, manager_rating: 4.2, kpi_average: 4.3 },
  { editor_id: 'e1', quarter: 'Q4 2025', avg_client_rating: 4.6, completion_rate: 91, manager_rating: 4.3, kpi_average: 4.5 },
  { editor_id: 'e1', quarter: 'Q1 2026', avg_client_rating: 4.7, completion_rate: 93, manager_rating: 4.4, kpi_average: 4.6 },
  { editor_id: 'e1', quarter: 'Q2 2026', avg_client_rating: 4.8, completion_rate: 94, manager_rating: 4.5, kpi_average: 4.7 },
  // Sari Dewi – improving
  { editor_id: 'e2', quarter: 'Q3 2025', avg_client_rating: 3.9, completion_rate: 78, manager_rating: 3.8, kpi_average: 3.8 },
  { editor_id: 'e2', quarter: 'Q4 2025', avg_client_rating: 4.1, completion_rate: 82, manager_rating: 4.0, kpi_average: 4.0 },
  { editor_id: 'e2', quarter: 'Q1 2026', avg_client_rating: 4.3, completion_rate: 85, manager_rating: 4.1, kpi_average: 4.2 },
  { editor_id: 'e2', quarter: 'Q2 2026', avg_client_rating: 4.5, completion_rate: 88, manager_rating: 4.2, kpi_average: 4.3 },
  // Andi Kurniawan – stable mid
  { editor_id: 'e3', quarter: 'Q3 2025', avg_client_rating: 3.8, completion_rate: 72, manager_rating: 3.4, kpi_average: 3.6 },
  { editor_id: 'e3', quarter: 'Q4 2025', avg_client_rating: 3.9, completion_rate: 74, manager_rating: 3.5, kpi_average: 3.7 },
  { editor_id: 'e3', quarter: 'Q1 2026', avg_client_rating: 3.9, completion_rate: 74, manager_rating: 3.5, kpi_average: 3.7 },
  { editor_id: 'e3', quarter: 'Q2 2026', avg_client_rating: 3.9, completion_rate: 75, manager_rating: 3.5, kpi_average: 3.7 },
  // Maya Putri – top performer throughout
  { editor_id: 'e4', quarter: 'Q3 2025', avg_client_rating: 4.7, completion_rate: 94, manager_rating: 4.6, kpi_average: 4.7 },
  { editor_id: 'e4', quarter: 'Q4 2025', avg_client_rating: 4.8, completion_rate: 95, manager_rating: 4.7, kpi_average: 4.8 },
  { editor_id: 'e4', quarter: 'Q1 2026', avg_client_rating: 4.8, completion_rate: 96, manager_rating: 4.7, kpi_average: 4.8 },
  { editor_id: 'e4', quarter: 'Q2 2026', avg_client_rating: 4.9, completion_rate: 97, manager_rating: 4.8, kpi_average: 4.9 },
  // Rizky Hakim – declining
  { editor_id: 'e5', quarter: 'Q3 2025', avg_client_rating: 3.8, completion_rate: 79, manager_rating: 3.6, kpi_average: 3.7 },
  { editor_id: 'e5', quarter: 'Q4 2025', avg_client_rating: 3.3, completion_rate: 70, manager_rating: 3.0, kpi_average: 3.2 },
  { editor_id: 'e5', quarter: 'Q1 2026', avg_client_rating: 3.0, completion_rate: 65, manager_rating: 2.8, kpi_average: 2.9 },
  { editor_id: 'e5', quarter: 'Q2 2026', avg_client_rating: 2.8, completion_rate: 60, manager_rating: 2.5, kpi_average: 2.6 },
]
