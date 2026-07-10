import { useState, type FC, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import logoDark from '../../assets/logo-dark.png'
import logoLight from '../../assets/logo-light.png'
import { Card } from '../../components/ui/Card'
import DotField from '../../components/dot-field/DotField'
import {
  Sparkles, ArrowRight, Check, Plus, Minus,
  Users, BarChart2, CalendarClock, AlertOctagon, UserCheck, Building2,
  FileCheck2, PackageCheck, BadgeDollarSign,
} from 'lucide-react'

/* ──────────────────────────────────────────────────────────
   Design language extracted from Framer project Manava-SmallERP
   Brand navy #021526 · lime accent #D0F100
   blue glow #0050F8 · muted #596074 · surface #FBFBFB
   Display: Inter Display · Body: Open Runde
   ────────────────────────────────────────────────────────── */

type IconType = FC<SVGProps<SVGSVGElement>>

type Feature = { icon: IconType; title: string; tag: string; desc: string }
type Step = { icon: IconType; step: string; title: string; desc: string }
type Role = { role: string; initial: string; color: string; points: string[] }
type Stat = { value: string; label: string; sub: string }
type Faq = { q: string; a: string }

const features: Feature[] = [
  { icon: Users, title: 'Smart Recruitment', tag: 'ATS',
    desc: 'Lamaran publik masuk ke pipeline terstruktur — seleksi, interview, hingga akun staf dibuat otomatis saat diterima.' },
  { icon: CalendarClock, title: 'Cuti Berjenjang', tag: 'Persetujuan',
    desc: 'Permohonan cuti naik satu tingkat: staf disetujui manajer, manajer disetujui HR — dengan notifikasi langsung ke approver.' },
  { icon: AlertOctagon, title: 'Peringatan Kerja', tag: 'Kepatuhan',
    desc: 'HR menerbitkan peringatan dengan severity dan masa berlaku; penerima mendapat notifikasi dan mengakuinya secara tercatat.' },
  { icon: UserCheck, title: 'Layanan Mandiri (ESS)', tag: 'Karyawan',
    desc: 'Presensi, pengajuan cuti, dan slip gaji dalam satu tempat — karyawan tidak perlu menunggu balasan email HR.' },
  { icon: BarChart2, title: 'KPI & Payroll', tag: 'Kinerja',
    desc: 'Rating, penyelesaian tepat waktu, dan penilaian manajer menyatu menjadi kompensasi yang adil berbasis data.' },
  { icon: Building2, title: 'Dashboard Departemen', tag: 'Tim',
    desc: 'Manajer memantau anggota, beban kerja, dan persetujuan timnya dari satu dasbor departemen.' },
]

const steps: Step[] = [
  { icon: FileCheck2, step: '01', title: 'Lamar & Seleksi',
    desc: 'Kandidat melamar tanpa perlu akun. HR menyeleksi lewat pipeline ATS, dan akun staf dibuat otomatis saat diterima.' },
  { icon: PackageCheck, step: '02', title: 'Bekerja & Terpantau',
    desc: 'Staf mengerjakan proyek dengan presensi, cuti berjenjang, dan KPI yang tercatat rapi — transparan bagi semua pihak.' },
  { icon: BadgeDollarSign, step: '03', title: 'Gaji & Bonus',
    desc: 'Penggajian mengikuti kinerja terukur: KPI dan penilaian manajer menentukan bonus, slip gaji tersedia di ESS.' },
]

const roles: Role[] = [
  { role: 'Superadmin', initial: 'S', color: '#0050F8', points: ['Kendali penuh platform', 'Kelola akun & akses', 'Jejak audit sistem', 'Pengawasan lintas modul'] },
  { role: 'HR Admin', initial: 'H', color: '#10B981', points: ['Rekrutmen & onboarding', 'Terbitkan peringatan kerja', 'Eskalasi cuti manajer', 'Presensi & penggajian'] },
  { role: 'Manajer Admin', initial: 'A', color: '#EC4899', points: ['Setujui cuti tim staf', 'Nilai kinerja staf', 'Pantau absensi', 'Dashboard departemen'] },
  { role: 'Staf', initial: 'E', color: '#3B82F6', points: ['Lihat proyek yang ditugaskan', 'ESS: cuti & slip gaji', 'Lacak KPI & bonus', 'Terima & akui peringatan'] },
]

const stats: Stat[] = [
  { value: '8', label: 'Modul HR', sub: 'Rekrutmen hingga penggajian, semua terhubung' },
  { value: '4', label: 'Peran pengguna', sub: 'Kontrol akses granular' },
  { value: '1 klik', label: 'Lamar kerja', sub: 'Tanpa akun untuk melamar' },
  { value: '1 tingkat', label: 'Persetujuan cuti', sub: 'Selalu naik ke atasan langsung' },
]

const faqs: Faq[] = [
  { q: 'Bagaimana cara bergabung sebagai staf?',
    a: 'Kirim lamaran lewat halaman Lowongan Pekerjaan — tanpa perlu membuat akun. HR meninjau lamaran Anda di pipeline ATS, mengundang interview, dan begitu diterima akun staf Anda dibuat otomatis beserta email undangan masuk.' },
  { q: 'Bagaimana alur persetujuan cuti bekerja?',
    a: 'Permohonan selalu naik satu tingkat: cuti staf disetujui Manajer Admin, cuti Manajer Admin disetujui HR Admin. Approver mendapat notifikasi langsung di aplikasi, jadi tidak ada permohonan yang tenggelam.' },
  { q: 'Bagaimana peringatan kerja dikelola?',
    a: 'Hanya HR Admin yang dapat menerbitkan peringatan, lengkap dengan severity dan masa berlaku. Penerima mendapat notifikasi, melihat detail alasannya, dan mengakui peringatan secara tercatat — semuanya terdokumentasi.' },
  { q: 'Bagaimana kompensasi staf dihitung?',
    a: 'KPI memadukan rating klien, tingkat penyelesaian tepat waktu, dan penilaian manajer tiap kuartal. Tingkatan itu menentukan bonus proyek, sehingga bayaran mengikuti kinerja terukur, bukan opini.' },
  { q: 'Apa yang bisa karyawan lakukan sendiri lewat ESS?',
    a: 'Lewat Layanan Mandiri, karyawan mencatat presensi, mengajukan cuti dan izin, mengunduh slip gaji, serta memantau KPI pribadinya — tanpa harus menunggu balasan email dari HR.' },
]


export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#FBFBFB] text-[#1a1a1a] antialiased"
      style={{ fontFamily: "ui-serif, Georgia, 'Times New Roman', serif" }}
    >
      <Nav />
      <Hero />
      <Features />
      <HowItWorks />
      <Roles />
      <Stats />
      <FaqSection />
      <FinalCta />
      <Footer />
    </div>
  )
}

