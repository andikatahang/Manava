

**PRODUCT REQUIREMENTS DOCUMENT**

# **FairCut**

FairCut sebuah platform HRIS untuk tata kelola kontrak digital, otomatisasi batas revisi, dan transparansi payroll guna melindungi hak kerja tenaga editor kreatif freelance.

| Version | v1.0 \- Draft |
| :---- | :---- |
| **Date** | 28-05-2026 |
| **Team** | Kelompok 5: \- M. Andika Tahang (24523092) \- M. Hafizh Hakim (24523062) \- Prima Uziel Nasution (24523088) \- Mohammad Nabil (24523277) |
| **Product Owner** | Universitas |
| **Client / Stakeholder** | Editor Freelance |
| **Status** | In Review |

| How to use this template |
| :---- |
| You will add more sections in later sessions. |
|   |
| Blue underlined text \= your group fills this in. Gray italic text \= guidance; delete before submitting.  Tables are pre-structured, add rows as needed, do not remove columns. |

**PART 1: PROBLEM, OBJECTIVES & SCOPE**

# **1\.  Problem Statement**

### **1.1  Background & Context**

Editor kreatif freelance di Indonesia kerap menghadapi masalah struktural berupa kerugian finansial akibat tidak dibayar setelah pekerjaan selesai dan permintaan revisi tanpa batas tanpa kompensasi tambahan. Kondisi ini terjadi karena hubungan kerja antara editor dan klien berlangsung tanpa kontrak formal, tanpa mekanisme perlindungan hak kerja, dan tanpa pihak ketiga yang mengaudit riwayat performa serta transaksi kedua belah pihak.

### **1.2  Problem Statement**

Editor kreatif freelance tidak dapat melindungi hak kerja dan kepastian pendapatan mereka karena tidak adanya platform formal yang mengikat kontrak kerja dan mengunci kuota revisi secara digital, yang mengakibatkan terjadinya kerugian finansial akibat jam kerja tak dibayar serta tingginya sengketa pembayaran yang tidak terselesaikan.

### **1.3  Who is Affected**

* Editor Kreatif Freelance: Rentan mengalami eksploitasi waktu kerja akibat revisi tak berujung dan berisiko kehilangan hak bayaran setelah proyek selesai. Mereka tidak dapat menyelesaikan ini sendiri karena posisi tawar yang lemah di hadapan klien.    
* Klien: Kesulitan memverifikasi kapabilitas editor secara valid dan tidak memiliki standar acuan pengerjaan proyek, sehingga memicu ekspektasi yang tidak terkelola sejak awal.    
* Pengelola Platform: Mengalami hambatan operasional karena harus mengelola pelaporan dan memediasi sengketa hasil kerja secara manual tanpa adanya log logistik transaksi data yang valid.  

# **2\.  Objectives**

### **2.1  Business Objectives**

| \# | Objective | Why it matters | Success indicator |
| :---: | ----- | ----- | ----- |
| **1** | Menyediakan sistem database tenaga kerja kreatif terpusat. | Menjamin kualitas suplai SDM yang aman bagi ekosistem platform. | Lebih dari 50 profil editor aktif lolos verifikasi berkas dalam 3 bulan peluncuran.  |
| **2** | Menerapkan otomatisasi batas kuota revisi berbasis kontrak digital. | Menghilangkan insiden eksploitasi kerja secara sistem. | Angka sengketa proyek akibat penyalahgunaan revisi turun di bawah 10%. |
| **3** | Mengelola manajemen transaksi kompensasi terintegrasi. | Membangun kepastian dan proteksi pencarian dana bagi tenaga kerja. | 100% perputaran dana proyek tercatat pada buku besar sistem escrow. |

### **2.2  User Objectives**

| Actor | What they need to accomplish | What stops them today |
| ----- | ----- | ----- |
| **Klien** | Menemukan editor video/foto yang kredibel dengan data portofolio dan tarif harga yang transparan. | Tidak ada platform khusus; pencarian manual di media sosial tidak terjamin validitasnya. |
| **Editor** | Bekerja dengan jaminan kuota revisi yang terkunci sistem serta kepastian pencairan dana. | Klien bebas meminta revisi tanpa batas di luar kesepakatan; pembayaran sering terlambat. |
| **Admin** | Memvalidasi dan mengevaluasi data performa SDM secara cepat dan akurat. | Penanganan administrasi verifikasi akun dan mediasi sengketa masih bersifat manual. |

