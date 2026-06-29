**PRODUCT REQUIREMENTS DOCUMENT**

# **Manava**

Integrated Enterprise Resources Planning (ERP) platform for professional visual services companies that unifies Human Resource Management and Sales of Services operations in one system.

| Version | v2.3 - Role Re-segregation |
| :---- | :---- |
| **Date** | 29-06-2026 |
| **Team** | Kelompok 5: M. Andika Tahang (24523092), M. Hafizh Hakim (24523062), Prima Uziel Nasution (24523088), Mohammad Nabil (24523277) |
| **Product Owner** | Universitas |
| **Client / Stakeholder** | Professional visual services companies (photo/video studios), karyawan editor, klien perusahaan, government/institutional buyers |
| **Status** | Final Integration |

---

**PART 1: PROBLEM, OBJECTIVES & SCOPE**

# **1. Problem Statement**

### **1.1 Background & Context**

Professional visual services companies (photo retouching studios, video editing houses, color grading labs) manage editor workforces separately from client service operations. Human resource management (recruitment, attendance, payroll, performance) runs on manual processes disconnected from service delivery to clients. On the client side, unlimited revision requests burden editors, project scope remains undefined, and payment security is not guaranteed. Currently, no single integrated platform unifies internal HR operations with client service governance—resulting in inefficient resource allocation, editor burnout from scope creep, financial exposure from unpaid services, and mediator conflicts lacking objective evidence.

Internal operations themselves carry a second-order problem: when every administrative duty (IT keamanan, rekrutmen, payroll, klarifikasi absensi harian, persetujuan cuti, override darurat) bertumpuk pada satu akun administrator, akun tersebut menjadi single-point-of-failure secara operasional dan single-point-of-compromise secara keamanan. Manava memecah tanggung jawab ini ke dalam tiga lapisan internal yang berbeda — sistem, HR makro, dan operasional departemen — agar tugas teknis sistem terpisah jelas dari tugas operasional bisnis sehari-hari.

### **1.2 Problem Statement**

Professional visual services companies cannot simultaneously manage editor workforces efficiently and ensure secure client service delivery because no integrated system connects HR operations (recruitment, attendance, compensation, performance) with service delivery operations (project booking, scope definition, revision control, acceptance, payment), resulting in editor overload from unlimited revisions, scope conflicts with clients, unsecured payment, unfair bonus calculation, and biased dispute resolution. Tanpa pemisahan peran administrator yang jelas, kontrol internal juga menumpuk pada satu akun, memperburuk risiko operasional dan keamanan.

### **1.3 Who is Affected**

* **Visual Services Editors (primary):** Overwhelmed by unlimited client revision requests and managed through manual HR processes (attendance/leave/payslips) that lack transparency. Unable to protect their own workload or exercise compensation control due to weak negotiating position and absence of system-enforced scope boundaries. Current solution: none.

* **Client Companies & Individuals (secondary):** Need certainty that deliverables match brief specifications and protection against surprise charges for revisions that should be completed free. Lack binding scope reference and objective dispute evidence. Currently, disputes are settled by company judgment alone with no mediator or objective quality proof.

* **HR & Operations Managers (stakeholder):** Recruitment, attendance, and payroll remain manual with no unified log, creating error-prone workflows and slow decision cycles. Manager approval of leave and performance ratings happen outside any system, preventing data-driven workforce planning. HR membutuhkan akun yang dapat menjalankan ATS dan payroll secara mandiri tanpa harus melalui akun sistem-level setiap kali.

* **Line/Department Managers (stakeholder):** Pemimpin departemen membutuhkan akses operasional yang dibatasi pada anggota departemennya — persetujuan cuti, klarifikasi absensi, penilaian KPI internal — tanpa diberi hak akses ke modul sistem-level atau payroll keseluruhan perusahaan.

* **System Administrators (stakeholder):** Memerlukan akun terpisah yang fokus pada keamanan data, kunci enkripsi, parameter sistem global, dan jalur darurat — tanpa dibebani urusan rekrutmen atau persetujuan cuti harian.

* **Mediator/Arbiter (stakeholder):** Lacks objective evidence (change detection, scope confirmation, quality proof) to resolve disputes fairly between editors and clients.

---

# **2. Objectives**

### **2.1 Business Objectives**

| # | Objective | Why it matters | Success indicator |
| :---: | ----- | ----- | ----- |
| **1** | Provide integrated HR operations management for editor workforce (recruitment, attendance, compensation, performance tracking). | Eliminates manual SDM processes; enables transparent, fair, data-driven people management. | 100% of active editors recorded in master data; 100% attendance & payroll traceable; 0 manual payroll adjustments. |
| **2** | Lock service scope through Revision Envelope (INCLUDED/EXCLUDED/ALLOWANCE) and digitally-managed brief contracts pre-payment. | Protects editor workload from unlimited revision demands; ensures client clarity on deliverables and revision boundaries. | Dispute incidents caused by scope conflict < 10% monthly. |
| **3** | Secure client payments through dual-phase escrow (DP 50% + final settlement 50%) with automatic release to company upon service acceptance. | Guarantees company revenue certainty; eliminates payment-collection friction. | 100% project revenue flows through escrow ledger; SLA escrow-to-company < 1 hour. |
| **4** | Enable objective revision classification (minor = free / major = paid) using Revision Envelope scope matching and AI change detection, with Mediator as final arbiter. | Fairness to editors (no endless free revisions); fairness to clients (no unjust charges); removes bias from dispute resolution. | AI revision classification accuracy ≥ 85%; mediator SLA 48h response ≥ 95% met. |
| **5** | Provide integrated cross-functional KPI and financial management connecting editor performance, project delivery, and revenue recognition. | Single source of truth for workforce costs, service revenue, and profitability across HR and Sales. | Editor KPI combines client rating + completion rate + manager input; quarterly P&L aligns with payroll + escrow ledger. |
| **6** | Establish service delivery lifecycle framework that explicitly connects HR operations (capacity, performance) to Sales operations (booking, execution, acceptance) to Finance operations (escrow, revenue, payroll). | Removes operational silos; enables integrated reporting, capacity forecasting, and compliance (IFRS 15 revenue recognition). | All service-to-revenue workflows documented in architecture; zero unplanned cross-module conflicts. |
| **7** | Memisahkan tanggung jawab administrator internal menjadi tiga lapisan — sistem, HR makro, operasional departemen — dengan capability-based access control. | Mengurangi beban akun administrator, mencegah single-point-of-failure, dan menutup jalur privilege abuse melalui least-privilege. | 0 capability sistem-level dipegang oleh HR_ADMIN/LINE_MANAGER; 100% endpoint write dilindungi guard; 100% DENY tercatat di audit log. |

### **2.2 User Objectives**

| Actor | What they need to accomplish | What stops them today |
| ----- | ----- | ----- |
| **Client** | Book visual editing services with scope certainty, transparent pricing for revisions, and payment security. | No digital contract; unlimited revision claims; no objective proof of work quality; payment risk. |
| **Editor** | Work with fair revision limits, transparent bonus/compensation tied to performance, and autonomous HR operations (attendance, leave, payslip access). | Unlimited unpaid revisions; opaque HR processes; no control over compensation calculation. |
| **HR Admin** | Run ATS end-to-end, confirm onboarding placement, lock monthly attendance, and execute payroll calculation tanpa dependency ke akun sistem-level. | Tidak punya akun yang scope-nya tepat untuk HR makro; semua aksi harus melalui Superadmin. |
| **Line Manager** | Approve cuti, klarifikasi absensi harian, dan memberi Manager Assessment KPI hanya untuk editor di departemennya. | Tidak ada role department-scoped; persetujuan dilakukan di luar sistem. |
| **System Administrator** | Mengelola kunci enkripsi, parameter sistem global, pembuatan akun awal, dan jalur darurat tanpa dibebani operasional HR sehari-hari. | Tidak ada pemisahan domain; akun "superadmin" lama bertugas penuh untuk semua hal. |
| **Mediator** | Resolve scope and quality disputes objectively using documented evidence (brief, scope envelope, revision history, AI change detection, client rating). | No written scope reference; rework history scattered; subjective judgment only; no change metrics. |

UI menampilkan Line Manager sebagai "Admin Manager"; backend dan policy check selalu memakai literal `LINE_MANAGER`.

---

# **3. Success Metrics**

| Metric | Baseline (now) | Target (end of semester) | How it is measured |
| ----- | :---: | :---: | ----- |
| **Editor Master Data Completeness** | 0% | 100% active editors in database with recruitment history, attendance records, payroll data. | System dashboard: count of editors with non-null (user_id, department_id, status, onboarded_at). |
| **Payroll Calculation Accuracy** | Manual / error-prone | 100% payslips match attendance records ± zero manual correction. | Post-payroll audit: `payslip.net_salary = base − attendance_deduction + project_bonus`, cross-checked against attendance + project completion data. |
| **Project Completion Rate** | Unmeasured | ≥ 80% of projects reach Completed status. | System metric: count(status=COMPLETED) ÷ count(status in [COMPLETED, CANCELLED, COMPLETED_AFTER_DISPUTE]). |
| **Dispute Resolution SLA** | Unmeasured | Mediator response ≥ 95% within 48 hours; 100% disputes resolved. | Disputes table: count(resolved_at − opened_at ≤ 48h) ÷ count(all disputes). |
| **Dispute SLA Safety-Net Trigger Rate** | N/A | ≤ 5% of disputes ter-override ke SUPERADMIN karena breach SLA mediator. | Cron log: count(disputes dengan `escalated_at NOT NULL` per kuartal). |
| **Escrow-to-Company SLA** | Unmeasured | ≥ 95% of releases complete within 1 hour of client acceptance. | Transaction logs: avg(timestamp[escrow_release] − timestamp[final_payment_success]). |
| **Service Scope Conflict Incident Rate** | Unmeasured | < 10% of monthly active projects experience scope-related disputes. | Disputes table: count(reason contains 'scope' OR 'revision') ÷ count(projects.status=COMPLETED in same month). |
| **Cross-Module Data Consistency** | N/A | 100% — Project revenue in escrow matches project bonus in payroll; editor.active_projects matches actual In Progress count. | Monthly reconciliation: sum(ProjectBonusAccrual.amount) = sum(Payslip.project_bonus); editor.active_projects ≠ manual count. |
| **Employee Self-Service Adoption** | 0% | ≥ 70% of active editors use ESS ≥ once per month for payslip access or leave request. | User activity logs: count(distinct editors with ≥1 ESS action) ÷ count(active editors). |
| **Privilege Boundary Compliance** | N/A | 0 capability sistem-level dipegang oleh akun non-SUPERADMIN; 0 capability HR makro dipegang oleh akun non-HR_ADMIN. | Quarterly audit log review: count(write actions di luar matrix per role) harus 0. |

---

# **4. Scope**

### **4.1 In Scope & Out of Scope (MVP)**