/* ── Nav ── */
function Nav() {
  return (
    <header className="sticky top-0 z-50 bg-[#FBFBFB]/85 backdrop-blur-md border-b border-[#EDEDED]">
      <nav aria-label="Main navigation" className="max-w-[1140px] mx-auto px-6 h-[64px] flex items-center justify-between" style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}>
        <img src={logoDark} alt="Manava" className="h-7 w-auto object-contain object-left" />
        <div className="hidden md:flex items-center gap-0.5">
          {[
            { label: 'Platform', href: '#platform' },
            { label: 'Cara Kerja', href: '#how-it-works' },
            { label: 'Peran', href: '#roles' },
            { label: 'FAQ', href: '#faq' },
          ].map(item => (
            <a
              key={item.href}
              href={item.href}
              className="text-[14px] font-medium tracking-[-0.01em] text-[#596074] hover:text-[#1a1a1a] px-3.5 py-2 rounded-full hover:bg-white transition-colors duration-150"
            >
              {item.label}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login" className="hidden sm:inline-flex text-[14px] font-medium tracking-[-0.01em] text-[#596074] hover:text-[#1a1a1a] px-3.5 py-2 rounded-full hover:bg-white transition-colors duration-150">
            Masuk
          </Link>
          <Link
            to="/login"
            className="text-[14px] font-semibold tracking-[-0.01em] text-[#021526] bg-[#D0F100] hover:brightness-95 px-4 py-2 rounded-full transition-all duration-150"
          >
            Mulai
          </Link>
        </div>
      </nav>
    </header>
  )
}

/* ── Hero ── */
function Hero() {
  return (
    <section
      aria-labelledby="hero-heading"
      className="relative overflow-hidden"
      style={{ background: '#fbfbfb' }}
    >
      {/* interactive dot field — above the lines */}
      <div aria-hidden className="pointer-events-none absolute inset-0 z-[1]">
        <DotField />
      </div>
      <div className="relative z-10 max-w-[860px] mx-auto px-6 pt-24 pb-56 text-center">
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-[#021526]/70 bg-[#021526]/[0.04] border border-[#021526]/10 px-3.5 py-1.5 rounded-full mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[#0050F8]" />
          ERP untuk Studio Visual Skala Kecil
        </span>

        <h1
          id="hero-heading"
          className="text-[clamp(2.9rem,7vw,5.25rem)] font-bold leading-[1.03] tracking-[-0.04em] text-[#021526] mb-7"
          style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
        >
          Dari Rekrutmen ke Penggajian,
          <br />
          Otomatis &amp; <span className="text-[#0050F8]">Adil</span>.
        </h1>

        <p className="text-[clamp(1rem,1.8vw,1.18rem)] text-[#596074] max-w-[560px] mx-auto mb-10 leading-[1.65]">
          Manava menyatukan rekrutmen, presensi, cuti, KPI, dan penggajian untuk studio visual —
          satu sistem HR yang transparan bagi editor, manajer, dan HR.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <Link
            to="/apply"
            className="group inline-flex items-center gap-2 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-7 py-3.5 rounded-full text-[15px] transition-all duration-200"
          >
            Gabung Sekarang
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#596074]">
          Dibuat untuk tim layanan visual profesional
        </p>
      </div>
    </section>
  )
}

/* ── Features (bento) ── */
function Features() {
  return (
    <section id="platform" className="py-24">
      <div className="max-w-[1140px] mx-auto px-6">
        <SectionHead
          eyebrow="Platform"
          title="Semua yang dibutuhkan studio visual Anda."
          subtitle="Satu sistem terhubung dari brief pertama hingga pencairan terakhir."
        />
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {features.map(({ icon: Icon, title, tag, desc }) => (
            <Card
              key={title}
              title={title}
              desc={desc}
              media={
                <div className="flex items-start justify-between">
                  <div className="w-12 h-12 rounded-[0px] flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5">
                    <Icon className="w-8 h-8 text-[#021526]" />
                  </div>
                  <span className="text-[8px] font-medium text-[#596074] bg-white/70 border border-black/[0.05] px-3 py-1 rounded-full whitespace-nowrap">
                    {tag}
                  </span>
                </div>
              }
            />
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── How it works (dark) ── */
function HowItWorks() {
  return (
    <section id="how-it-works" className="bg-[#021526] py-24">
      <div className="max-w-[1140px] mx-auto px-6">
        <SectionHead
          dark
          eyebrow="Cara Kerja"
          title="Tertib, dari pemesanan hingga rekening."
          subtitle="Tiga tahap menjaga setiap pekerjaan tetap terprediksi bagi studio dan klien."
        />
        <div className="grid md:grid-cols-3 gap-2">
          {steps.map(({ icon: Icon, step, title, desc }) => (
            <article
              key={step}
              className="p-7 rounded-[8px] bg-[#0c2438] border border-white/[0.08] hover:border-white/[0.16] transition-colors duration-200"
            >
              <div className="flex items-center justify-between mb-7">
                <div className="w-14 h-14 rounded-full flex items-center justify-center">
                  <Icon className="w-8 h-8 text-[#fbfbfb]" />
                </div>
                <span className="text-[18px] font-semibold text-[#D0F100] tabular-nums">{step}</span>
              </div>
              <h3 className="font-semibold text-[#fbfbfb] text-[18px] mb-2 tracking-[-0.01em]">{title}</h3>
              <p className="text-[14px] text-[#9aa3bd] leading-[1.6]">{desc}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Roles ── */
function Roles() {
  return (
    <section id="roles" className="py-24 bg-[#021526]">
      <div className="max-w-[1140px] mx-auto px-6">
        <SectionHead
          dark
          eyebrow="Kontrol akses"
          title="Dibuat untuk setiap peran."
          subtitle="Tiap pengguna melihat persis yang mereka butuhkan — tidak lebih, tidak kurang."
        />
        <div className="grid md:grid-cols-2 gap-3">
          {roles.map(({ role, points }) => (
            <article
              key={role}
              className="p-7 rounded-[8px] bg-[#0c2438] border border-white/[0.08] hover:border-white/[0.16] transition-colors duration-200"
            >
              <div className="flex items-center gap-3 mb-6">
                <h3 className="font-semibold text-[#fbfbfb] text-[20px] tracking-[-0.01em]">{role}</h3>
              </div>
              <ul className="space-y-2.5">
                {points.map(p => (
                  <li key={p} className="flex items-center gap-2.5 text-[13.5px] text-[#9aa3bd]">
                    <Check className="w-[15px] h-[15px] text-[#10B981] flex-shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── Stats ── */
function Stats() {
  return (
    <section className="bg-[#021526]">
      <div className="max-w-[1140px] mx-auto px-6 py-14">
        <div className="grid grid-cols-2 md:grid-cols-4">
          {stats.map(({ value, label, sub }, i) => (
            <div
              key={label}
              className={`text-center px-6 py-2 ${i === 1 || i === 3 ? 'border-l border-white/10' : ''} ${i === 2 ? 'md:border-l md:border-white/10' : ''}`}
            >
              <p
                className="text-[clamp(2.5rem,5vw,3.6rem)] font-bold tracking-[-0.05em] text-white leading-none mb-2 tabular-nums"
                style={{ fontFamily: "'Inter Display', sans-serif" }}
              >
                {value}
              </p>
              <p className="text-[14px] font-semibold text-white mb-1">{label}</p>
              <p className="text-[12px] text-[#9aa3bd] leading-snug">{sub}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

/* ── FAQ ── */
function FaqSection() {
  const [open, setOpen] = useState(0)
  return (
    <section id="faq" className="py-24 bg-[#021526]">
      <div className="max-w-[760px] mx-auto px-6">
        <SectionHead
          dark
          eyebrow="FAQ"
          title="Semua yang perlu diketahui sebelum mulai."
          subtitle="Versi singkat bagaimana Manava menjaga pekerjaan dan bayaran tetap adil."
        />
        <div className="divide-y divide-white/10 border-y border-white/10">
          {faqs.map(({ q, a }, i) => {
            const isOpen = open === i
            return (
              <div key={q}>
                <button
                  type="button"
                  onClick={() => setOpen(isOpen ? -1 : i)}
                  aria-expanded={isOpen}
                  className="w-full flex items-center justify-between gap-4 py-5 text-left group"
                >
                  <span className="text-[16px] font-semibold text-white tracking-[-0.01em]">{q}</span>
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-white/5 border border-white/15 flex items-center justify-center text-white group-hover:bg-[#D0F100] group-hover:text-[#021526] group-hover:border-[#D0F100] transition-colors">
                    {isOpen ? <Minus className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </span>
                </button>
                <div className={`grid transition-all duration-200 ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
                  <div className="overflow-hidden">
                    <p className="text-[14.5px] text-[#9aa3bd] leading-[1.65] pb-5 pr-10 max-w-[60ch]">{a}</p>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

/* ── Final CTA (dark) ── */
function FinalCta() {
  return (
    <section className="bg-[#021526]">
      <div className="relative max-w-[720px] mx-auto px-6 text-center py-32">
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D0F100] mb-6">Gabung</p>
        <h2
          className="text-[clamp(2.1rem,4.8vw,3.4rem)] font-bold tracking-[-0.035em] text-white leading-[1.08] mb-5"
          style={{ fontFamily: "'Inter Display', sans-serif" }}
        >
          Berkarier di studio
          <br />
          yang adil hari ini.
        </h2>
        <p className="text-[#9aa3bd] text-[16px] mb-10 leading-[1.7] max-w-[520px] mx-auto">
          Kirim lamaran Anda sebagai editor — tanpa perlu akun. Begitu diterima,
          akun Anda dibuat otomatis lengkap dengan ESS, KPI, dan slip gaji yang transparan.
        </p>
        <Link
          to="/apply"
          className="group inline-flex items-center gap-2.5 bg-[#D0F100] hover:brightness-105 text-[#021526] font-semibold px-8 py-4 rounded-full text-[15px] transition-all duration-200 shadow-[0_8px_44px_-6px_rgba(208,241,0,0.75)]"
        >
          Gabung Sekarang
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
        </Link>
        <p className="mt-5 text-[12.5px] text-white/40">
          Lamar tanpa akun · Seleksi transparan · Kabar via email
        </p>
      </div>
    </section>
  )
}

/* ── Footer ── */
const footerCols: { title: string; links: { label: string; href: string }[] }[] = [
  { title: 'Platform', links: [
    { label: 'Fitur', href: '#platform' },
    { label: 'Cara Kerja', href: '#how-it-works' },
    { label: 'Peran', href: '#roles' },
    { label: 'FAQ', href: '#faq' },
  ] },
  { title: 'Modul', links: [
    { label: 'Lowongan Pekerjaan', href: '/apply' },
    { label: 'Rekrutmen', href: '/recruitment' },
    { label: 'Presensi & Cuti', href: '/attendance' },
    { label: 'KPI Kinerja', href: '/performance' },
  ] },
  { title: 'Legal', links: [
    { label: 'Ketentuan', href: '#' },
    { label: 'Privasi', href: '#' },
    { label: 'Keamanan', href: '#' },
  ] },
]

/* brand glyphs (lucide dropped brand icons) — simple-icons paths, 24×24, currentColor */
const LinkedInIcon: IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M20.45 20.45h-3.55v-5.57c0-1.33-.03-3.04-1.85-3.04-1.86 0-2.14 1.45-2.14 2.94v5.67H9.35V9h3.41v1.56h.05c.48-.9 1.64-1.85 3.37-1.85 3.6 0 4.27 2.37 4.27 5.46v6.28zM5.34 7.43a2.06 2.06 0 1 1 0-4.13 2.06 2.06 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56v11.45zM22.22 0H1.77C.79 0 0 .77 0 1.73v20.54C0 23.23.79 24 1.77 24h20.45c.98 0 1.78-.77 1.78-1.73V1.73C24 .77 23.2 0 22.22 0z" />
  </svg>
)
const XIcon: IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M18.24 2.25h3.31l-7.23 8.26 8.5 11.24h-6.66l-5.21-6.82-5.97 6.82H1.68l7.73-8.84L1.25 2.25h6.83l4.71 6.23 5.45-6.23zm-1.16 17.52h1.83L7.08 4.13H5.12l11.96 15.64z" />
  </svg>
)
const InstagramIcon: IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M12 2.16c3.2 0 3.58.01 4.85.07 3.25.15 4.77 1.69 4.92 4.92.06 1.27.07 1.65.07 4.85 0 3.2-.01 3.58-.07 4.85-.15 3.23-1.66 4.77-4.92 4.92-1.27.06-1.64.07-4.85.07-3.2 0-3.58-.01-4.85-.07-3.26-.15-4.77-1.7-4.92-4.92-.06-1.27-.07-1.64-.07-4.85 0-3.2.01-3.58.07-4.85.15-3.23 1.66-4.77 4.92-4.92C8.42 2.17 8.8 2.16 12 2.16zM12 0C8.74 0 8.33.01 7.05.07 2.7.27.27 2.69.07 7.05.01 8.33 0 8.74 0 12s.01 3.67.07 4.95c.2 4.36 2.62 6.78 6.98 6.98C8.33 23.99 8.74 24 12 24s3.67-.01 4.95-.07c4.35-.2 6.78-2.62 6.98-6.98.06-1.28.07-1.69.07-4.95s-.01-3.67-.07-4.95c-.2-4.36-2.62-6.78-6.98-6.98C15.67.01 15.26 0 12 0zm0 5.84a6.16 6.16 0 1 0 0 12.32 6.16 6.16 0 0 0 0-12.32zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.41-11.85a1.44 1.44 0 1 0 0 2.88 1.44 1.44 0 0 0 0-2.88z" />
  </svg>
)
const YouTubeIcon: IconType = (props) => (
  <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden {...props}>
    <path d="M23.5 6.19a3.02 3.02 0 0 0-2.12-2.14C19.5 3.55 12 3.55 12 3.55s-7.5 0-9.38.5A3.02 3.02 0 0 0 .5 6.19C0 8.07 0 12 0 12s0 3.93.5 5.81a3.02 3.02 0 0 0 2.12 2.14c1.88.5 9.38.5 9.38.5s7.5 0 9.38-.5a3.02 3.02 0 0 0 2.12-2.14C24 15.93 24 12 24 12s0-3.93-.5-5.81zM9.55 15.57V8.43L15.82 12l-6.27 3.57z" />
  </svg>
)

const socials: { icon: IconType; label: string; href: string }[] = [
  { icon: LinkedInIcon, label: 'LinkedIn', href: '#' },
  { icon: XIcon, label: 'X', href: '#' },
  { icon: InstagramIcon, label: 'Instagram', href: '#' },
  { icon: YouTubeIcon, label: 'YouTube', href: '#' },
]

function Footer() {
  return (
    <footer className="bg-[#021526] text-white">
      <div className="max-w-[1140px] mx-auto px-6">
        {/* logo + careers CTA + live status */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 py-12">
          <img src={logoLight} alt="Manava" className="h-7 w-auto object-contain object-left" />
          <div className="flex items-center gap-5">
            <span className="hidden sm:inline-flex items-center gap-2.5 text-[13px] text-white/70">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inline-flex h-full w-full rounded-full bg-[#10B981] opacity-60 animate-ping motion-reduce:animate-none" />
                <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#10B981]" />
              </span>
              Semua sistem beroperasi
            </span>
          </div>
        </div>

        <div className="h-px bg-white/10" />

        {/* link columns + socials */}
        <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-10 py-12">
          <nav aria-label="Footer" className="grid grid-cols-2 sm:grid-cols-3 gap-x-16 gap-y-9">
            {footerCols.map(col => (
              <div key={col.title}>
                <h3
                  className="text-[13px] font-semibold text-white mb-4"
                  style={{ fontFamily: "'Inter Display', sans-serif" }}
                >
                  {col.title}
                </h3>
                <ul className="space-y-2.5">
                  {col.links.map(l => (
                    <li key={l.label}>
                      <a
                        href={l.href}
                        className="text-[14px] text-white/55 hover:text-white transition-colors duration-150"
                      >
                        {l.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            {socials.map(({ icon: Icon, label, href }) => (
              <a
                key={label}
                href={href}
                aria-label={label}
                className="w-9 h-9 rounded-full border border-white/10 flex items-center justify-center text-white/60 hover:text-[#021526] hover:bg-[#D0F100] hover:border-[#D0F100] transition-colors duration-150"
              >
                <Icon className="w-[18px] h-[18px]" />
              </a>
            ))}
          </div>
        </div>

        {/* attribution */}
        <div className="border-t border-white/10 py-7 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-white/40 text-[12px]">© 2026 Manava · Hak cipta dilindungi.</p>
          <p className="text-white/40 text-[12px] text-center">
            Kelompok 5 · Universitas Islam Indonesia · ISD Project v2.2
          </p>
        </div>
      </div>
    </footer>
  )
}

/* ── Shared section header ── */
function SectionHead({ eyebrow, title, subtitle, dark }: { eyebrow: string; title: string; subtitle: string; dark?: boolean }) {
  return (
    <header className="mb-12 max-w-[560px]">
      <p className={`text-[11px] font-semibold uppercase tracking-[0.16em] mb-4 ${dark ? 'text-[#D0F100]' : 'text-[#9aa3bd]'}`}>
        {eyebrow}
      </p>
      <h2
        className={`text-[clamp(1.85rem,4vw,2.85rem)] font-bold tracking-[-0.03em] leading-[1.12] mb-4 ${dark ? 'text-white' : 'text-[#021526]'}`}
        style={{ fontFamily: "'Inter Display', sans-serif" }}
      >
        {title}
      </h2>
      <p className={`text-[15px] leading-relaxed ${dark ? 'text-[#9aa3bd]' : 'text-[#596074]'}`}>{subtitle}</p>
    </header>
  )
}
