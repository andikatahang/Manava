import { Link } from 'react-router-dom'
import {
  Scissors, Shield, FileText, Users, BarChart2, MessageSquare,
  ArrowRight, CheckCircle, ChevronRight, Lock,
} from 'lucide-react'

type Feature = {
  icon: typeof Scissors
  title: string
  tag: string
  desc: string
}

type Role = {
  role: string
  initial: string
  color: string
  points: string[]
}

type Stat = {
  value: string
  label: string
  sub: string
}

const features: Feature[] = [
  {
    icon: Users,
    title: 'Smart Recruitment',
    tag: 'ATS + DSS',
    desc: 'Structured applicant pipeline with AI-powered department scoring. Objective fit assessment, not guesswork.',
  },
  {
    icon: FileText,
    title: 'Revision Envelope',
    tag: 'Scope Control',
    desc: 'Lock service scope with INCLUDED / EXCLUDED / ALLOWANCE framework. Editors and clients always know the rules.',
  },
  {
    icon: Shield,
    title: 'Dual-Phase Escrow',
    tag: 'Secure Payments',
    desc: '50% DP on contract approval, 50% on delivery acceptance. Auto-released within 1 hour of completion.',
  },
  {
    icon: BarChart2,
    title: 'Integrated KPI & Payroll',
    tag: 'Performance',
    desc: 'Client rating + completion rate + manager assessment → fair performance bands. Bonuses from real data.',
  },
  {
    icon: MessageSquare,
    title: 'AI Revision Classifier',
    tag: '≥85% Accuracy',
    desc: 'Classify revisions as minor (free) or major (paid) with AI-powered change detection.',
  },
  {
    icon: Lock,
    title: 'Dispute Resolution',
    tag: '48h SLA',
    desc: 'Mediator auto-assigned within 2h. Evidence-backed decisions with an immutable audit trail.',
  },
]

const roles: Role[] = [
  { role: 'Superadmin', initial: 'S', color: '#6366F1', points: ['Full platform control', 'Recruitment pipeline', 'Payroll & HR ops', 'Revenue reporting'] },
  { role: 'Editor', initial: 'E', color: '#3B82F6', points: ['View assigned projects', 'Submit deliverables', 'ESS: leave & payslips', 'Track KPI & bonuses'] },
  { role: 'Client', initial: 'C', color: '#10B981', points: ['Search & book editors', 'Approve briefs & scopes', 'Track revision status', 'Secure escrow payments'] },
  { role: 'Mediator', initial: 'M', color: '#F59E0B', points: ['Review dispute evidence', 'AI change detection', 'Issue binding decisions', 'Immutable resolution log'] },
  { role: 'Admin Manager', initial: 'A', color: '#EC4899', points: ['Approve leave requests', 'Rate editor performance', 'Monitor attendance', 'Manage team KPIs'] },
  { role: 'Finance', initial: 'F', color: '#06B6D4', points: ['Escrow reconciliation', 'Revenue recognition', 'Payroll processing', 'IFRS 15 compliance'] },
]

const stats: Stat[] = [
  { value: '11', label: 'Modules', sub: 'HR to Finance, all connected' },
  { value: '6', label: 'User roles', sub: 'Granular access control' },
  { value: '48h', label: 'Dispute SLA', sub: 'Mediator auto-assigned' },
  { value: '≥85%', label: 'AI accuracy', sub: 'Revision classification' },
]

const partners = ['Metalab', 'Figma', 'Meta', 'Airbnb', 'Revolut']