| ✅ IN Scope (MVP) | ❌ OUT of Scope (v2) |
| ----- | ----- |
| **M1 Recruitment & Onboarding:** ATS dengan job posting dimiliki HR_ADMIN, applicant pipeline (Applied → Screening → Interview → Offered → Offer Accepted → Confirmed → Onboarded), Decision Support System (DSS) untuk department assignment (skill match 40%, team capacity 25%, workload 20%, growth 15%), HR_ADMIN konfirmasi onboarding dan pembuatan akun `role=EDITOR`. Kunci enkripsi berkas identitas dikelola SUPERADMIN. | Real-time video interviewing atau AI resume screening. |
| **M2 Service Contract Management:** Revision Envelope (INCLUDED scope / EXCLUDED scope / ALLOWANCE free-revision limit) co-authored oleh editor dan approved oleh client pre-payment. Brief sebagai digital contract binding scope, gaya, elemen_kunci, estimasi_durasi. Minor revisions gratis, major revisions berbayar (top-up escrow). | Digital signature integration (PrivyID, Peruri). |
| **M3 Escrow Payment Security:** DP 50% on brief approval (held in escrow), final settlement 50% on service acceptance (released to company account). Refund 80% DP only if project status IN_PROGRESS; no cancellation after IN_REVIEW. Manual fallback release oleh SUPERADMIN bila auto-release gagal. | Integrasi external payment gateway (Midtrans, Xendit). |
| **M4 Attendance, Leave, Payroll:** Clock in/out dengan push notification reminders; klarifikasi missing clock-out oleh LINE_MANAGER (scope departemennya); leave request dengan approval LINE_MANAGER dan eksekusi pembatalan proyek + refund 80% DP bila ada konflik; monthly attendance lock dan payroll run dipegang HR_ADMIN; payroll auto-calculated dari `base salary − attendance deduction + 10% project bonus accrual`. | GPS/geofencing untuk location validation. |
| **M5 Performance Management (KPI):** 3 metrics (client rating, project completion rate, Manager Assessment skala 1-5 oleh LINE_MANAGER di departemennya) aggregated ke 3 performance bands (Excellent / Good / Needs Improvement). | ML-based ranking atau automated PIP workflow. |
| **M6 Mediator Dispute Resolution:** MEDIATOR auto-assigned via round-robin dalam 2 jam; 48-hour SLA decision; 5 resolution types (free revision, charge justified, partial refund, full refund, quality sanction); `resolution_note` wajib minimal 200 karakter sebelum eksekusi. Cron jaring pengaman tiap 30 menit mencabut akses MEDIATOR lalai dan override `Dispute.mediator_id` ke SUPERADMIN. | Multiple mediators per case atau ladder eskalasi bertingkat. |
| **M7 Deliverable History & Integrity:** Immutable revision history (no delete, marked superseded); watermarked preview sebelum pembayaran; unlock original file hanya setelah final payment; AI change detection (no_substantive_change flag via hash/perceptual diff). | Blockchain atau cryptographic proof. |
| **M8 Employee Self-Service (ESS):** EDITOR update personal data, view payslip & payroll history, submit leave requests, check attendance, clock in/out. | Document repository atau expense reimbursement portal. |
| **M9 In-App Chat:** Real-time messaging channel antara client dan editor dengan attachment support; message history adalah audit trail. | Video conferencing atau screen share. |
| **M10 Offboarding:** 4-phase workflow (trigger, handoff, final payroll proration, data anonymization 90 hari post-offboarding). | Automated pension/benefits transfer. |
| **M11 System Audit Trail:** All status changes, financial transactions, disputes, mediator decisions logged immutably dengan timestamp, actor, before/after state. Semua keputusan RBAC DENY juga dicatat. | Real-time compliance reporting dashboard. |
| **M12 Role-Based Access Control:** Seven-role hierarchy (SUPERADMIN, HR_ADMIN, LINE_MANAGER, EDITOR, CLIENT, MEDIATOR, FINANCE) dengan capability matrix dan scope predicates (GLOBAL, DEPARTMENT, SELF, OWN_PROJECT, ASSIGNED_PROJECT, ASSIGNED_DISPUTE). | Self-serve role provisioning, OAuth federation, multi-tenant role mapping. |

### **4.2 Assumptions & Constraints**

| Type | Description |
| ----- | ----- |
| **Assumption** | Editors adalah employees (bukan contractors/freelancers); paid via company payroll bulanan; bukan paid per-project. |
| **Assumption** | Clients pay DP 50% on brief approval; final 50% on service acceptance (IFRS 15 revenue recognition trigger). Refund 80% DP only if status IN_PROGRESS; no cancellation after IN_REVIEW. |
| **Assumption** | Revision Envelope (INCLUDED/EXCLUDED/ALLOWANCE) adalah binding baseline. Minor revisions = free; major revisions = top-up escrow. |
| **Assumption** | ProjectBonusAccrual ditugaskan ke payroll period berdasarkan `project.completed_at`; bonus = flat 10% dari base `project_value`. Cutoff: completed_at ≤ end-of-month 23:59:59 WIB. |
| **Assumption** | Editor cannot resign atau take leave bila ada active projects (status IN_PROGRESS/IN_REVIEW). LINE_MANAGER departemennya memegang keputusan: setujui leave + cancel proyek + refund 80% DP (zero bonus), atau tolak. |
| **Assumption** | Max 2 concurrent projects per editor enforced at booking; capacity dicek real-time terhadap `editor.active_projects`. |
| **Assumption** | Onboarding triggers DSS scoring (skill match, team capacity, workload, growth) untuk merekomendasikan department assignment. HR_ADMIN menyetujui rekomendasi atau melakukan manual override. |
| **Assumption** | Revisions tidak dibatasi count; minor revisions loop indefinitely selama within ALLOWANCE dan INCLUDED scope. Major revisions require top-up. |
| **Assumption** | MEDIATOR auto-assigned via round-robin dalam 2 jam; 48-hour SLA decision mandatory. Bila lewat, cron jaring pengaman mencabut akses dan override `Dispute.mediator_id` ke SUPERADMIN. Deadline diperpanjang 24 jam sejak escalation. |
| **Assumption** | All cross-module operations menggunakan transactional isolation (ACID); no race conditions atau partial updates. |
| **Assumption** | Klarifikasi missing clock-out wajib selesai sebelum cutoff bulanan (`30 setiap bulan, 18:00 WIB`); default = ABSENT bila tidak diklarifikasi LINE_MANAGER. HR_ADMIN mengunci rekap bulanan setelah cutoff. |
| **Assumption** | Top-up escrow timeout 72 jam dikonfigurasi via `system_parameter.major_topup_timeout_hours` oleh SUPERADMIN; HR_ADMIN dan LINE_MANAGER tidak boleh mengubahnya. |
| **Assumption** | `MEDIATOR.resolution_note` wajib minimal 200 karakter sebelum sistem mengeksekusi dana/revisi. |
| **Assumption** | UI menampilkan `LINE_MANAGER` sebagai "Admin Manager"; backend dan policy check selalu memakai literal `LINE_MANAGER`. |
| **Constraint** | System adalah single-tenant; multi-company support ditunda ke v3. |
| **Constraint** | Semua financial transactions disimulasi internally; tidak ada real payment gateway. |
| **Constraint** | Development cycle: 1 semester (4 minggu); semua FR Must Have buildable dalam 28 hari oleh tim 4 orang. |
| **Constraint** | Tidak ada Face Recognition, GPS/geofencing, API tanda-tangan digital, ML-based matching; rule-based logic saja. |
| **Constraint** | IFRS 15 revenue recognition baseline: revenue diakui saat performance obligation satisfied. |
| **Constraint** | RBAC enforcement berbasis capability matrix; tidak ada role yang boleh meng-override capability di luar matrix tanpa rotasi ke SUPERADMIN. |

---

**PART 2: FUNCTIONAL REQUIREMENTS & WORKFLOWS**

# **5. Functional Requirements**

## **5.1 FR Table: Client**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-C00** | CLIENT | Display registration form (email, password, company name, client type: Company/Individual); validate email uniqueness dan password strength; create User account dengan `role=CLIENT`. | Client mengakses registration page. | High | **M** |
| **FR-C01** | CLIENT | Display roster of active editors dengan filters (specialization, rating, availability status); show editor profile. | Client membuka Service Booking page. | High | **M** |
| **FR-C02** | CLIENT | Receive in-app notification ketika EDITOR mengirim Revision Envelope & brief; display brief untuk review; allow approval atau request perbaikan. | EDITOR mengirim brief via chat. | High | **M** |
| **FR-C03** | CLIENT | Pay DP 50% setelah approving brief & Revision Envelope; system konfirmasi `escrow.held_balance` increased; project status → IN_PROGRESS. | Client klik "Approve Brief & Pay DP". | High | **M** |
| **FR-C04** | CLIENT | Submit revision request (text description); system trigger AI classification; client melihat AI-suggested label (minor/major) dengan confidence. | Client klik "Request Revision" pada watermarked deliverable. | High | **M** |
| **FR-C05** | CLIENT | Klik "Setuju"; pay final 50% settlement; system unlocks original file; `escrow.held_balance` releases ke company account; Project status → COMPLETED. | Client puas dengan deliverable. | High | **M** |
| **FR-C06** | CLIENT | Buka formal dispute bila dissatisfied; provide reason; system creates Dispute & auto-assigns MEDIATOR. | Client menolak AI classification atau dissatisfied. | High | **M** |
| **FR-C07** | CLIENT | Provide rating (1-5 stars) dan komentar setelah project COMPLETED; rating updates `editor.rating`. | Project status = COMPLETED, dalam 7 hari. | High | **M** |
| **FR-C08** | System | Block client cancellation begitu status = IN_REVIEW; opsi hanya: continue revisions, accept deliverable, atau open dispute. | Client mencoba membatalkan setelah IN_REVIEW. | High | **M** |

## **5.2 FR Table: Editor**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-E01** | EDITOR | Complete onboarding (portfolio, specializations, bank reference, identity file) via ESS setelah HR_ADMIN konfirmasi akun. | Editor login pertama kali post-onboarding. | High | **M** |
| **FR-E02** | EDITOR | Compose dan kirim Revision Envelope (INCLUDED/EXCLUDED/ALLOWANCE) dan brief via chat ke CLIENT untuk approval. | Setelah diskusi awal via chat. | High | **M** |
| **FR-E03** | EDITOR | Upload deliverable files; system otomatis apply watermark; record submission timestamp, file hash, metadata. | EDITOR submit pekerjaan ready untuk client review. | High | **M** |
| **FR-E04** | EDITOR | Buka formal dispute (escalate ke MEDIATOR) bila CLIENT delays acceptance > 7 hari, menolak pelunasan, atau revision demands tidak wajar. | EDITOR menginisiasi dispute. | High | **M** |
| **FR-E05** | EDITOR | View payslip (base, attendance_deduction, project_bonus, net); akses payroll history; export PDF. | EDITOR membuka ESS Payroll. | High | **M** |
| **FR-E06** | EDITOR | Submit leave request (cuti/izin) dengan start/end dates; system memilih LINE_MANAGER departemennya sebagai approver. | EDITOR menginisiasi leave request via ESS. | High | **M** |
| **FR-E07** | EDITOR | Clock in/out; receive push notification bila clock-out belum tercatat hingga 17:30 WIB. Data dipakai untuk payroll deduction. | EDITOR memulai/mengakhiri hari kerja. | High | **M** |