# **3\.  Success Metrics**

| Metric | Baseline (now) | Target (3 months) | How it is measured |
| ----- | :---: | :---: | ----- |
| Verified Editor Pool | 0% (New Platform) | \> 50 Editor Aktif | Jumlah rekam baris data berstatus Is\_verified=true |
| Project Completion Rate | Tidak Teratur | \> 80% Proyek Sukses | Rasio proyek berstatus Completed dibagi total proyek yang terbit di database.  |
| SLA Payout Duration | Tidak Teratur | \< 24 Jam | Selisih waktu log (timestamp) confirmation\_completed ke wallet\_credited.  |
| Dispute Project Incident | Tidak Teratur | \<10% Per Bulan | Jumlah baris data pada tabel disputes dibagi total proyek aktif bulanan . |

| What counts as a real metric |
| :---- |
| 'User satisfaction' is not a metric. 'Average time to complete vaccine registration, measured via server-side session logs' is. Before writing any metric, ask: can I measure this before launch and again after? If the answer is no, replace it. |

# **4\.  Scope**

### **4.1  In Scope & Out of Scope (MVP)**

| ✅  IN Scope (MVP) | ❌  OUT of Scope (v1) |
| ----- | ----- |
| **M1-Registrasi & Onboarding Editor**: Formulir input data pribadi, bidang keahlian, dan unggah berkas pembuktian kompetensi. | Aplikasi berbasis *mobile* (Android/iOS) \- sistem dirancang murni berbasis web responsive. |
| **M2-Manajemen Kontrak Otomatis**: Generator draf perjanjian digital yang mengunci jumlah kuota revisi (misal: maks 3x). | Integrasi API tanda tangan digital eksternal pihak ketiga (seperti PrivyID / Peruri). |
| **M3-Simulasi Keuangan & Kompensasi**: Sistem penahanan dana (escrow) dan pencairan dana ke wallet internal berbasis simulasi logic. | Integrasi gerbang pembayaran riil (*Payment Gateway integration* seperti Midtrans/Xendit) |
| **M4-Evaluasi Kinerja (KPI)**: Pembaruan otomatis parameter kepuasan, completion rate, dan durasi kerja per editor. | Algoritma pencarian atau sistem rekomendasi otomatis berbasis AI / Machine Learning. |

### **4.2  Assumptions & Constraints**

| Type | Description |
| ----- | ----- |
| **Assumption** | Klien bersedia mendepositkan dana 100% di muka ke sistem escrow sebelum pengerjaan proyek dimulai. |
| **Assumption** | Seluruh transaksi keuangan, pemotongan komisi platform, dan proses withdrawal berjalan menggunakan logika transaksi simulasi internal. |
| **Constraint** | Proyek wajib diselesaikan dalam kurun waktu 1 semester akademis oleh kelompok mahasiswa Informatika. |
| **Constraint** | Sistem backend harus menguji arsitektur fungsionalitas dasar HRIS: tata kelola SDM, penilaian kinerja, dan distribusi kompensasi. |

**PART 2: FUNCTIONAL REQUIREMENTS & WORKFLOWS**

# **5\.  Functional Requirements**

| Before you submit each FR, check four things |
| :---- |
| Unambiguous: two engineers reading it independently would build the same thing. |
| Testable: you can write a pass/fail test case for it right now. |
| Feasible: it can be built within this project's constraints. |
| Prioritized: you have a MoSCoW label and you would defend it in a scope-cut conversation. |

