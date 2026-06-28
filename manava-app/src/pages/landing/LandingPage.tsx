import { useState, type FC, type SVGProps } from 'react'
import { Link } from 'react-router-dom'
import logoDark from '../../assets/logo-dark.png'
import logoLight from '../../assets/logo-light.png'
import { Card } from '../../components/ui/Card'
import {
  Sparkles, ArrowRight, ChevronRight, Check, Plus, Minus,
  Users, FileText, Shield, BarChart2, ScanLine, Scale,
  FileCheck2, PackageCheck, BadgeDollarSign, Briefcase,
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
  { icon: FileText, title: 'Revision Envelope', tag: 'Kontrol Lingkup',
    desc: 'Kunci setiap pekerjaan dengan kerangka INCLUDED / EXCLUDED / ALLOWANCE sebelum satu piksel pun bergerak.' },
  { icon: Shield, title: 'Dual-Phase Escrow', tag: 'Pembayaran Aman',
    desc: '50% saat kontrak disetujui, 50% saat hasil diterima — dicairkan otomatis dalam satu jam.' },
  { icon: ScanLine, title: 'AI Revision Classifier', tag: 'akurasi ≥85%',
    desc: 'Deteksi perubahan mengklasifikasi tiap revisi sebagai minor (gratis) atau major (berbayar), dengan bukti.' },
  { icon: Users, title: 'Smart Recruitment', tag: 'ATS + DSS',
    desc: 'Alur pelamar terstruktur dengan penilaian departemen yang objektif dan dibantu AI.' },
  { icon: BarChart2, title: 'Integrated KPI & Payroll', tag: 'Kinerja',
    desc: 'Rating klien, penyelesaian, dan penilaian manajer menyatu menjadi bonus yang adil berbasis data.' },
  { icon: Scale, title: 'Dispute Resolution', tag: 'SLA 48 jam',
    desc: 'Mediator ditugaskan otomatis dalam dua jam. Keputusan mengikat, jejak audit yang tak bisa diubah.' },
]

const steps: Step[] = [
  { icon: FileCheck2, step: '01', title: 'Pesan & Kunci Lingkup',
    desc: 'Klien memesan editor, Revision Envelope ditetapkan, dan brief ditandatangani secara digital.' },
  { icon: PackageCheck, step: '02', title: 'Kerjakan & Klasifikasi',
    desc: 'Editor bekerja dalam lingkup yang disepakati. Tiap revisi diklasifikasi — minor atau major — secara otomatis.' },
  { icon: BadgeDollarSign, step: '03', title: 'Cairkan Pembayaran',
    desc: 'Saat hasil diterima, tahap escrow terakhir dicairkan ke perusahaan dalam waktu kurang dari satu jam.' },
]

const roles: Role[] = [
  { role: 'Superadmin', initial: 'S', color: '#0050F8', points: ['Kendali penuh platform', 'Alur rekrutmen', 'Operasi penggajian & HR', 'Pelaporan pendapatan'] },
  { role: 'Editor', initial: 'E', color: '#3B82F6', points: ['Lihat proyek yang ditugaskan', 'Kirim hasil kerja', 'ESS: cuti & slip gaji', 'Lacak KPI & bonus'] },
  { role: 'Klien', initial: 'C', color: '#10B981', points: ['Cari & pesan editor', 'Setujui brief & lingkup', 'Lacak status revisi', 'Pembayaran escrow aman'] },
  { role: 'Mediator', initial: 'M', color: '#F59E0B', points: ['Tinjau bukti sengketa', 'Deteksi perubahan AI', 'Terbitkan keputusan mengikat', 'Log penyelesaian tak terubah'] },
  { role: 'Manajer Admin', initial: 'A', color: '#EC4899', points: ['Setujui permohonan cuti', 'Nilai kinerja editor', 'Pantau absensi', 'Kelola KPI tim'] },
  { role: 'Keuangan', initial: 'F', color: '#06B6D4', points: ['Rekonsiliasi escrow', 'Pengakuan pendapatan', 'Pemrosesan penggajian', 'Kepatuhan IFRS 15'] },
]