## **5.3 FR Table: SUPERADMIN**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-SA01** | SUPERADMIN | Manage encryption keys untuk `Editor.identity_file_path`, `Applicant.identity_file_path`, dan `Deliverable.original_file_path`; expose key management UI di `(superadmin)/system/encryption-keys`. | Setup awal sistem atau key rotation. | High | **M** |
| **FR-SA02** | SUPERADMIN | Konfigurasi `system_parameter` global: `major_topup_timeout_hours` (default 72), `dispute_sla_hours` (default 48), `attendance_cutoff_dom_hour`, retensi data finansial (7 tahun) dan dispute (10 tahun), `refund_dp_pct_on_cancel` (default 0.80). | SUPERADMIN mengubah konfigurasi global. | High | **M** |
| **FR-SA03** | SUPERADMIN | Create akun awal dengan role apapun (SUPERADMIN, HR_ADMIN, LINE_MANAGER, MEDIATOR); enforce bahwa HR_ADMIN hanya boleh membuat akun `role=EDITOR`. | SUPERADMIN setup akun internal atau eksternal. | High | **M** |
| **FR-SA04** | SUPERADMIN | Trigger manual escrow release bila auto-release gagal > 48 jam; record transaksi dengan reason; menu di `(superadmin)/emergency/escrow-manual-release`. | Escrow release stalled. | High | **M** |
| **FR-SA05** | SUPERADMIN | Terima case dispute yang ter-override otomatis oleh cron jaring pengaman; decision deadline diperpanjang 24 jam sejak escalation; menu di `(superadmin)/emergency/dispute-fallback-queue`. | Cron mendeteksi SLA mediator breached > 48 jam. | High | **M** |
| **FR-SA06** | SUPERADMIN | Suspend akun pengguna apapun dan revoke session; tindakan terikat audit log immutable. | Investigasi keamanan atau insiden. | High | **M** |

## **5.4 FR Table: HR_ADMIN**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-HR01** | HR_ADMIN | Post job opening (title, specialization, description); manage applicant pipeline (Applied → Screening → Interview → Offered → Offer Accepted → Confirmed → Onboarded). | HR_ADMIN menginisiasi recruitment. | High | **M** |
| **FR-HR02** | HR_ADMIN | Terima DSS recommendation saat konfirmasi offer acceptance; lihat department rank scores (skill match 40%, capacity 25%, workload 20%, growth 15%); approve top recommendation atau manual override. | Offer acceptance confirmed, DSS triggered. | High | **M** |
| **FR-HR03** | HR_ADMIN | Verifikasi dan onboard applicant terpilih menjadi editor: buat User account dengan `role=EDITOR`, isi `department_id`, kirim welcome credentials. | HR_ADMIN klik "Confirm Offer Acceptance". | High | **M** |
| **FR-HR04** | HR_ADMIN | Lock rekap kehadiran bulanan tepat pada cutoff (`30 setiap bulan, 18:00 WIB`); setelah lock, tidak ada lagi `AttendanceClarification` boleh masuk. | Cutoff tercapai. | High | **M** |
| **FR-HR05** | HR_ADMIN | Trigger monthly payroll run (1st of month, 00:00 WIB); system aggregates attendance deductions dan project bonuses; generate payslips dengan formula `base − attendance_deduction + 10% bonus accrual`. | Payroll period start. | High | **M** |
| **FR-HR06** | HR_ADMIN | Review dan approve batch payslip publication ke ESS; mark sebagai PAID atau SCHEDULED. | Payroll run selesai. | High | **M** |
| **FR-HR07** | HR_ADMIN | Manage department structure (create, rename, delete); assign LINE_MANAGER ke department; manage editor department membership. | HR restructuring. | High | **M** |

## **5.5 FR Table: LINE_MANAGER**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-LM01** | LINE_MANAGER | Approve atau reject leave requests dari EDITOR yang `department_id`-nya sama; lihat team capacity/workload forecast. Untuk konflik dengan proyek aktif, LINE_MANAGER mengeksekusi pembatalan + refund 80% DP dalam satu transaksi. | LeaveRequest dari anggota departemen masuk. | High | **M** |
| **FR-LM02** | LINE_MANAGER | Klarifikasi atau override status `missing clock-out` pada EDITOR di departemennya (mark sebagai WORKED_FULL_DAY / WORKED_PARTIAL / ABSENT) sebelum HR_ADMIN melakukan monthly lock. | Sistem flag missing clock-out. | High | **M** |
| **FR-LM03** | LINE_MANAGER | Provide internal performance rating (1-5) untuk anggota departemennya via `ManagerAssessment`; rating dipakai dalam KPI band calculation. | Review period (bulanan atau per-project). | High | **M** |
| **FR-LM04** | LINE_MANAGER | Monitor real-time team capacity: count active projects per editor, track availability ("Tidak tersedia hingga X"), flag overload (mendekati max 2 projects). | Dashboard diakses. | High | **M** |

UI menampilkan LINE_MANAGER sebagai "Admin Manager"; backend selalu memakai literal `LINE_MANAGER`.

## **5.6 FR Table: Mediator**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-M01** | MEDIATOR | Receive auto-assignment via round-robin untuk dispute baru; display dispute queue dengan evidence (Revision Envelope, brief, deliverable history, revision requests, AI change-detection, client rating). SLA: 48 jam response deadline. | Dispute dibuat. | High | **M** |
| **FR-M02** | MEDIATOR | Issue binding decision: free revision / charge justified / partial refund / full refund / quality sanction. Wajib mengisi `Dispute.resolution_note` minimal 200 karakter sebelum sistem mengeksekusi. | MEDIATOR review evidence dan ambil keputusan. | High | **M** |
| **FR-M03** | MEDIATOR | Confirm decision execution: system update project status, eksekusi escrow release/refund, record ke Audit Logs immutably. | Decision di-submit. | High | **M** |

## **5.7 FR Table: FINANCE**

| FR ID | Actor | Description | Trigger | Priority | MoSCoW |
| :---: | ----- | ----- | ----- | :---: | :---: |
| **FR-FN01** | FINANCE | Reconcile escrow ledger harian: cocokkan `EscrowAccount.held_balance` dengan agregat transaksi DP/Final yang masih dalam status HELD; flag selisih ke audit log. | Cron harian 23:00 WIB atau manual trigger di `(finance)/escrow/reconciliation`. | High | **M** |
| **FR-FN02** | FINANCE | Generate monthly revenue report sesuai IFRS 15: pisahkan DP received vs revenue recognized (pada `Project.status=COMPLETED`); export CSV/PDF. | Akhir periode bulanan atau permintaan ad-hoc. | High | **M** |
| **FR-FN03** | FINANCE | Read-only akses `EscrowLedger`, `CompanyAccount`, `Transaction` lintas semua proyek untuk audit dan rekonsiliasi; tidak boleh mengubah state proyek atau dispute. | Investigasi finansial. | High | **M** |
| **FR-FN04** | FINANCE | Eksekusi disbursement batch payslip yang sudah di-publish HR_ADMIN ke akun bank editor; idempoten via `Payslip.paid_transaction_id`. | Setelah HR_ADMIN publish batch payslip. | High | **M** |
| **FR-FN05** | FINANCE | Review bulanan rekonsiliasi payroll vs escrow inflow/outflow; submit laporan P&L ke SUPERADMIN. | Closing bulanan. | Medium | **S** |

> FINANCE tidak memiliki capability untuk membuat akun, mengubah RBAC, override dispute, atau mengubah scope proyek. Manual escrow release tetap eksklusif SUPERADMIN (FR-SA04) sebagai jalur darurat; FINANCE hanya membaca dan merekonsiliasi.

## **5.8 FR Table: Sistem AI & Automation**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-AI01** | System | Calculate objective change score (0.0–1.0) antara dua deliverable menggunakan hash diff atau perceptual diff; flag `no_substantive_change` bila score ≤ threshold. | EDITOR submit revision deliverable. | High | **M** |
| **FR-AI02** | System | Generate brief summary (3–5 key points) deliverable alignment ke brief; provide evidence untuk MEDIATOR. | Dispute opened. | Medium | **S** |
| **FR-AI03** | System | Fallback bila AI service timeout/unavailable: mediation proceeds manual; audit log mencatat fallback. | AI call gagal atau timeout (15s). | High | **M** |
| **FR-AI04** | System | Classify revision request sebagai Minor (free) atau Major (paid) berdasarkan Revision Envelope scope dan AI text analysis; assign confidence score. | CLIENT submit revision request. | High | **M** |
| **FR-AI05** | System (Cron) | Tiap 30 menit, scan `Dispute.status='IN_MEDIATION'` dengan `NOW() − opened_at ≥ dispute_sla_hours`. Cabut akses MEDIATOR yang lalai, override `Dispute.mediator_id` ke SUPERADMIN, set `escalated_at = NOW()`, kirim notifikasi ke mediator lama, SUPERADMIN, dan opener. | Cron schedule `*/30 * * * *`. | High | **M** |

---

# **6. User Workflows**

## **6.1 Workflow: Recruitment & Onboarding Through DSS Department Assignment**

| Actor | Applicant, HR_ADMIN, SUPERADMIN, System DSS |
| :---- | :---- |
| **Goal** | Recruit qualified visual services editors through ATS; evaluate department fit using DSS; onboard ke HR master data dan aktivasi sebagai service provider. SUPERADMIN berperan sebagai penyedia kunci enkripsi (prerequisite); seluruh siklus rekrutmen dijalankan oleh HR_ADMIN. |
| **FRs covered** | FR-HR01, FR-HR02, FR-HR03, FR-HR07, FR-SA01, FR-E01 |

### **Ideal Path**

| # | Step description |
| :---: | ----- |
| **1** | SUPERADMIN memastikan encryption key untuk `Applicant.identity_file_path` dan `Editor.identity_file_path` aktif. |
| **2** | HR_ADMIN posts job opening (title: "Video Editor - Color Grading", specialization, description, requirements). |
| **3** | Applicant registers, fills biodata, uploads portfolio & identity file; system validates format dan moves ke "Applied". |
| **4** | HR_ADMIN reviews application, moves through pipeline (Screening → Interview → Offered). |
| **5** | Applicant receives offer email, logs in, klik "Accept Offer"; status → "Offer Accepted". |
| **6** | HR_ADMIN klik "Confirm Offer Acceptance"; system trigger DSS scoring: skill match 40%, team capacity 25%, workload 20%, growth 15%. DSS displays top 3 department recommendations. |
| **7** | HR_ADMIN approve DSS recommendation atau override; system create User account dengan `role=EDITOR`, assign `department_id`, kirim login credentials. |
| **8** | EDITOR login pertama kali, complete onboarding di ESS (credentials, specializations, bank reference); system mark onboarding complete. |
| **9** | Editor profile muncul di service roster; availability = "Tidak tersedia hingga [onboarding-complete-date]"; clients dapat memesan editor. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| ----- | ----- | ----- |
| **Data valid & complete?** | Pindah ke Applied; HR_ADMIN dapat review. | Reject; minta resubmit. |
| **Applicant accepts offer?** | Status → Offer Accepted; trigger HR_ADMIN confirmation. | Offer dicabut; mark Rejected. |
| **HR_ADMIN confirms offer?** | DSS scoring berjalan; rekomendasi department. | Offer cancelled; reopen recruitment. |
| **DSS recommendation acceptable?** | Approve & onboard ke recommended dept. | Override ke alternate dept; alasan dicatat di audit log. |