### **5.1  FR Table: Klien**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-C01** | Klien | Menampilkan direktori editor yang dapat disaring berdasarkan kategori spesialisasi dan rating. | Saat Klien membuka modul halaman pencarian. | **High** | **M** |
| **FR-C02** | Klien | Mengirimkan formulir kebutuhan proyek (brief) dan lampiran tautan dokumen ke editor tujuan. | Saat Klien menekan tombol 'Kirim Brief' pada profil editor. | **High** | **M** |
| **FR-03** | Klien | Mengalihkan status proyek menjadi "In Progress" dan menahan dana di rekening penampung. | Saat Klien menyelesaikan pembayaran simulasi invoice penawaran. | **High** | **M** |
| **FR-C04** | Klien | Mengunci (disable) tombol "Ajukan Revisi" jika sisa kuota revisi proyek bernilai 0\. | Saat sisa kuota revisi di dalam kontrak digital telah habis digunakan | **High** | **M** |
| **FR-C05** | Klien | Mengeksekusi instruksi paralel pembukaan kunci (unlock) berkas asli dan memicu fungsi transfer dana ke editor. | Saat Klien menekan tombol opsi 'Konfirmasi Selesai'. | **High** | **M** |

### **5.1  FR Table: Editor**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-E01** | Editor | Menyediakan formulir input kelengkapan data portofolio, dokumen KTP, dan spesialisasi keahlian. | Saat pengguna mengakses registrasi dengan tipe akun 'Editor'.  | **High** | **M** |
| **FR-E02** | Editor | Menerapkan lapisan filter pelindung gambar (watermark) otomatis pada berkas hasil kerja sementara. | Saat Editor mengunggah berkas di modul draf penyelesaian. | **High** | **M** |
| **FR-E03** | Editor | Memperbarui agregat data kompetensi KPI (Rating bintang dan persentase *Completion Rate*) di database. | Ketika status proyek berubah secara mutlak menjadi 'Selesai'. | **High** | **M** |
| **FR-E04** | Editor | Memvalidasi kecukupan limit saldo akun terhadap nominal penarikan sebelum meneruskan ke antrean transfer. | Saat Editor menekan tombol perintah 'Ajukan Withdrawal'. | **Medium** | **S** |

### **5.2  FR Table : Admin**

| FR ID | Actor | The system shall… | Condition / Trigger | Priority | MoSCoW |
| :---: | :---: | ----- | ----- | :---: | :---: |
| **FR-A01** | Admin | Menampilkan daftar antrian verifikasi profil editor baru berstatus 'Pending Approval'. | Saat Admin membuka halaman dashboard verifikasi SDM. | **High** | **M** |
| **FR-A02** | Admin | Memindahkan tugas eksekusi pencairan saldo escrow secara manual ke dasbor tindakan Admin. | Ketika fungsi transfer otomatis tertahan/tidak merespons melampaui waktu 48 jam (*Boundary Timer SLA*). | **High** | **M** |
| **FR-A03** | Admin | Mengubah status akun pengguna menjadi 'Suspended' dan menghapus visibilitas profil dari halaman pencarian. | Saat Admin menekan tombol konfirmasi moderasi pelanggaran. | **High** | **M** |

| MoSCoW reference |
| :---- |
| **M** Must Have: the product does not ship without this. |
| **S** Should Have: significant value, expected in the next sprint or release. |
| **C** Could Have: nice to have; only included when higher-priority items are done. |
| **W** Won't Have (this time): deferred. Write it here so it cannot silently re-enter scope. |

# **6\.  User Workflows**

## **6.1  Workflow:**

| Actor | Calon Editor & Admin |
| :---- | :---- |
| **Goal** | Menyaring pendaftaran, memverifikasi dokumen SDM, dan memasukkan data kompetensi ke sistem.  |
| **FRs covered** | FR-E01, FR-A01  |

### **Ideal Path**