const stats: Stat[] = [
  { value: '11', label: 'Modul', sub: 'HR hingga Keuangan, semua terhubung' },
  { value: '6', label: 'Peran pengguna', sub: 'Kontrol akses granular' },
  { value: '48 jam', label: 'SLA Sengketa', sub: 'Mediator ditugaskan otomatis' },
  { value: '≥85%', label: 'Akurasi AI', sub: 'Klasifikasi revisi' },
]

const faqs: Faq[] = [
  { q: 'Bagaimana Revision Envelope menjaga lingkup tetap adil?',
    a: 'Setiap proyek menetapkan apa yang INCLUDED, EXCLUDED, dan ALLOWANCE putaran gratis. Setelah brief ditandatangani, batasannya terkunci dan terlihat oleh kedua pihak — sehingga "perubahan kecil" tidak diam-diam menjadi pekerjaan ulang tanpa bayaran.' },
  { q: 'Kapan uang benar-benar berpindah?',
    a: 'DP 50% ditahan di escrow saat kontrak disetujui. 50% sisanya ditagih sebelum pengiriman dan dicairkan ke perusahaan dalam satu jam setelah klien menerima hasil kerja.' },
  { q: 'Apa yang terjadi jika AI ragu menilai sebuah revisi?',
    a: 'Jika tingkat keyakinan klasifikasi turun di bawah 85%, revisi ditandai untuk mediator manusia. Setiap keputusan — AI maupun manual — dicatat beserta buktinya untuk jejak audit.' },
  { q: 'Bagaimana kompensasi editor dihitung?',
    a: 'KPI memadukan rating klien, tingkat penyelesaian tepat waktu, dan penilaian manajer tiap kuartal. Tingkatan itu menentukan bonus proyek, sehingga bayaran mengikuti kinerja terukur, bukan opini.' },
  { q: 'Apakah ini sekadar demo atau sistem lengkap?',
    a: 'Versi ini menjalankan seluruh 11 modul secara menyeluruh dengan data tiruan yang realistis — tanpa perlu setup. Anda bisa menelusuri pemesanan, pengiriman, klasifikasi, dan pencairan sebagai salah satu dari enam peran.' },
]