### **Edge Cases**

| Edge Case | What the system must do |
| ----- | ----- |
| **Portfolio file corrupted** | Reject upload; show error; allow retry tanpa data loss. |
| **No editors available in recommended department** | DSS flag capacity issue; rekomendasi next-best dept; HR_ADMIN pilih final. |
| **Offer acceptance expires (>14 hari)** | Auto-revoke; mark Applicant sebagai Rejected; allow reopen. |
| **Encryption key tidak tersedia** | Upload identity file ditolak; HR_ADMIN tidak boleh proses applicant; system alert ke SUPERADMIN. |

---

## **6.2 Workflow: Service Booking, Delivery, Revision, and Escrow Release**

| Actor | CLIENT, EDITOR, System, MEDIATOR |
| :---- | :---- |
| **Goal** | CLIENT book visual editing service; negotiate scope via Revision Envelope; execute project; accept final deliverable; trigger revenue recognition dan editor bonus. |
| **FRs covered** | FR-C01 sampai FR-C08, FR-E02, FR-E03, FR-E04, FR-AI01, FR-AI04, FR-LM04 |

### **Ideal Path**

| # | Step description |
| :---: | ----- |
| **1** | CLIENT browses active editor roster; pilih editor; klik "Chat". |
| **2** | CLIENT dan EDITOR diskusi requirements; EDITOR gather brief details. |
| **3** | EDITOR composes Revision Envelope (INCLUDED, EXCLUDED, ALLOWANCE = 3) dan brief; kirim ke CLIENT untuk approval. |
| **4** | CLIENT review brief & Revision Envelope; approve atau request perbaikan; status → "In Discussion". |
| **5** | CLIENT pays DP 50%; system: `escrow.held_balance` bertambah, project status → IN_PROGRESS, `editor.active_projects += 1`. |
| **6** | EDITOR works; upload deliverable (watermark otomatis); project status → IN_REVIEW. AI change detection berjalan. |
| **7** | CLIENT review watermarked deliverable. Opsi: (a) "Setuju" (accept), (b) "Perbaiki" (request revision). |
| **[Path A: Setuju]** | CLIENT klik "Setuju", pay final 50%. System: unlock original file, `escrow.held_balance` release ke `company_account`, project status → COMPLETED, `ProjectBonusAccrual` dibuat (10% project_value), `editor.completion_rate += 1`. Revenue recognized (IFRS 15). |
| **[Path B: Minor Revision]** | CLIENT submit revision; AI classify MINOR (cost = Rp 0). Status revision = ACCEPTED, project → REVISION. EDITOR resubmit. Loop ke step 7. |
| **[Path B: Major Revision]** | AI classify MAJOR (estimated cost). Status revision = AWAITING_TOPUP. CLIENT bayar top-up untuk lanjut. Bila tidak dalam `major_topup_timeout_hours` (72), auto-revert ke MINOR atau cancel sesuai parameter. |
| **[Path C: Major Disputed]** | CLIENT menolak label MAJOR; klik "Buka Sengketa"; system create Dispute, auto-assign MEDIATOR via round-robin. Project status → DISPUTED. Escrow held. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| ----- | ----- | ----- |
| **Editor available (max 2 projects)?** | Book project, increment `active_projects`. | Reject; recommend alternate. |
| **CLIENT approves brief & Revision Envelope?** | Lanjut ke DP. | EDITOR revisi brief; resubmit. |
| **CLIENT bayar DP?** | Project activated (IN_PROGRESS). | Payment timeout 24 jam; cancel booking. |
| **Revision AI = MINOR?** | Free revision; lanjut tanpa top-up. | Lanjut decision MAJOR. |
| **Revision AI = MAJOR?** | Tunggu top-up. Bila bayar, lanjut. Bila timeout, auto-revert MINOR atau cancel. | CLIENT boleh open dispute. |
| **CLIENT approve final?** | Setuju → pelunasan, escrow release, revenue recognized. | Perbaiki → revision loop. |
| **EDITOR dalam ALLOWANCE limit?** | Lanjut free revisions selama MINOR. | Setelah ALLOWANCE habis: hanya MAJOR (paid). |

### **Edge Cases**

| Edge Case | What the system must do |
| ----- | ----- |
| **Tidak ada aktivitas chat 7×24 jam.** | Auto-reminder ke CLIENT. Bila tidak respon dalam 2 reminder: escalation atau auto-close. |
| **EDITOR resign mid-project.** | HR_ADMIN dan LINE_MANAGER (dept editor) menerima alert. LINE_MANAGER eksekusi: reassign ke replacement editor (in dept) atau cancel + refund 80% DP. |
| **Upload deliverable corrupted.** | Retry; system retain timestamp dan hash untuk audit. |
| **AI classification timeout (>15s).** | Fallback manual review; revision flagged "pending Mediator assessment". |
| **CLIENT bayar final tapi escrow release gagal.** | Transaction logged "pending manual review"; SUPERADMIN release manual via FR-SA04. |

---

## **6.3 Workflow: Leave Request with Active Project Conflict**

| Actor | EDITOR, LINE_MANAGER, CLIENT |
| :---- | :---- |
| **Goal** | EDITOR ajukan leave; system check active projects; bila konflik, LINE_MANAGER mengeksekusi keputusan: setujui leave + cancel proyek + refund 80% DP, atau tolak. SUPERADMIN tidak terlibat dalam jalur operasional ini. |
| **FRs covered** | FR-E06, FR-LM01 |

### **Ideal Path**

| # | Step description |
| :---: | ----- |
| **1** | EDITOR buka ESS, navigasi ke Leave Request; pilih leave type (cuti/izin), start/end dates. |
| **2** | System check: apakah EDITOR punya active projects (IN_PROGRESS / IN_REVIEW)? |
| **[No active projects]** | LeaveRequest dikirim ke LINE_MANAGER (departemen editor) untuk approval 1-level. Bila approve, editor unavailable di roster. |
| **[Has active projects]** | System tampilkan 3 opsi ke LINE_MANAGER: (A) Proceed with leave + auto-cancel projects + refund 80% DP + zero bonus, (B) Delay leave hingga setelah project completion, (C) Special arrangement. |
| **3** | LINE_MANAGER memilih opsi. Bila Option A, sistem eksekusi dalam satu transaction: cancel projects, create refund (80% DP), delete `ProjectBonusAccrual`, approve leave, mark editor unavailable, notifikasi CLIENT. |
| **4** | Audit log mencatat `actor_id = LINE_MANAGER.user_id` dan reason. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| ----- | ----- | ----- |
| **Active projects exist?** | Tampilkan 3 opsi ke LINE_MANAGER. | LINE_MANAGER approve atau reject langsung. |
| **LINE_MANAGER pilih Option A?** | Auto-cancel projects, refund 80% DP, zero bonus, approve leave. | Leave delay/reject; EDITOR coba alternate dates. |
| **Editor masih punya proyek DISPUTED?** | Leave tetap boleh; decision dispute mengikuti workflow Mediator. | — |

### **Edge Cases**

| Edge Case | What the system must do |
| ----- | ----- |
| **LINE_MANAGER tidak tersedia (cuti/sakit).** | HR_ADMIN dapat eskalasi temporary delegasi (audit-logged); jika tidak ada, SUPERADMIN backup via fallback queue. |
| **Replacement editor tidak ada di dept.** | Option C ditutup; LINE_MANAGER hanya bisa Option A atau B. |
| **Konflik dengan project DISPUTED.** | Leave tetap diizinkan; project dispute lanjut independent. |

---

## **6.4 Workflow: Dispute Resolution by Mediator**

| Actor | CLIENT / EDITOR (initiator), MEDIATOR, System (cron), SUPERADMIN (fallback) |
| :---- | :---- |
| **Goal** | Resolve scope/quality disputes menggunakan brief, revision history, AI change detection, dan keputusan MEDIATOR. Bila MEDIATOR lalai > 48 jam, cron jaring pengaman mencabut akses dan override case ke SUPERADMIN. |
| **FRs covered** | FR-C06, FR-E04, FR-M01, FR-M02, FR-M03, FR-AI02, FR-AI05, FR-SA05 |

### **Ideal Path**

| # | Step description |
| :---: | ----- |
| **1** | CLIENT atau EDITOR open dispute (reason: dissatisfied, dispute AI MAJOR, suspect no substantive change). System create Dispute, status = OPEN. |
| **2** | System auto-assign MEDIATOR via round-robin; kirim notifikasi. SLA: 48 jam. |
| **3** | MEDIATOR review evidence panel: Revision Envelope, deliverable history, revision requests, AI change-detection, client rating, dispute reason. Evidence sudah di-sanitize dari data internal HR. |
| **4** | AI provide brief summary (3–5 key points). MEDIATOR weighs evidence. |
| **5** | MEDIATOR issue decision: free revision / charge justified / partial refund / full refund / quality sanction. Wajib isi `resolution_note` ≥ 200 karakter sebelum tombol "Submit Decision" aktif. |
| **6** | System eksekusi decision: revision baru / refund / sanction. Project status diupdate. |
| **7** | Audit Logs record immutably. Notifikasi ke CLIENT, EDITOR, dan SUPERADMIN untuk observability fallback queue. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| ----- | ----- | ----- |
| **MEDIATOR available dalam 2 jam?** | Auto-assign; mulai 48h SLA timer. | Queue dispute; alert SUPERADMIN. |
| **AI flag "no_substantive_change"?** | Strong evidence editor tidak rework; rekomendasi free revision + quality sanction. | Lanjut qualitative assessment. |
| **`resolution_note` ≥ 200 karakter?** | Tombol Submit aktif; eksekusi keputusan. | Submit ditolak; minta catatan lebih lengkap. |
| **48h SLA terlampaui?** | Cron jaring pengaman mencabut akses MEDIATOR; `Dispute.mediator_id` diset ke SUPERADMIN; deadline diperpanjang 24 jam. | — |

### **Edge Cases**