| \# | Step description |
| :---: | ----- |
| **1** | Calon Editor membuka formulir pendaftaran, melengkapi biodata, mengunggah kartu identitas (KTP), dan menyertakan tautan portofolio karya.  |
| **2** | Sistem memeriksa validitas format pengunggahan. Jika format sesuai, sistem menyimpan data dengan flag status Pending Verifikasi.  |
| **3** | Admin membuka dasbor verifikasi admin, melakukan peninjauan keabsahan berkas serta portofolio pendaftar.  |
| **4** | Admin mengklik tombol 'Setuju'.  |
| **5** | Sistem mengubah status akun editor menjadi Verified, memetakan jenis keahlian ke master data SDM, dan mengaktifkan profil di direktori pencarian.  |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| ----- | ----- | ----- |
| Apakah data masukan valid & lengkap?  | Sistem merekam berkas dan mengubah status record menjadi Pending.  | Sistem memblokir submit, memunculkan pesan error penolak di form field terkait.  |
| Apakah Admin menyetujui dokumen pendaftar?   | Akun berubah menjadi Verified dan otomatis aktif tampil di pencarian publik.  | Admin menginput alasan penolakan, status record diubah menjadi Rejected, dan mengirim log notifikasi ke user . |

### **Edge Cases**

| Edge Case | What the system must do |
| ----- | ----- |
| Pengunggahan berkas portofolio rusak / korup. | Sistem menangkap pengecualian (exception error), menggagalkan proses simpan, dan meminta user mengunggah ulang berkas yang valid. |
| Admin mengabaikan antrian verifikasi lebih dari 5 hari kerja. | Sistem menjalankan skrip pengingat otomatis rutin ke dashboard admin utama. |

## **6.2  Workflow:**

| Actor | Klien, Editor, dan Sistem Otomatis |
| :---- | :---- |
| **Goal** | Mengelola alur pengerjaan dengan proteksi kuota revisi yang tegas serta pendistribusian dana payroll paralel yang aman. |
| **FRs covered** | FR-C03, FR-C04, FR-C05, FR-E02, FR-E03, FR-A02 |

### **Ideal Path**

| \# | Step description |
| :---: | ----- |
| **1** | Klien menyetujui penawaran kerja dari Editor dan mendepositkan dana ke penampung aman (escrow). |
| **2** | Sistem menerbitkan draf kontrak digital berisi parameter dan status proyek berubah aktif menjadi In Progress |
| **3** | Editor merampungkan pengerjaan materi dan mengunggah berkas draf hasil kerja lewat platform. |
| **4** | Sistem menyuntikkan watermark pelindung secara otomatis ke berkas visual dan mematikan hak akses unduh file bagi Klien. |
| **5** | Klien meninjau hasil ber-watermark tersebut, merasa puas, kemudian menekan tombol 'Konfirmasi Selesai'. |
| **6** | Sistem memproses Parallel Gateway secara simultan: (a) Membuka proteksi file asli bebas watermark untuk diunduh Klien, dan (b) Memindahkan dana kompensasi proyek dari rekening escrow ke saldo wallet akun Editor (dipotong biaya administrasi platform sebesar 10% secara pasti). |
| **7** | Sistem memperbarui data statistik KPI kinerja pada profil publik Editor secara otomatis. |

### **Decision Points**

| Decision Point | YES / Success path | NO / Error path |
| ----- | ----- | ----- |
| Apakah draf kerja disetujui klien? | Sistem mengarah langsung ke pengeksekusian paralel pembukaan file dan pengiriman dana. | Klien menekan 'Minta Revisi'. Sistem melakukan pengecekan logika kondisi:  if (revisions\_taken \< max\_revisions). |
| Apakah jatah kuota revisi kontrak masih tersedia? | Sistem meloloskan formulir revisi ke editor dan menaikkan hitungan log akumulasi: revisions\_taken \+ 1\. | Sistem mematikan paksa tombol pengajuan revisi, memblokir input baru, dan menampilkan peringatan: "Batas revisi gratis telah habis". |
| Apakah saldo dompet mencukupi batas minimum penarikan? | Sistem mengizinkan pembuatan tiket penarikan (withdrawal) untuk dicairkan ke bank tujuan dalam 1x24 jam kerja. | Sistem mengunci proses penarikan dan menampilkan pesan: "Saldo minimum withdrawal adalah Rp10.000. Saldo Anda saat ini Rp5.000." |

### **Edge Cases**