const partners = ['Aperture', 'Frame & Co', 'Studio Nord', 'Pixelwright', 'Lumen Labs']

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-[#FBFBFB] text-[#1a1a1a] antialiased"
      style={{ fontFamily: "'Open Runde', 'Inter', -apple-system, sans-serif" }}
    >
      <Nav />
      <Hero />
      <Features />
      <LogoCloud />
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
      style={{
        background:
          'linear-gradient(180deg, rgba(2,21,38,1) 10%, rgba(8,38,68,1) 30%, rgba(17,60,103,1) 50%, rgba(96,154,212,1) 80%, rgba(251,251,251,1) 100%)',
      }}
    >
      {/* atmospheric glow near the top */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 -top-32 h-[560px]"
        style={{ background: 'radial-gradient(55% 55% at 50% 0%, rgba(120,160,255,0.38) 0%, rgba(31,87,240,0) 70%)' }}
      />
      {/* faint diagonal sheen, echoing the reference */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{ background: 'repeating-linear-gradient(58deg, transparent 0 38px, rgba(255,255,255,0.9) 38px 39px)' }}
      />
      <div className="relative max-w-[860px] mx-auto px-6 pt-24 pb-56 text-center">
        <span className="inline-flex items-center gap-2 text-[12px] font-medium text-white/80 bg-white/10 border border-white/15 px-3.5 py-1.5 rounded-full mb-8">
          <Sparkles className="w-3.5 h-3.5 text-[#D0F100]" />
          ERP untuk Studio Visual Skala Kecil
        </span>

        <h1
          id="hero-heading"
          className="text-[clamp(2.9rem,7vw,5.25rem)] font-bold leading-[1.03] tracking-[-0.04em] text-white mb-7"
          style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
        >
          Dari Brief ke Pembayaran,
          <br />
          Otomatis &amp; <span className="text-[#D0F100]">Adil</span>.
        </h1>

        <p className="text-[clamp(1rem,1.8vw,1.18rem)] text-[#dde7fb] max-w-[560px] mx-auto mb-10 leading-[1.65]">
          Manava menyatukan HR, pengerjaan layanan, dan keuangan untuk studio visual —
          kepastian lingkup, pembayaran escrow yang aman, dan penyelesaian sengketa yang objektif.
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 mb-16">
          <Link
            to="/login"
            className="group inline-flex items-center gap-2 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-7 py-3.5 rounded-full text-[15px] transition-all duration-200"
          >
            Coba Demo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
          <a
            href="#how-it-works"
            className="inline-flex items-center gap-1.5 border border-white/15 hover:border-white/30 hover:bg-white/5 text-white font-medium px-7 py-3.5 rounded-full text-[15px] transition-all duration-200"
          >
            Lihat cara kerja <ChevronRight className="w-4 h-4" />
          </a>
        </div>

        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
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
                  <div className="w-12 h-12 rounded-[8px] bg-[#021526] flex items-center justify-center transition-transform duration-200 group-hover:-translate-y-0.5">
                    <Icon className="w-5 h-5 text-white" />
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

/* ── Logo cloud ── */
function LogoCloud() {
  return (
    <section className="border-y border-[#EDEDED] bg-[#FAFAFA]">
      <div className="max-w-[1140px] mx-auto px-6 py-12">
        <p className="text-center text-[11px] font-semibold uppercase tracking-[0.18em] text-[#9aa3bd] mb-7">
          Dipercaya oleh tim yang membangun studio lebih adil
        </p>
        <div className="flex items-center justify-center gap-x-12 gap-y-4 flex-wrap">
          {partners.map(name => (
            <span key={name} className="text-[17px] font-semibold text-[#021526] opacity-30 tracking-[-0.01em]"
              style={{ fontFamily: "'Inter Display', sans-serif" }}>
              {name}
            </span>
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
                <div className="w-14 h-14 rounded-full bg-[#fbfbfb] flex items-center justify-center">
                  <Icon className="w-6 h-6 text-[#021526]" />
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
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
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
        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-[#D0F100] mb-6">Mulai</p>
        <h2
          className="text-[clamp(2.1rem,4.8vw,3.4rem)] font-bold tracking-[-0.035em] text-white leading-[1.08] mb-5"
          style={{ fontFamily: "'Inter Display', sans-serif" }}
        >
          Mulai jalankan revisi
          <br />
          yang adil hari ini.
        </h2>
        <p className="text-[#9aa3bd] text-[16px] mb-4 leading-[1.7] max-w-[520px] mx-auto">
          Jelajahi seluruh 11 modul dengan data tiruan lengkap, masuk sebagai salah satu dari enam peran —
          telusuri sebuah pekerjaan dari pemesanan dan penguncian lingkup hingga pencairan escrow.
        </p>
        <p className="text-[#9aa3bd] text-[16px] mb-10 leading-[1.7] max-w-[520px] mx-auto">
          Lihat bagaimana Revision Envelope, klasifikasi AI, dan escrow dua tahap bekerja
          bersama dalam satu proyek. Tanpa akun, tanpa konfigurasi, tanpa instalasi.
        </p>
        <Link
          to="/login"
          className="group inline-flex items-center gap-2.5 bg-[#D0F100] hover:brightness-105 text-[#021526] font-semibold px-8 py-4 rounded-full text-[15px] transition-all duration-200 shadow-[0_8px_44px_-6px_rgba(208,241,0,0.75)]"
        >
          Coba Demo Manava
          <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
        </Link>
        <p className="mt-5 text-[12.5px] text-white/40">
          Gratis dijelajahi · Ganti peran kapan saja · Reset saat refresh
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
    { label: 'Rekrutmen', href: '/recruitment' },
    { label: 'Proyek', href: '/projects' },
    { label: 'Pembayaran', href: '/payments' },
    { label: 'Sengketa', href: '/disputes' },
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
            <Link
              to="/apply"
              className="inline-flex items-center gap-2 bg-[#D0F100] hover:brightness-95 text-[#021526] font-semibold px-5 py-2.5 rounded-full text-[14px] transition-all duration-200"
            >
              <Briefcase className="w-4 h-4" /> Lowongan Pekerjaan
            </Link>
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