| Edge Case | What the system must do |
| ----- | ----- |
| **Kedua pihak menolak Mediator decision.** | Decision is final di MVP; system record objection di Audit Logs. |
| **Dispute di project yang sudah COMPLETED.** | Include client rating dalam evidence; MEDIATOR putuskan apakah rating fair atau rushed. |
| **Multiple disputes di project sama.** | MEDIATOR boleh rekomendasi sanction bila pola disputes frivolous. |
| **AI summary gagal.** | Fallback manual review (brief + revision history); audit log mencatat fallback. |
| **MEDIATOR lalai 3 case dalam satu kuartal.** | Cron metrics flag; HR_ADMIN dinotifikasi untuk evaluasi MEDIATOR. |

---

# **7. Platform Architecture & Integration Model**

### **7.1 Module Interdependencies**

Manava integrates three primary functional modules via explicit data flows:

**HR Module** manages editor workforce: recruitment (ATS + DSS) dijalankan HR_ADMIN, attendance (clock in/out) oleh EDITOR, klarifikasi harian oleh LINE_MANAGER, monthly lock + payroll oleh HR_ADMIN, KPI gabungan dari rating CLIENT + completion rate + Manager Assessment LINE_MANAGER, offboarding 4-fase.

**Sales of Services Module** manages client service delivery: project booking (capacity check), brief management (Revision Envelope locking), revision classification (AI-assisted), dispute escalation, acceptance & completion, client rating.

**Finance Module** manages escrow security dan revenue: dual-phase payment (DP 50% / final 50%), escrow ledger (hold → release), revenue recognition (IFRS 15), project bonus accrual, payroll settlement, transaction audit. Manual fallback release dimiliki SUPERADMIN.

### **7.2 Critical Cross-Module Data Flows**

| Flow | Source → Target | Trigger | Data Passed | Impact |
| ----- | ----- | ----- | ----- | ----- |
| **HR → Sales** | `Editor.active_projects` | Project booking | Count IN_PROGRESS/IN_REVIEW | Gate assignment (max 2) |
| **HR ← Sales** | `Project.completed_at` | Service accepted | Completion timestamp, project value | Update `completion_rate`, input KPI |
| **Sales → Finance** | `Project.completed_at` | Service completed | project_id, editor_id, project_value | Create `ProjectBonusAccrual` (10%) |
| **Finance → HR** | `ProjectBonusAccrual` | Payroll run (HR_ADMIN trigger) | Bonus amount per editor per period | Masuk `payslip.project_bonus` |
| **Sales ↔ Finance** | `Project.status`, `Revision.label` | Revision MAJOR / dispute | Escrow amount, top-up needed | Escrow hold atau release |
| **HR → Sales** | `Editor.status`, `leave_approved` | Leave request | Availability, unavailable dates | Roster filtering |
| **Sales ↔ Finance** | `Dispute.resolution_type` | MEDIATOR decides | Free revision / charge / refund / sanction | Update project status + escrow |
| **System → HR/Finance** | `Dispute.mediator_id` override | Cron SLA breach > 48 jam | Old mediator → SUPERADMIN | Decision deadline diperpanjang 24h |
| **HR → Sales** | LINE_MANAGER project cancel | Leave conflict | project_id, refund 80% DP | Escrow refund, bonus dihapus |
| **All → Audit** | Any status change, transaksi, RBAC DENY | Any event | Before/after state, actor, timestamp | Immutable log |

### **7.3 Critical Path: Project Completion to Payroll Payment**

```
Project Completed (IN_REVIEW → COMPLETED)
  ↓ [T+0ms]
Trigger: Final payment success + Escrow release authorized
  ↓
ProjectBonusAccrual created (Finance: 10% of project_value)
  ↓ [T+1ms]
Editor.completion_rate updated (HR: += 1)
  ↓ [T+2ms]
Editor.rating updated (HR: client rating aggregated)
  ↓ [Days 1-30]
Attendance tracked (EDITOR clock in/out)
  ↓ [Days 1-30]
LINE_MANAGER klarifikasi missing clock-out (sebelum cutoff)
  ↓ [T+30d, 18:00 WIB]
HR_ADMIN: monthly attendance lock (cutoff hard deadline)
  ↓ [T+31d, 00:00 WIB]
HR_ADMIN trigger payroll run
  ↓
Payslip generated (Finance: base - deduction + bonus = net)
  ↓
HR_ADMIN approve batch publish ke ESS
  ↓
Payment executed (Finance: salary → editor bank account)
  ↓
Revenue recognized (Finance: IFRS 15 compliance, P&L updated)

TOTAL CRITICAL PATH: 31 calendar days
FLOAT: 0 (delay klarifikasi LINE_MANAGER atau lock HR_ADMIN memblokir payroll)
```

### **7.4 Integration Test Scenarios**

Sepuluh skenario kunci validasi cross-module (lihat Appendix D):

1. Happy path: project book → complete → pay → bonus → payroll
2. Revision MINOR (no cost)
3. Revision MAJOR (top-up, client pays)
4. Dispute AI MAJOR, client disputes
5. `no_substantive_change` detected, MEDIATOR sanctions
6. Leave conflict: active project, LINE_MANAGER override, auto-cancel, refund
7. Attendance gap: missing clock-out, LINE_MANAGER klarifikasi, payroll adjusted
8. Month-end cutoff race: completion 30-Jun 23:59 vs 1-Jul 08:00 → bonus ke periode benar
9. Offboarding: editor resign dengan active projects → handoff atau LINE_MANAGER cancel
10. Dispute SLA breach: MEDIATOR diam 48 jam → cron override ke SUPERADMIN

---

# **8. Data Requirements & Privacy**

### **8.1 Entity Inventory**

| Entity | Key Fields | Governance |
| ----- | ----- | ----- |
| **User** | `user_id` (PK), `full_name`, `email` (unique), `password_hash`, `role` (SUPERADMIN/HR_ADMIN/LINE_MANAGER/EDITOR/CLIENT/MEDIATOR/FINANCE), `department_id` (FK, wajib untuk LINE_MANAGER & EDITOR), `client_type` (COMPANY/INDIVIDUAL, nullable), `is_active`, `created_at` | RBAC enforced via capability matrix. Hierarchy internal: SUPERADMIN → HR_ADMIN → LINE_MANAGER → EDITOR. FINANCE adalah role cross-cutting finansial (escrow reconciliation, revenue reporting, payroll execution), tidak berada di rantai HR. UI menampilkan LINE_MANAGER sebagai "Admin Manager"; FINANCE tampil sebagai "Keuangan". |
| **Department** | `department_id` (PK), `name` (unique), `hr_admin_owner_id` (FK), `line_manager_id` (FK, nullable), `target_size` | HR_ADMIN memiliki recruitment di department. LINE_MANAGER memimpin operasional harian. DSS factors per department. |
| **SystemParameter** | `param_key` (PK), `param_value`, `description`, `updated_by` (FK → User), `updated_at` | Hanya SUPERADMIN boleh write. Menyimpan `major_topup_timeout_hours`, `dispute_sla_hours`, `attendance_cutoff_dom_hour`, `refund_dp_pct_on_cancel`, retensi data. |
| **Editor** | `editor_id` (PK), `user_id` (FK, unique), `department_id` (FK), `specialization` (array), `identity_file_path` (encrypted), `portfolio_url`, `base_salary`, `rating` (0.0–5.0), `completion_rate` (%), `status` (ACTIVE/SUSPENDED/INACTIVE), `onboarded_at`, `max_concurrent_projects=2` | Identity encrypted at-rest dengan kunci dari SUPERADMIN. Availability computed real-time dari `active_projects`. |
| **JobPosting** | `job_id` (PK), `title`, `specialization`, `status` (OPEN/CLOSED), `created_by` (FK → HR_ADMIN), timestamps | Hanya HR_ADMIN boleh CRUD. |
| **Applicant** | `applicant_id` (PK), `job_id` (FK), `name`, `email`, `tahap`, `score` (DSS), `identity_file_path` (encrypted), `portfolio_url`, timestamps | Pipeline dijalankan HR_ADMIN. |
| **Contract** | `contract_id` (PK), `project_id` (FK), `created_by_editor_id` (FK), `scope`, `style`, `key_elements`, `estimated_duration_days`, `project_value`, `revision_envelope_id` (FK), `status`, timestamps | EDITOR drafts; CLIENT approves. Immutable after approval. |
| **RevisionEnvelope** | `envelope_id` (PK), `project_id` (FK), `included_scope`, `excluded_scope`, `allowance_count`, `allowance_consumed` | Locked at contract approval. |
| **Project** | `project_id` (PK), `client_id` (FK), `editor_id` (FK), `title`, `description`, `status` (DRAFT → ... → COMPLETED/CANCELLED), amounts, timestamps | State machine; terminal states irreversible. |
| **RevisionRequest** | `revision_id` (PK), `project_id` (FK), `requested_by_client_id` (FK), `request_text`, `ai_label`, `final_label`, `price`, `status`, timestamps | Klasifikasi via Envelope + AI. |
| **Deliverable** | `deliverable_id` (PK), `project_id` (FK), `editor_id` (FK), `original_file_path` (encrypted), `watermarked_file_path`, `file_sha256`, `perceptual_hash`, `submitted_at` | Immutable; original di-unlock setelah final payment. |
| **Transaction** | `transaction_id` (PK), `project_id` (FK nullable), `editor_id` (FK nullable), `type`, `amount`, `status`, `idempotency_key` (unique), `created_by` (FK), timestamps | Atomic; idempotency mencegah double-payment. |
| **EscrowAccount / EscrowLedger / CompanyAccount** | Struktur double-entry; `held_balance`, `released_balance`, `refunded_balance` | Manual release fallback dimiliki SUPERADMIN. |
| **ProjectBonusAccrual** | `bonus_id` (PK), `project_id` (FK), `editor_id` (FK), `payroll_period`, `amount` (10% of project_value), `source_completed_at`, `consumed_payslip_id` | Locked saat payslip generation. |
| **AttendanceEvent** | `event_id` (PK), `editor_id` (FK), `event_type` (CLOCK_IN/CLOCK_OUT), `occurred_at`, optional geo | Basis payroll deduction. |
| **AttendanceClarification** | `clarification_id` (PK), `editor_id` (FK), `punch_date`, `clarification_type` (WORKED_FULL_DAY/WORKED_PARTIAL/ABSENT), `reason`, `actor_id` (FK → LINE_MANAGER) | Hanya LINE_MANAGER dept editor boleh write. Locked oleh HR_ADMIN saat monthly cutoff. |
| **LeaveRequest** | `leave_id` (PK), `editor_id` (FK), `leave_type` (CUTI/IZIN), `start_date`, `end_date`, `leave_option`, `approver_id` (FK → LINE_MANAGER), `status`, timestamps | Approver wajib LINE_MANAGER dengan `department_id` sama. |
| **Payslip** | `payslip_id` (PK), `editor_id` (FK), `period_start`, `period_end`, `base_salary`, `attendance_deduction`, `project_bonus`, `reimbursement_total`, `net_salary` (generated), `status`, `generated_at`, `paid_transaction_id` | Generated oleh HR_ADMIN trigger. Unique (editor, period). |
| **ManagerAssessment** | `assessment_id` (PK), `editor_id` (FK), `line_manager_id` (FK → User WHERE role=LINE_MANAGER), `rating` (1–5), `feedback`, `status`, `assessment_date` | Wajib satu departemen dengan editor. |
| **ProjectRating** | `rating_id` (PK), `project_id` (FK, unique), `client_id` (FK), `editor_id` (FK), `skor` (1–5), `komentar`, `created_at` | Diberikan CLIENT post-completion. |
| **EditorMetrics** | `editor_id` (PK), `avg_client_rating`, `completion_rate`, `manager_rating`, `kpi_average`, `performance_band` (EXCELLENT/GOOD/NEEDS_IMPROVEMENT) | Recomputed pada perubahan source metric. |
| **Dispute** | `dispute_id` (PK), `project_id` (FK), `opened_by` (FK), `mediator_id` (FK), `reason`, `status`, `resolution_type`, `resolution_note` (≥200 char), `ai_analysis_id` (FK nullable), `opened_at`, `resolved_at`, `escalated_at` | `mediator_id` boleh di-override ke SUPERADMIN oleh cron jaring pengaman. |
| **AIAnalysis** | `analysis_id` (PK), `project_id` (FK), `revision_request_id` (FK), `analysis_type`, `ai_label`, `confidence`, `change_score`, `no_substantive_change`, `summary_text`, `status`, timestamps | Immutable. |
| **Message** | `message_id` (PK), `project_id` (FK), `sender_id` (FK), `body`, `attachment_path`, `message_type` | Audit trail untuk dispute. |
| **AuditLog** | `log_id` (PK), `actor_id` (FK atau 'SYSTEM'), `action`, `table_name`, `record_id`, `before_state` (jsonb), `after_state` (jsonb), `created_at` | Immutable. Mencatat semua write, transaksi, RBAC DENY, cron escalation. |
| **OffboardingLog** | `offboarding_id` (PK), `editor_id` (FK), `trigger_date`, `phase`, `status`, `notes`, anonymization timestamps | 90-day anonymization scheduled. |