| Edge Case | What the system must do |
| ----- | ----- |
| Terjadi galat koneksi basis data atau sistem macet saat proses pencairan dana otomatis berjalan. | Sistem akan memicu Boundary Timer Event berdurasi 48 Jam. Jika hingga 48 jam status transaksi tetap gagal, sistem otomatis mengalihkan tugas secara langsung ke Admin untuk dilakukan proses eksekusi pencairan manual (FR-A02). |
| Klien sengaja menghilang / tidak merespons review setelah draf final ber-watermark diunggah. | Sistem mengaktifkan waktu tunggu otomatis selama 7 hari kalender. Jika tidak ada aktivitas pengajuan revisi dari klien hingga hari ke-7, sistem mengeksekusi fungsi Auto-Approve, menganggap proyek selesai, membuka kunci file asli, dan mencairkan pembayaran ke editor. |

# **7\.  Design Considerations**

| Design Constraint | Verifiable Threshold | Testing Method |
| ----- | ----- | ----- |
| Seluruh alur onboarding editor, pengiriman brief, dan konfirmasi selesai wajib berfungsi penuh pada layar minimum 360px tanpa horizontal scrolling. | 100% alur utama dapat dioperasikan pada viewport 360px. | Manual testing pada Chrome DevTools mode mobile (360px width). |
| Teks status proyek (In Progress, Completed, Disputed) pada dashboard harus memenuhi standar WCAG 2.1 Level AA. | Rasio kontras warna minimum 4.5:1. | Validasi menggunakan WebAIM Contrast Checker. |
| Berkas hasil kerja editor hanya dapat diunduh klien setelah Konfirmasi Selesai; sebelumnya hanya versi ber-watermark yang dapat diakses. | 0 kasus berkas asli dapat diakses sebelum konfirmasi selesai. | Unit test pada endpoint unduhan berkas dengan status proyek In Progress. |
| Seluruh operasi escrow (deposit, hold, pencairan) wajib bersifat atomic, tidak ada dana yang berpindah sebagian akibat kegagalan sistem. | 0 transaksi berstatus partial tercatat di tabel Transactions. | Integration test simulasi kegagalan koneksi di tengah proses pencairan dana. |

# **8\.  Data Requirements & Privacy**

| Data Entities | Constraint |
| ----- | ----- |
| **User**: user\_id (PK), nama\_lengkap, email,  password\_hash, role (Klien / Editor / Admin) · created\_at | **Constraint**: Satu email tidak boleh terdaftar lebih dari satu kali. Role menentukan hak akses seluruh modul di sistem. |
| **Editor Profile:** profile\_id (PK) · user\_id (FK) · spesialisasi, path\_ktp, link\_portofolio, rating, completion\_rate, status\_verifikasi (Pending / Verified / Rejected) | **Constraint:** Status verifikasi hanya dapat diubah oleh Admin. Transisi verified ke pending tidak diperbolehkan. |
| **Project**: project\_id (PK), client\_id (FK **Users**), editor\_id (FK ke Editor Profiles), judul\_proyek, escrow\_amount, max\_revisions, revisions\_taken, status (Draft / In Progress / Revision / Completed / Disputed), created\_at | **Constraint:** Revisions\_taken tidak boleh melebihi max\_revisions. Transisi status bersifat satu arah dan tidak dapat dikembalikan ke status sebelumnya. |
| **Contracts**: contract\_id (PK) · project\_id (FK) · max\_revisions · nilai\_kompensasi · tanggal\_terbit · status\_kontrak (Active / Closed) | **Constraint:** Satu proyek hanya boleh memiliki satu kontrak aktif di waktu yang sama. Kontrak diterbitkan otomatis saat dana escrow berhasil didepositkan. |
| **Transactions**: transaction\_id (PK), project\_id (FK), dari\_wallet\_id (FK), ke\_wallet\_id (FK), jumlah, tipe (Deposit / Escrow Hold / Disbursement / Commission), status (Pending / Success / Failed), timestamp | **Constraint:** Jumlah tidak boleh bernilai nol atau negatif. Tidak ada transaksi berstatus partial. Disbursement dipotong komisi platform sebesar 10% secara otomatis. |
| **Wallets**: wallet\_id (PK), user\_id (FK), saldo, updated\_at | **Constraint:** Saldo tidak boleh bernilai negatif dalam kondisi apapun. Penarikan hanya dapat diproses jika saldo minimum Rp100.000 terpenuhi. |
| **Disputes**: dispute\_id (PK), project\_id (FK), dibuka\_oleh (FK **Users**), alasan, status\_dispute (Open / Resolved), created\_at | **Constraint:** Dispute hanya dapat dibuka jika status proyek adalah In Progress atau Revision. Eskalasi ke Admin terjadi otomatis jika dispute tidak terselesaikan dalam 48 jam. |
| **Audit Logs**: log\_id (PK) · actor\_id (FK **Users**), aksi, tabel\_terdampak, id\_record\_terdampak, timestamp | **Constraint:** Seluruh entri bersifat immutable, operasi UPDATE dan DELETE tidak diizinkan pada tabel ini. |

