<div align="center">

<img src="app-logo/logo-dark.png" alt="Manava" width="220" />

### ERP untuk Studio Layanan Visual Profesional

Menyatukan operasi **SDM** dan **Penjualan Jasa** dalam satu platform — dengan batas revisi yang adil, pembayaran escrow yang aman, dan kompensasi yang transparan.

![React](https://img.shields.io/badge/React-19-149ECA?logo=react&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-646CFF?logo=vite&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-06B6D4?logo=tailwindcss&logoColor=white)
![Status](https://img.shields.io/badge/status-prototype-orange)

</div>

---

## Tentang Manava

**Manava** adalah platform _Enterprise Resource Planning_ (ERP) untuk perusahaan jasa visual profesional — studio retouching foto, rumah editing video, dan lab color grading. Manava memadukan **Manajemen SDM (HRM)** dan **Penjualan Jasa (SoS)** sehingga studio dapat mengelola editor, proyek klien, pembayaran, dan kinerja dari satu tempat.

Masalah yang dipecahkan: revisi tanpa batas yang merugikan editor, biaya yang tidak transparan bagi klien, dan pembayaran yang tidak aman. Manava menjawabnya lewat **Revision Envelope**, **escrow dua tahap**, dan **klasifikasi revisi berbantuan AI**.

> **Status:** Prototipe antarmuka (UI/UX) dengan data tiruan. Logika bisnis dan kontrak API didokumentasikan di [`prd.md`](prd.md).

---

## Konsep Inti

| Konsep | Penjelasan |
|--------|-----------|
| 🧩 **Revision Envelope** | Mendefinisikan batas revisi secara objektif: `INCLUDED` (tercakup), `EXCLUDED` (di luar lingkup), dan `ALLOWANCE` (jatah revisi gratis). Melindungi editor dari pekerjaan tak berbayar dan membuat biaya transparan bagi klien. |
| 🔐 **Escrow Dua Tahap** | Pembayaran ditahan aman: **DP 50%** di awal dan **Pelunasan 50%** setelah hasil disetujui. Dana baru cair ke studio saat klien menyetujui hasil akhir. |
| 🤖 **Klasifikasi Revisi AI** | Mesin AI menilai apakah sebuah revisi tergolong _minor_ (gratis) atau _major_ (berbayar), dengan target akurasi ≥ 85% dan fallback ke mediator manual. |
| 📊 **KPI Editor** | Kinerja editor diukur dari rating klien, tingkat penyelesaian, dan penilaian manajer — memengaruhi penugasan proyek dan kompensasi. |

---

## Fitur per Peran

| Peran | Kemampuan utama |
|-------|-----------------|
| 👤 **Klien** | Cari editor, pesan layanan, dan kelola semua proyek dari satu halaman **Proyek Saya** — ringkasan, kontrak, hasil kerja, chat, pembayaran, dan sengketa per proyek. |
| 🎨 **Editor** | Dashboard dengan absensi cepat & proyek berjalan, halaman **Proyek Saya** terpadu (kontrak, hasil kerja, chat), serta tren KPI pribadi. |
| 🛡️ **Mediator** | Menangani sengketa dan meninjau klasifikasi revisi. |
| 💰 **Keuangan** | Rekonsiliasi escrow, pelaporan pendapatan, dan penggajian. |
| ⚙️ **Admin / Superadmin** | Rekrutmen, manajemen proyek, KPI, kontrak, jejak audit, dan onboarding. |

---

## Tech Stack

- **React 19** + **TypeScript** + **Vite**
- **Tailwind CSS** dan **styled-components** untuk styling
- **React Router** untuk navigasi
- **Recharts** untuk visualisasi data, **Framer Motion** untuk animasi, **lucide-react** untuk ikon
- **Playwright** untuk pengujian E2E, **oxlint** untuk linting

---

## Menjalankan Secara Lokal

```bash
cd manava-app

# Pasang dependensi
npm install

# Jalankan server pengembangan (http://localhost:5173)
npm run dev

# Build untuk produksi
npm run build

# Pratinjau hasil build
npm run preview
```

Skrip lain: `npm run lint` (oxlint) · `npm run test:e2e` (Playwright).

---

## Struktur Proyek

```
.
├── manava-app/              # Aplikasi frontend (React + Vite)
│   └── src/
│       ├── components/      # Layout (Sidebar, Header) & UI bersama (Card, Badge)
│       ├── pages/           # Halaman per domain (dashboard, projects, auth, dll.)
│       ├── data/            # Data tiruan untuk prototipe
│       ├── lib/             # Utilitas
│       └── types/           # Definisi tipe domain
├── app-logo/                # Aset logo (light & dark)
├── prd.md                   # Dokumen Kebutuhan Produk (alur, KPI, metrik)
├── front-end-guidelines.md  # Panduan desain frontend
└── CLAUDE.md                # Panduan untuk asisten Claude Code
```

---

## Dokumentasi Lanjutan

- 📄 [`prd.md`](prd.md) — kebutuhan produk lengkap: alur kerja, KPI, dan metrik keberhasilan.
- 🎨 [`front-end-guidelines.md`](front-end-guidelines.md) — token warna, tipografi, dan aturan penggunaan logo.

---

<div align="center">
<sub>Dibuat untuk studio layanan visual yang menjunjung keadilan, transparansi, dan kualitas.</sub>
</div>