### **8.2 Privacy & Data Governance**

**Personal Data (identity, bank account):** Encrypted at-rest dengan kunci yang dikelola SUPERADMIN. Akses pembacaan dibatasi HR_ADMIN untuk operasional payroll. Retensi minimum 5 tahun (tax law). Post-offboarding anonymization: 90 hari.

**Financial Data (escrow, payroll, bonuses):** Tidak pernah dihapus; immutable ledger. Auditable 7 tahun (UU No. 8/1997, bookkeeping). Revenue diakui per IFRS 15.

**Project Data (brief, revision history, deliverables):** Retained indefinitely (client asset); client dapat request deletion post-project. Audit trail immutable.

**Dispute & Mediation Decisions:** Immutable; retained 10 tahun.

**RBAC Decisions:** Setiap GRANT dan DENY dicatat di AuditLog dengan capability dan target. SUPERADMIN dapat review forensik via `(superadmin)/system/audit-trail` dashboard.

### **8.3 Role-Based Access Control Capability Matrix**

Capability matrix menjadi single source of truth untuk semua write endpoint. Scope predicate dievaluasi runtime: `GLOBAL` (semua), `DEPARTMENT` (terikat `department_id` actor), `SELF` (actor adalah subject), `OWN_PROJECT` / `ASSIGNED_PROJECT` / `ASSIGNED_DISPUTE` (relasi resource).

| Capability | SUPERADMIN | HR_ADMIN | LINE_MANAGER | EDITOR | CLIENT | MEDIATOR | FINANCE |
| ----- | :---: | :---: | :---: | :---: | :---: | :---: | :---: |
| `system.encryption_keys.manage`     | GLOBAL | — | — | — | — | — | — |
| `system.parameters.write`           | GLOBAL | — | — | — | — | — | — |
| `user.create_with_role`             | GLOBAL | EDITOR_ONLY | — | — | — | — | — |
| `escrow.manual_release`             | GLOBAL | — | — | — | — | — | — |
| `dispute.fallback_takeover`         | GLOBAL | — | — | — | — | — | — |
| `ats.job_posting.crud`              | — | GLOBAL | — | — | — | — | — |
| `ats.applicant.pipeline`            | — | GLOBAL | — | — | — | — | — |
| `onboarding.confirm`                | — | GLOBAL | — | — | — | — | — |
| `attendance.monthly_lock`           | — | GLOBAL | — | — | — | — | — |
| `payroll.run_monthly`               | — | GLOBAL | — | — | — | — | GLOBAL |
| `payslip.publish`                   | — | GLOBAL | — | — | — | — | — |
| `attendance.clarify_clock_out`      | — | — | DEPARTMENT | — | — | — | — |
| `leave.approve`                     | — | — | DEPARTMENT | — | — | — | — |
| `project.cancel_on_leave_conflict`  | — | — | DEPARTMENT | — | — | — | — |
| `kpi.manager_assessment.write`      | — | — | DEPARTMENT | — | — | — | — |
| `attendance.clock_in_out`           | — | — | — | SELF | — | — | — |
| `leave.request`                     | — | — | — | SELF | — | — | — |
| `ess.self_service`                  | — | — | — | SELF | — | — | — |
| `contract.draft`                    | — | — | — | ASSIGNED_PROJECT | — | — | — |
| `deliverable.upload`                | — | — | — | ASSIGNED_PROJECT | — | — | — |
| `roster.browse`                     | — | — | — | — | GLOBAL | — | — |
| `payment.dp` / `payment.final`      | — | — | — | — | OWN_PROJECT | — | — |
| `rating.give`                       | — | — | — | — | OWN_PROJECT | — | — |
| `dispute.open`                      | — | — | — | ASSIGNED_PROJECT | OWN_PROJECT | — | — |
| `dispute.review_evidence`           | — | — | — | — | — | ASSIGNED_DISPUTE | — |
| `dispute.decide`                    | — | — | — | — | — | ASSIGNED_DISPUTE | — |
| `finance.escrow.reconcile`          | — | — | — | — | — | — | GLOBAL |
| `finance.revenue.report`            | — | — | — | — | — | — | GLOBAL |
| `finance.ledger.read`               | GLOBAL | — | — | — | — | — | GLOBAL |
| `finance.payslip.disburse`          | — | — | — | — | — | — | GLOBAL |

Semua endpoint write dilindungi middleware `requireCap(capability, getTarget)`. Read endpoint sensitif (KPI dashboard, payslip viewer, dispute evidence) menyaring data via parameter `where` di query, bukan post-filter di memori. Setiap DENY dicatat ke AuditLog.

### **8.4 Database Migration**

Perubahan struktural utama:

1. **User.role ENUM** dipecah menjadi 7 nilai: `SUPERADMIN, HR_ADMIN, LINE_MANAGER, EDITOR, CLIENT, MEDIATOR, FINANCE`. Backfill: role lama `superadmin` → `SUPERADMIN`, `admin_manager` → `LINE_MANAGER`, `finance` → `FINANCE`.
2. **User.department_id** ditambahkan (FK → Department); CHECK constraint mewajibkan non-null untuk LINE_MANAGER dan EDITOR.
3. **Department**: `superadmin_id` → `hr_admin_owner_id`; `manager_id` → `line_manager_id`.
4. **SystemParameter** tabel baru dengan seed: `major_topup_timeout_hours=72`, `dispute_sla_hours=48`, `attendance_cutoff_dom_hour=30:18:00`, `financial_data_retention_yrs=7`, `dispute_data_retention_yrs=10`, `refund_dp_pct_on_cancel=0.80`.
5. **ManagerAssessment.manager_id** direname menjadi `line_manager_id` dengan FK terbatas `role=LINE_MANAGER`.
6. **AttendanceClarification.actor_id** dibatasi `role=LINE_MANAGER` dengan `department_id` sama dengan editor subject.
7. **Dispute** tetap; cron menulis `mediator_id` dan `escalated_at` saat SLA breach.

Skrip SQL lengkap dan padanan Prisma berada di **Appendix E**.

---

# **9. Non-Functional Requirements**

| ID | Category | Requirement |
| :---: | ----- | ----- |
| **NFR-01** | Security | Data in-transit: HTTPS/TLS. Data at-rest: identitas, payroll, original deliverable terenkripsi AES-256 dengan kunci yang dikelola SUPERADMIN. Akses dibatasi capability matrix dan tercatat di Audit Logs. Tidak ada hardcoded credentials. |
| **NFR-02** | Availability | Uptime ≥ 95% selama jam operasi (08:00–22:00 WIB). Maintenance window 22:00–08:00 WIB diperbolehkan. |
| **NFR-03** | Performance | Editor roster, project dashboard, attendance summary: load < 3 detik untuk 100+ records. Payroll run < 5 menit untuk 50 editors. |
| **NFR-04** | Usability | Core workflows (book project, approve brief, pay DP, submit revision, clock in/out, view payslip, request leave, approve leave) dapat dijalankan tanpa external guidance. Mobile-responsive UI ≥ 360px. |
| **NFR-05** | Auditability | Semua status changes, financial transactions, payroll runs, mediator decisions, RBAC DENY ter-log immutably dengan timestamp, actor, before/after state. Export audit (CSV/PDF) tersedia. |
| **NFR-06** | Scalability | Sistem menangani 100+ active editors, 200+ concurrent projects, 500+ monthly transactions tanpa degradasi. Index di (editor_id, project_id, payroll_period, created_at). |
| **NFR-07** | Clock-Out Enforcement | Push notification ke EDITOR pukul 17:05 WIB bila clock-out belum tercatat. Missing clock-out di-flag untuk klarifikasi LINE_MANAGER sebelum cutoff HR_ADMIN. |
| **NFR-08** | Bonus Automation | Bonus (flat 10% project_value) dihitung otomatis saat payroll run; zero manual input. Idempotent payslip generation. |
| **NFR-09** | Mediator SLA | Auto-assign MEDIATOR via round-robin dalam 2 jam. Deadline 48 jam; jika lewat, cron jaring pengaman mencabut akses MEDIATOR dan override `Dispute.mediator_id` ke SUPERADMIN. SLA dipantau di metrics dashboard. |
| **NFR-10** | Availability Recomputation | `editor.availability` ("Tidak tersedia hingga X") diperbarui dalam ≤ 5 menit setelah perubahan status proyek atau leave. |
| **NFR-11** | Revenue Recognition | Revenue diakui saat performance obligation satisfied. GL entries di-generate saat completion. Monthly revenue report memisahkan DP received vs revenue recognized. |
| **NFR-12** | Transactional Integrity | Semua cross-module operations memakai database transaction isolation (ACID); no race conditions, no partial updates. Rollback penuh saat failure. |
| **NFR-13** | RBAC Enforcement | Setiap endpoint write dilindungi guard `requireCap`. Read endpoint sensitif menyaring di query layer, bukan post-filter. DENY rate dipantau; spike diatas baseline memicu alert ke SUPERADMIN. |
| **NFR-14** | Defense in Depth | Setiap layout shell per-role melakukan re-check capability di server component; mismatch role mengembalikan 404 (bukan redirect) untuk mencegah user enumeration. |