export default function LandingPage() {
  return (
    <div
      className="min-h-screen bg-white text-[#0A0A0A]"
      style={{ fontFamily: "'Open Runde', 'Inter', -apple-system, sans-serif" }}
    >

      {/* ── Nav ── */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-[#EBEBEB]">
        <nav aria-label="Main navigation" className="max-w-[1120px] mx-auto px-6 h-[60px] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-[10px] bg-[#0A0A0A] flex items-center justify-center">
              <Scissors className="w-[15px] h-[15px] text-white" />
            </div>
            <span className="font-semibold text-[15px] tracking-tight">FairCut</span>
          </div>

          <div className="hidden md:flex items-center gap-0.5">
            {['Features', 'Modules', 'About'].map(item => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-[14px] text-[#737373] hover:text-[#0A0A0A] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-all duration-150"
              >
                {item}
              </a>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/login"
              className="text-[14px] text-[#737373] hover:text-[#0A0A0A] px-3 py-1.5 rounded-lg hover:bg-[#F5F5F5] transition-all duration-150"
            >
              Log in
            </Link>
            <Link
              to="/login"
              className="text-[14px] font-medium text-white bg-[#0A0A0A] hover:bg-[#262626] px-4 py-[7px] rounded-full transition-all duration-150"
            >
              Get Started
            </Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ── */}
      <section aria-labelledby="hero-heading" className="pt-[88px] pb-24 text-center">
        <div className="max-w-[760px] mx-auto px-6">
          {/* Brand icon */}
          <div className="inline-flex items-center justify-center w-[68px] h-[68px] rounded-[20px] bg-[#0A0A0A] mb-8 shadow-[0_12px_40px_rgba(0,0,0,0.18)]">
            <Scissors className="w-[30px] h-[30px] text-white" />
          </div>

          <h1
            id="hero-heading"
            className="text-[clamp(2.8rem,8vw,5.5rem)] font-extrabold leading-[1.04] tracking-[-0.04em] text-[#0A0A0A] mb-6"
            style={{ fontFamily: "'Inter Display', 'Open Runde', sans-serif" }}
          >
            Where Fair Revisions
            <br />
            Meet Fair Pay.
          </h1>

          <p className="text-[clamp(1rem,1.8vw,1.125rem)] text-[#737373] max-w-[500px] mx-auto mb-10 leading-[1.7]">
            FairCut unifies HR management and service delivery for visual studios — scope certainty, secure payments, and objective dispute resolution.
          </p>

          {/* CTAs */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-20">
            <Link
              to="/login"
              className="group flex items-center gap-2 bg-[#0A0A0A] hover:bg-[#262626] text-white font-semibold px-7 py-3 rounded-full text-[15px] transition-all duration-200"
            >
              Launch App
              <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
            </Link>
            <a
              href="#features"
              className="flex items-center gap-1.5 border border-[#E5E5E5] hover:border-[#D4D4D4] hover:bg-[#FAFAFA] text-[#0A0A0A] font-medium px-7 py-3 rounded-full text-[15px] transition-all duration-200"
            >
              See Features <ChevronRight className="w-4 h-4" />
            </a>
          </div>

          {/* Social proof */}
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#ADADAD] mb-5">
            Trusted by visual service teams at
          </p>
          <div className="flex items-center justify-center gap-8 flex-wrap">
            {partners.map(name => (
              <span key={name} className="text-[15px] font-semibold text-[#0A0A0A] opacity-25 tracking-tight">
                {name}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* ── Stats strip ── */}
      <div className="border-y border-[#EBEBEB] bg-[#FAFAFA]">
        <div className="max-w-[1120px] mx-auto px-6 py-14">
          <div className="grid grid-cols-2 md:grid-cols-4">
            {stats.map(({ value, label, sub }, i) => (
              <div
                key={label}
                className={`text-center px-6 py-2 ${i === 1 || i === 3 ? 'border-l border-[#EBEBEB]' : ''} ${i === 2 ? 'md:border-l md:border-[#EBEBEB]' : ''}`}
              >
                <p
                  className="text-[clamp(2.5rem,5vw,3.75rem)] font-black tracking-[-0.05em] text-[#0A0A0A] leading-none mb-2"
                  style={{ fontFamily: "'Inter Display', sans-serif" }}
                >
                  {value}
                </p>
                <p className="text-[14px] font-semibold text-[#0A0A0A] mb-1">{label}</p>
                <p className="text-[12px] text-[#ADADAD] leading-snug">{sub}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Features ── */}
      <section id="features" className="py-24">
        <div className="max-w-[1120px] mx-auto px-6">
          <header className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ADADAD] mb-4">Platform</p>
            <h2
              className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.03em] text-[#0A0A0A] max-w-[480px] leading-[1.15]"
              style={{ fontFamily: "'Inter Display', sans-serif" }}
            >
              Everything your visual studio needs.
            </h2>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {features.map(({ icon: Icon, title, tag, desc }) => (
              <article
                key={title}
                className="group p-6 rounded-2xl bg-[#F5F5F5] hover:bg-[#EFEFEF] transition-colors duration-200 cursor-default"
              >
                <div className="flex items-start justify-between mb-5">
                  <div className="w-10 h-10 rounded-xl bg-white shadow-[0_1px_4px_rgba(0,0,0,0.08)] border border-[#EBEBEB] flex items-center justify-center">
                    <Icon className="w-5 h-5 text-[#0A0A0A]" />
                  </div>
                  <span className="text-[11px] font-medium text-[#ADADAD] bg-white border border-[#EBEBEB] px-2.5 py-1 rounded-full whitespace-nowrap">
                    {tag}
                  </span>
                </div>
                <h3 className="font-semibold text-[#0A0A0A] text-[15px] mb-2 tracking-tight">{title}</h3>
                <p className="text-[13px] text-[#737373] leading-[1.6]">{desc}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Roles ── */}
      <section id="modules" className="py-24 bg-[#FAFAFA] border-t border-[#EBEBEB]">
        <div className="max-w-[1120px] mx-auto px-6">
          <header className="mb-12">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#ADADAD] mb-4">Access Control</p>
            <h2
              className="text-[clamp(1.8rem,4vw,2.75rem)] font-bold tracking-[-0.03em] text-[#0A0A0A] max-w-[480px] leading-[1.15] mb-4"
              style={{ fontFamily: "'Inter Display', sans-serif" }}
            >
              Built for every role.
            </h2>
            <p className="text-[#737373] text-[15px] max-w-[380px] leading-relaxed">
              Each user sees exactly what they need — nothing more, nothing less.
            </p>
          </header>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {roles.map(({ role, initial, color, points }) => (
              <article
                key={role}
                className="p-6 rounded-2xl bg-white border border-[#EBEBEB] hover:border-[#D4D4D4] hover:shadow-[0_2px_12px_rgba(0,0,0,0.06)] transition-all duration-200"
              >
                <div className="flex items-center gap-3 mb-5">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center text-white text-[13px] font-bold"
                    style={{ backgroundColor: color }}
                  >
                    {initial}
                  </div>
                  <h3 className="font-semibold text-[#0A0A0A] text-[15px] tracking-tight">{role}</h3>
                </div>
                <ul className="space-y-2.5">
                  {points.map(p => (
                    <li key={p} className="flex items-center gap-2.5 text-[13px] text-[#737373]">
                      <CheckCircle className="w-[14px] h-[14px] text-[#10B981] flex-shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="bg-[#0A0A0A] py-28">
        <div id="about" className="max-w-[660px] mx-auto px-6 text-center">
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/30 mb-6">Demo</p>
          <h2
            className="text-[clamp(1.8rem,4.5vw,3.25rem)] font-bold tracking-[-0.03em] text-white leading-[1.1] mb-5"
            style={{ fontFamily: "'Inter Display', sans-serif" }}
          >
            Ready to bring order
            <br />
            to your studio?
          </h2>
          <p className="text-[#737373] text-[15px] mb-10 leading-[1.7] max-w-[380px] mx-auto">
            Launch the demo and explore all 11 modules with full mock data. No setup required.
          </p>
          <Link
            to="/login"
            className="group inline-flex items-center gap-2.5 bg-white hover:bg-[#F5F5F5] text-[#0A0A0A] font-semibold px-8 py-4 rounded-full text-[15px] transition-all duration-200"
          >
            Launch FairCut Demo
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-[#EBEBEB] bg-white py-10">
        <div className="max-w-[1120px] mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-[8px] bg-[#0A0A0A] flex items-center justify-center">
              <Scissors className="w-[13px] h-[13px] text-white" />
            </div>
            <span className="font-semibold text-[14px] text-[#0A0A0A]">FairCut</span>
          </div>
          <p className="text-[#ADADAD] text-[12px] text-center">
            Kelompok 5 · Universitas Islam Indonesia · ISD Project v2.2
          </p>
          <p className="text-[#ADADAD] text-[12px]">© 2026 FairCut</p>
        </div>
      </footer>

    </div>
  )
}