# **9\.  Non-Functional Requirements**

| SecurityNFR-01: Sistem wajib mengenkripsi data sensitif (KTP, Saldo Wallet, kontrak) menggunakan HTTPS/TLS untuk melindungi data pribadi editor dan transaksi escrow. |
| :---- |
| **Availability**NFR-02: Sistem harus tersedia minimal 95% uptime selama jam kerja (08.00–22.00 WIB) agar proyek berbasis simulasi akademis tidak memerlukan 24/7 penuh. |
| **Performance**NFR-03: Halaman direktori editor harus termuat dalam \< 3 detik dengan 50+ profil aktif sehingga menjamin pengalaman pencarian klein yang responsif. |
| **Usability**NFR-04: Seluruh alur utama (register, buat kontrak, konfirmasi selesai) harus dapat diselesaikan tanpa panduan teknis tambahan dengan target pengguna adalah freelancer non-teknis. |
| **Auditability** NFR-05: Setiap perubahan status proyek dan transaksi keuangan harus tercatat dalam log dengan timestamp sehingga dapat mendukung beberapa hal seperti mediasi sengketa dan audit admin |
| **Scalability** NFR-06: Arsitektur database harus mampu menangani hingga 200 proyek aktif secara bersamaan tanpa degradasi performa dengan target pertumbuhan platform 3 bulan pasca-launch. |

# 

# 

# **10\.  Milestone Schedule**

| Milestone | Owner | Timeline | Definition of Done |
| ----- | ----- | ----- | ----- |
| Setup Proyek & Desain UI/UX  | Product Manager | Week 1 | Repository dikonfigurasi, ERD final disetujui tim, wireframe UI/UX seluruh modul selesai direview. |
| Registrasi & Verifikasi Editor | Developer | Week 2 | Sistem registrasi multi-role (Klien, Editor, Admin) berjalan, formulir onboarding editor menyimpan data dengan status Pending Verifikasi, dan dashboard verifikasi Admin dapat menampilkan antrian. |
| Direktori Editor & Pengiriman Brief | Developer | Week 3 | Direktori editor tampil dengan filter spesialisasi dan rating, formulir brief berhasil terkirim ke editor tujuan, dan watermark otomatis tersuntik pada berkas unggahan. |
| Backend API Complete | Developer | Week 4 | Semua endpoint API untuk modul kontrak digital, escrow, dan kuota revisi lulus unit tests dengan hasil validasi status proyek yang akurat. |
| Modul Escrow, Pencairan Dana & Admin | Developer | Week 6 | Alur pencairan dana paralel berjalan, KPI editor terupdate otomatis, modul suspend akun Admin aktif, dan Boundary Timer SLA 48 jam sudah dikonfigurasi. |
| UAT Begins | QA / Tester | Week 6 | Lingkungan UAT stabil dan seluruh alur utama onboarding editor, pencairan dana paralel, dan batas revisi otomatis telah diikutsertakan sebagai skenario uji. |
| Staging Signed Off & Go-Live | Product Manger | Week 7.5 | Seluruh FR Must Have tervalidasi, dispute rate simulasi di bawah 10%, SLA payout tercatat \< 24 jam, dan aplikasi siap didemokan |

# **Revision History**

Update this table each time you change the document. Version, date, author, one-line summary of what changed.

| Version | Date | Author | Changes |
| :---: | ----- | ----- | ----- |
| v0.1 | 28-05-2026 | Group 5 | Initial draft |