---

# **10. Milestone Schedule**

| Milestone | Owner | Timeline | Definition of Done |
| ----- | ----- | ----- | ----- |
| **M1: Setup, Data Model & RBAC** | Architect + Dev | Week 1 | Repo configured; ERD approved; seven-role registration berjalan; SystemParameter seed terisi; capability matrix dipasang di middleware; UI shell per role terbentuk; AuditLog mencatat DENY. |
| **M2: ATS, DSS & Onboarding** | Dev | Week 1–end | Job posting (HR_ADMIN), applicant pipeline, DSS scoring, HR_ADMIN confirm + department assignment, Editor onboarding form (ESS). |
| **M3: Roster, Chat & Revision Envelope** | Dev | Week 2–start | Editor roster visible to clients; chat in-app; Revision Envelope co-authoring & approval; brief locking pre-DP. |
| **M4: Escrow & Payments** | Dev | Week 2–mid | DP 50% trigger; escrow ledger; final 50%; auto-release dengan manual fallback SUPERADMIN; transaction log immutable. |
| **M5: Revision Classification & AI** | Dev | Week 2–end | Revision request form; AI classification rule-based; change detection; confidence score; client dispute path. |
| **M6: Mediator & Dispute Resolution + Cron Safety-Net** | Dev | Week 3–start | Dispute open/creation; auto-assign MEDIATOR; mediator dashboard (evidence panel sanitized); decision form dengan `resolution_note` validation ≥ 200 char; cron `disputeSlaWatchdog` tiap 30 menit dengan fallback ke SUPERADMIN. |
| **M7: Attendance & Leave Management** | Dev | Week 3–mid | Clock in/out; push notification 17:05; leave request; LINE_MANAGER approval + eksekusi pembatalan + refund 80% DP; LINE_MANAGER klarifikasi missing clock-out. |
| **M8: Payroll & KPI** | Dev | Week 3–end | HR_ADMIN trigger payroll run dan monthly attendance lock; payslip generation; KPI 3-metrik 3-band; payslip read-only di ESS. |
| **M9: Offboarding & ESS** | Dev | Week 4–start | 4-phase offboarding; ESS portal; anonymization job (90 hari). |
| **M10: Integration Testing & UAT** | QA + Dev | Week 4 | Sepuluh skenario integrasi (Appendix D); cross-module consistency checks; SLA validations; RBAC boundary tests; performance under load. All FR Must Have validated. |

---

# **11. Revision History**

| Version | Date | Author | Changes |
| :---: | ----- | ----- | ----- |
| v1.0 | 28-05-2026 | Kelompok 5 | Initial concept: marketplace for freelance editors. |
| v2.0 | 16-06-2026 | Kelompok 5 | Strategic pivot: HRIS for visual services company employees. Single HR + Sales platform. Revision Envelope menggantikan quota. |
| v2.1 | 24-06-2026 | Kelompok 5 | Deep integration analysis: 12 critical bottlenecks, 5 critical paths, 10 integration test scenarios. Cross-module data flows. IFRS 15 revenue recognition. |
| v2.2 | 25-06-2026 | Kelompok 5 | Enterprise Integration Framework. Architecture section dengan module interdependencies, critical path analysis, integration test scenarios. 6 critical assumptions formalized. FR tables diperluas. |
| **v2.3** | **29-06-2026** | **Kelompok 5** | **Role Re-segregation.** Pemisahan peran administrator internal menjadi tiga lapisan: SUPERADMIN (sistem, IT, keamanan, parameter global, jalur darurat), HR_ADMIN (ATS, onboarding, monthly attendance lock, payroll), LINE_MANAGER (operasional departemen — klarifikasi absensi, persetujuan cuti dengan eksekusi pembatalan + refund 80% DP, Manager Assessment KPI). User.role ENUM diperluas menjadi 6 nilai; UI menampilkan LINE_MANAGER sebagai "Admin Manager". Workflow rekrutmen, payroll, leave-with-conflict, dan dispute resolution direvisi. Capability matrix RBAC formal ditambahkan ke Section 8.3. Database migration di Appendix E. Cron jaring pengaman SLA dispute 48 jam memindahkan case ke SUPERADMIN bila MEDIATOR lalai. UI dipecah per shell role di Appendix F. |
| **v2.3.1** | **29-06-2026** | **Kelompok 5** | **FINANCE role formalization.** Menambahkan FINANCE sebagai role ke-7 untuk memformalkan kapasitas yang sudah ada di kode (escrow reconciliation, revenue reporting IFRS 15, payslip disbursement). Cross-cutting di luar rantai HR; tidak memegang capability sistem, RBAC, maupun scope proyek. Update: Section 8.1 entity inventory User row, Section 8.3 capability matrix (kolom FINANCE + 4 capability finance), Section 8.4 + Appendix E.1/E.2 migration (ENUM 7 nilai + backfill `finance` → `FINANCE`), Appendix F shell `(finance)/`, Section 5.7 FR Table FINANCE (FR-FN01..FR-FN05), Section 4.1 M12 "seven-role", Milestone M1 "seven-role". |

---

## **APPENDIX A: Refund Calculation Matrix**

| Scenario | Trigger | Client Refund | Editor Bonus | Project Status | Audit Entry |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **Cancel (IN_PROGRESS)** | CLIENT cancel sebelum revisi mulai | 80% DP | 0 | CANCELLED | "Client-initiated cancellation, IN_PROGRESS status refund 80% DP" |
| **Auto-cancel (leave conflict)** | LINE_MANAGER eksekusi pembatalan karena leave editor | 80% DP | 0 | CANCELLED | "LINE_MANAGER decision: leave override, auto-cancelled project, 80% DP refunded" |
| **MEDIATOR: Free revision** | Dispute resolved (service non-compliant) | 0 | 0 | REVISION | "MEDIATOR decision: free revision required; resolution_note ≥200 char" |
| **MEDIATOR: Charge justified** | Dispute resolved (client expanded scope) | 0 | 10% (bila completion baru) | REVISION atau COMPLETED | "MEDIATOR decision: major revision charge justified" |
| **MEDIATOR: Partial refund** | Dispute resolved (compromise) | 10–50% DP | Pro-rata bila partial accepted | COMPLETED atau CANCELLED | "MEDIATOR decision: partial refund [amount] on compromise" |
| **MEDIATOR: Full refund** | Dispute resolved (major failure) | 100% DP + final (bila paid) | 0 | CANCELLED | "MEDIATOR decision: full refund; service not accepted" |
| **SUPERADMIN fallback decision** | Cron override karena MEDIATOR breach SLA | Sesuai pilihan SUPERADMIN | Sesuai keputusan | Sesuai keputusan | "SUPERADMIN fallback decision after SLA breach; previous_mediator_id recorded" |
| **Top-up timeout** | CLIENT tidak bayar major top-up dalam `major_topup_timeout_hours` | DP utuh, MAJOR revert ke MINOR atau cancel | 10% bila completed; 0 bila cancelled | REVISION atau CANCELLED | "Automatic: major top-up timeout; reverted per SUPERADMIN parameter" |

---

## **APPENDIX B: Critical Path Dependency Table**

| Dependency ID | From | To | Type | SLA | Risk if Breached |
| ----- | ----- | ----- | ----- | ----- | ----- |
| **DP1** | Editor availability | Project booking | Capacity gate | Real-time | Double-booking atau false rejection |
| **DP2** | Project completion | Bonus accrual | Automatic trigger | T+0ms | Editor bonus hilang bila trigger gagal |
| **DP3** | Month-end 23:59 | Bonus cutoff | Timestamp lock | Exact cutoff | Bonus masuk periode salah |
| **DP4** | LINE_MANAGER klarifikasi → HR_ADMIN cutoff lock | Payroll validation | Prerequisite | Sebelum 30-Jun 18:00 | Payroll delayed; editor unpaid |
| **DP5** | Bonus lock | Payslip generation | Dependency | Pre-payroll | Concurrent deadlock; payroll stalls |
| **DP6** | Leave approval | Roster update | Update gate | Real-time | Editor masih bookable saat cuti |
| **DP7** | Dispute open | MEDIATOR assign | Auto-assign round-robin | Dalam 2 jam | SLA missed; eskalasi SUPERADMIN |
| **DP8** | MEDIATOR decision atau SUPERADMIN fallback | Escrow action | Execute | Immediately | Dana terjebak; pihak tidak puas |
| **DP9** | Project cancelled | Refund transaction | Reverse | Immediate | Refund hangs; rekonsiliasi rusak |
| **DP10** | Offboarding phase 4 | Data anonymization | Scheduled | 90 hari post | PII bocor; compliance issue |
| **DP11** | Cron `disputeSlaWatchdog` | Dispute reassignment ke SUPERADMIN | Scheduled | Tiap 30 menit | MEDIATOR lalai tanpa konsekuensi; case mandek |

---

## **APPENDIX C: Bottleneck Risk Register**

| Bottleneck ID | Component | Severity | Mitigation |
| ----- | ----- | ----- | ----- |
| **B1** | Month-end bonus cutoff race | 🔴 CRITICAL | `PayrollPeriod = month(project.completed_at)`; tes cutoff logic |
| **B2** | MEDIATOR single point-of-failure (48h SLA) | 🔴 CRITICAL | Cron jaring pengaman override ke SUPERADMIN; notifikasi multi-party |
| **B3** | Attendance klarifikasi deadline (LINE_MANAGER) + monthly lock (HR_ADMIN) | 🔴 CRITICAL | Hard deadline; default ABSENT bila tidak diklarifikasi; reminder harian |
| **B4** | Leave approval + active project conflict | 🔴 CRITICAL | LINE_MANAGER memegang keputusan + eksekusi; refund 80% DP otomatis |
| **B5** | Top-up escrow pending (72h timeout) | 🟡 HIGH | Auto-revert MINOR atau cancel sesuai `system_parameter` SUPERADMIN |
| **B6** | Bonus accrual failure | 🟡 HIGH | Idempotent; rollback + alert SUPERADMIN |
| **B7** | Dispute loop (DISPUTED ↔ REVISION) | 🟡 HIGH | Max 3 free revision loops per ALLOWANCE; 4th engage MEDIATOR baru |
| **B8** | Data consistency race | 🟡 HIGH | Transactional isolation (SERIALIZABLE) |
| **B9** | Offboarding 90-day slip | 🟡 HIGH | Scheduled anonymization job; manual check-in di T+85 |
| **B10** | Editor capacity real-time check | 🟡 MEDIUM | Query index (editor_id, status); cache 5-min TTL |
| **B11** | Privilege creep (capability diluar matrix) | 🟡 HIGH | Capability matrix static dengan compile-time check; review kuartalan |
| **B12** | Cron `disputeSlaWatchdog` gagal/skipped | 🟡 HIGH | Idempotent; metric `dispute_sla_breaches_total`; alert SUPERADMIN |

---

## **APPENDIX D: Integration Test Scenarios**

Sepuluh skenario validasi cross-module:

1. **Happy Path:** CLIENT book → EDITOR onboard → submit deliverable → CLIENT approve → final pay → escrow release → bonus accrual → payroll include bonus.
2. **Revision MINOR:** CLIENT request minor (within INCLUDED) → no cost → EDITOR re-works → CLIENT approve.
3. **Revision MAJOR:** CLIENT request major → AI classify → top-up required → CLIENT pays → EDITOR re-works → CLIENT approve.
4. **Dispute AI MAJOR:** CLIENT dispute AI MAJOR → open dispute → MEDIATOR decide → free revision / charge / refund.
5. **No Substantive Change:** EDITOR upload file sama → AI deteksi → MEDIATOR sanction (`resolution_note` ≥ 200 char).
6. **Leave Conflict:** EDITOR active project → request leave → LINE_MANAGER (dept) eksekusi Option A → auto-cancel + refund 80% DP + zero bonus + approve leave.
7. **Attendance Gap:** EDITOR lupa clock-out → push notification → LINE_MANAGER klarifikasi sebelum HR_ADMIN cutoff lock → payroll terhitung benar.
8. **Month-End Cutoff Race:** completion 30-Jun 23:59 vs 1-Jul 08:00 → bonus ke periode benar.
9. **Concurrent Completion:** Dua editor selesai project bersamaan → bonus accrual deterministik.
10. **Dispute SLA Breach:** MEDIATOR diam 48 jam → cron `disputeSlaWatchdog` cabut akses, `Dispute.mediator_id` di-override ke SUPERADMIN, notifikasi 3-pihak, deadline diperpanjang 24 jam.

---

## **APPENDIX E: Database Migration Reference**

### **E.1 SQL Migration (PostgreSQL)**

```sql
BEGIN;

CREATE TYPE user_role_v2 AS ENUM (
  'SUPERADMIN',
  'HR_ADMIN',
  'LINE_MANAGER',
  'EDITOR',
  'CLIENT',
  'MEDIATOR',
  'FINANCE'
);

ALTER TABLE "user"
  ALTER COLUMN role TYPE user_role_v2
  USING (
    CASE role::text
      WHEN 'superadmin'    THEN 'SUPERADMIN'
      WHEN 'admin_manager' THEN 'LINE_MANAGER'
      WHEN 'editor'        THEN 'EDITOR'
      WHEN 'client'        THEN 'CLIENT'
      WHEN 'mediator'      THEN 'MEDIATOR'
      WHEN 'finance'       THEN 'FINANCE'
      ELSE 'SUPERADMIN'
    END
  )::user_role_v2;

DROP TYPE user_role;
ALTER TYPE user_role_v2 RENAME TO user_role;

ALTER TABLE "user"
  ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES department(department_id);

ALTER TABLE "user"
  ADD CONSTRAINT user_department_required
  CHECK (
    (role IN ('LINE_MANAGER', 'EDITOR') AND department_id IS NOT NULL)
    OR role NOT IN ('LINE_MANAGER', 'EDITOR')
  );

ALTER TABLE department RENAME COLUMN superadmin_id TO hr_admin_owner_id;
ALTER TABLE department RENAME COLUMN manager_id    TO line_manager_id;

CREATE TABLE IF NOT EXISTS system_parameter (
  param_key      TEXT PRIMARY KEY,
  param_value    TEXT NOT NULL,
  description    TEXT,
  updated_by     UUID REFERENCES "user"(user_id),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO system_parameter (param_key, param_value, description) VALUES
  ('major_topup_timeout_hours',     '72',       'Batas waktu top-up MAJOR revision'),
  ('attendance_cutoff_dom_hour',    '30:18:00', 'Cutoff bulanan attendance clarification'),
  ('dispute_sla_hours',             '48',       'SLA mediator decision'),
  ('financial_data_retention_yrs',  '7',        'Retensi data finansial'),
  ('dispute_data_retention_yrs',    '10',       'Retensi data dispute'),
  ('refund_dp_pct_on_cancel',       '0.80',     'Persentase refund DP saat pembatalan paksa LINE_MANAGER')
ON CONFLICT (param_key) DO NOTHING;

ALTER TABLE manager_assessment RENAME COLUMN manager_id TO line_manager_id;

COMMIT;
```

### **E.2 Prisma Schema**

```prisma
enum UserRole {
  SUPERADMIN
  HR_ADMIN
  LINE_MANAGER
  EDITOR
  CLIENT
  MEDIATOR
  FINANCE
}

model User {
  user_id        String    @id @default(uuid())
  full_name      String
  email          String    @unique
  password_hash  String
  role           UserRole
  department_id  String?
  department     Department? @relation(fields: [department_id], references: [department_id])
  client_type    ClientType?
  is_active      Boolean   @default(true)
  created_at     DateTime  @default(now())
  updated_at     DateTime  @updatedAt
}

model Department {
  department_id        String  @id @default(uuid())
  name                 String  @unique
  hr_admin_owner_id    String
  line_manager_id      String?
  target_size          Int     @default(5)
  members              User[]
  created_at           DateTime @default(now())
  updated_at           DateTime @updatedAt
}

model SystemParameter {
  param_key   String   @id
  param_value String
  description String?
  updated_by  String?
  updated_at  DateTime @updatedAt
}
```

### **E.3 Cron Job Pseudocode**

```ts
export async function disputeSlaWatchdog() {
  const slaHours = Number(await getParam('dispute_sla_hours')) ?? 48;
  const cutoff = new Date(Date.now() - slaHours * 60 * 60 * 1000);

  const superadmin = await db.user.findFirst({
    where: { role: 'SUPERADMIN', is_active: true },
    orderBy: { created_at: 'asc' },
  });
  if (!superadmin) throw new Error('No active SUPERADMIN');

  const stale = await db.dispute.findMany({
    where: {
      status: 'IN_MEDIATION',
      resolved_at: null,
      escalated_at: null,
      opened_at: { lte: cutoff },
    },
  });

  for (const d of stale) {
    await db.$transaction(async (tx) => {
      const before = { ...d };
      await tx.dispute.update({
        where: { dispute_id: d.dispute_id },
        data: { mediator_id: superadmin.user_id, escalated_at: new Date() },
      });
      await auditLog(tx, {
        actor_id: 'SYSTEM',
        action: 'dispute.sla_breach.fallback_to_superadmin',
        table_name: 'dispute',
        record_id: d.dispute_id,
        before_state: before,
        after_state: { ...before, mediator_id: superadmin.user_id, escalated_at: new Date() },
      });
    });

    await notify(d.mediator_id, 'dispute.removed_for_sla_breach', { dispute_id: d.dispute_id });
    await notify(superadmin.user_id, 'dispute.fallback_assigned', { dispute_id: d.dispute_id });
    await notify(d.opened_by, 'dispute.escalated_to_superadmin', { dispute_id: d.dispute_id });
  }

  return { processed: stale.length };
}
```

Trigger: `*/30 * * * *`. Idempoten via filter `escalated_at IS NULL`.

---

## **APPENDIX F: UI Component Organization by Role**

```
manava-app/src/app/
├── (superadmin)/
│   ├── system/
│   │   ├── encryption-keys/page.tsx
│   │   ├── parameters/page.tsx
│   │   └── retention-policy/page.tsx
│   ├── accounts/
│   │   ├── create/page.tsx
│   │   └── list/page.tsx
│   ├── emergency/
│   │   ├── escrow-manual-release/page.tsx
│   │   └── dispute-fallback-queue/page.tsx
│   └── layout.tsx
├── (hr-admin)/
│   ├── ats/
│   │   ├── jobs/page.tsx
│   │   ├── applicants/[id]/page.tsx
│   │   └── pipeline/page.tsx
│   ├── onboarding/confirm/[applicantId]/page.tsx
│   ├── attendance/monthly-lock/page.tsx
│   ├── payroll/
│   │   ├── run/page.tsx
│   │   └── history/page.tsx
│   ├── editors/page.tsx
│   └── layout.tsx
├── (line-manager)/
│   ├── dept/[deptId]/
│   │   ├── team/page.tsx
│   │   ├── attendance-clarify/page.tsx
│   │   ├── leave-approvals/page.tsx
│   │   └── kpi-assessment/page.tsx
│   └── layout.tsx
├── (editor)/
│   ├── ess/
│   │   ├── attendance/page.tsx
│   │   ├── leave-request/page.tsx
│   │   └── payslip/page.tsx
│   ├── projects/
│   │   ├── [projectId]/brief/page.tsx
│   │   ├── [projectId]/deliverable/page.tsx
│   │   └── [projectId]/chat/page.tsx
│   └── layout.tsx
├── (client)/
│   ├── roster/page.tsx
│   ├── projects/
│   │   ├── [projectId]/page.tsx
│   │   ├── [projectId]/review/page.tsx
│   │   ├── [projectId]/payment/page.tsx
│   │   └── [projectId]/chat/page.tsx
│   └── layout.tsx
├── (mediator)/
│   ├── queue/page.tsx
│   ├── case/[disputeId]/
│   │   ├── evidence/page.tsx
│   │   └── decide/page.tsx
│   └── layout.tsx
├── (finance)/
│   ├── escrow/
│   │   ├── ledger/page.tsx
│   │   └── reconciliation/page.tsx
│   ├── revenue/
│   │   ├── recognition/page.tsx
│   │   └── reports/page.tsx
│   ├── payroll/disbursement/page.tsx
│   └── layout.tsx
└── layout.tsx
```

**Prinsip penataan:**

1. Per-role shell terpisah; komponen sensitif tidak ter-mount untuk role lain.
2. Sidebar dirakit dari capability matrix (Section 8.3), bukan role hardcoded. Item navigasi muncul hanya bila `can(user, capability)` true.
3. Defense in depth: layout shell `(role)/layout.tsx` melakukan re-check capability di server component dan mengembalikan 404 saat mismatch.
4. UI menampilkan LINE_MANAGER sebagai "Admin Manager"; backend selalu menerima literal `LINE_MANAGER`.
5. EDITOR shell punya dua top-level tab: ESS dan Projects.
6. MEDIATOR shell hanya membaca evidence package yang sudah di-strip data internal HR (gaji, KPI, identity_file).

**Komponen lintas-role sentralisasi:**

| Komponen | Konsumen | Catatan |
| ----- | ----- | ----- |
| `RoleAwareSidebar` | semua shell | Render item dari capability matrix |
| `AuditLogViewer` | SUPERADMIN, HR_ADMIN | Read-only |
| `EvidenceBundleViewer` | MEDIATOR | Sanitized API |
| `CapabilityGate` | semua | Wrapper React untuk hide tombol/section |
| `ScopedTable` | LINE_MANAGER, HR_ADMIN | Otomatis tambah filter `department_id` bila role scoped |

---

**END OF PRD v2.3**
