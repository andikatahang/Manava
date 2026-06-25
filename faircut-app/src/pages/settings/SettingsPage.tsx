import { useState } from 'react'
import { Settings, Bell, Shield, Database, Save, Building2 } from 'lucide-react'

type Tab = 'general' | 'projects' | 'notifications' | 'privacy'

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={`relative w-10 h-5 rounded-full transition-colors ${checked ? 'bg-navy' : 'bg-gray-200'}`}
    >
      <span className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-5' : ''}`} />
    </button>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-navy/50 uppercase tracking-wider mb-3">{title}</p>
      <div className="card space-y-0 p-0 divide-y divide-border">{children}</div>
    </div>
  )
}

function FieldRow({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-6 px-5 py-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-navy">{label}</p>
        {desc && <p className="text-xs text-navy/50 mt-0.5">{desc}</p>}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  )
}

export default function SettingsPage() {
  const [tab, setTab] = useState<Tab>('general')
  const [saved, setSaved] = useState(false)

  // General
  const [company, setCompany] = useState('FairCut Visual Services')
  const [timezone, setTimezone] = useState('Asia/Jakarta')
  const [currency, setCurrency] = useState('IDR')

  // Project defaults
  const [allowance, setAllowance] = useState('3')
  const [topupTimeout, setTopupTimeout] = useState('72')
  const [mediatorSla, setMediatorSla] = useState('48')
  const [escrowSla, setEscrowSla] = useState('1')
  const [aiThreshold, setAiThreshold] = useState('85')

  // Notifications
  const [notifRevision, setNotifRevision] = useState(true)
  const [notifEscrow, setNotifEscrow] = useState(true)
  const [notifDispute, setNotifDispute] = useState(true)
  const [notifLeave, setNotifLeave] = useState(false)
  const [notifPayroll, setNotifPayroll] = useState(true)
  const [emailDigest, setEmailDigest] = useState(false)

  // Privacy
  const [retention, setRetention] = useState('7')
  const [anonDays, setAnonDays] = useState('90')
  const [auditLog, setAuditLog] = useState(true)

  const TABS: { id: Tab; label: string; icon: typeof Settings }[] = [
    { id: 'general', label: 'General', icon: Building2 },
    { id: 'projects', label: 'Project Defaults', icon: Settings },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'privacy', label: 'Data & Privacy', icon: Shield },
  ]

  function handleSave() {
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-2xl space-y-6">
      {/* Tab bar */}
      <div className="flex gap-1 bg-white border border-border rounded-xl p-1 w-fit flex-wrap">
        {TABS.map(({ id, label, icon: Icon }) => (
          <button key={id} onClick={() => setTab(id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${tab === id ? 'bg-navy text-white' : 'text-navy/60 hover:text-navy'}`}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {/* General */}
      {tab === 'general' && (
        <div className="space-y-5">
          <Section title="Company">
            <FieldRow label="Company Name" desc="Shown on invoices and contracts">
              <input value={company} onChange={e => setCompany(e.target.value)} className="input w-56 py-2 text-sm" />
            </FieldRow>
            <FieldRow label="Timezone" desc="Used for all timestamps and SLA calculations">
              <select value={timezone} onChange={e => setTimezone(e.target.value)} className="input w-44 py-2 text-sm">
                <option value="Asia/Jakarta">Asia/Jakarta (WIB)</option>
                <option value="Asia/Makassar">Asia/Makassar (WITA)</option>
                <option value="Asia/Jayapura">Asia/Jayapura (WIT)</option>
                <option value="UTC">UTC</option>
              </select>
            </FieldRow>
            <FieldRow label="Currency" desc="Base currency for all transactions">
              <select value={currency} onChange={e => setCurrency(e.target.value)} className="input w-32 py-2 text-sm">
                <option value="IDR">IDR — Rupiah</option>
                <option value="USD">USD — Dollar</option>
                <option value="SGD">SGD — Singapore $</option>
              </select>
            </FieldRow>
          </Section>
        </div>
      )}

      {/* Project Defaults */}
      {tab === 'projects' && (
        <div className="space-y-5">
          <Section title="Revision Envelope">
            <FieldRow label="Default Free Allowance" desc="Free revision rounds included in every new project">
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="20" value={allowance} onChange={e => setAllowance(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">rounds</span>
              </div>
            </FieldRow>
            <FieldRow label="AI Confidence Threshold" desc="Below this % triggers mediator escalation">
              <div className="flex items-center gap-2">
                <input type="number" min="50" max="100" value={aiThreshold} onChange={e => setAiThreshold(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">%</span>
              </div>
            </FieldRow>
          </Section>
          <Section title="SLA Timers">
            <FieldRow label="Top-up Timeout" desc="Hours client has to pay for a MAJOR revision">
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="168" value={topupTimeout} onChange={e => setTopupTimeout(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">hours</span>
              </div>
            </FieldRow>
            <FieldRow label="Mediator SLA" desc="Hours mediator has to resolve a dispute">
              <div className="flex items-center gap-2">
                <input type="number" min="1" max="168" value={mediatorSla} onChange={e => setMediatorSla(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">hours</span>
              </div>
            </FieldRow>
            <FieldRow label="Escrow Release SLA" desc="Hours to release escrow after final payment received">
              <div className="flex items-center gap-2">
                <input type="number" min="0" max="24" value={escrowSla} onChange={e => setEscrowSla(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">hour(s)</span>
              </div>
            </FieldRow>
          </Section>
        </div>
      )}

      {/* Notifications */}
      {tab === 'notifications' && (
        <div className="space-y-5">
          <Section title="In-App Alerts">
            <FieldRow label="Revision Submitted" desc="When a client submits a new revision request">
              <Toggle checked={notifRevision} onChange={setNotifRevision} />
            </FieldRow>
            <FieldRow label="Escrow Movement" desc="DP received, final payment, release events">
              <Toggle checked={notifEscrow} onChange={setNotifEscrow} />
            </FieldRow>
            <FieldRow label="Dispute Opened" desc="When a dispute is raised on any project">
              <Toggle checked={notifDispute} onChange={setNotifDispute} />
            </FieldRow>
            <FieldRow label="Leave Request" desc="When an editor submits a leave request">
              <Toggle checked={notifLeave} onChange={setNotifLeave} />
            </FieldRow>
            <FieldRow label="Payroll Generated" desc="When monthly payslips are generated">
              <Toggle checked={notifPayroll} onChange={setNotifPayroll} />
            </FieldRow>
          </Section>
          <Section title="Email">
            <FieldRow label="Daily Digest" desc="Summary email of all activity sent at 08:00">
              <Toggle checked={emailDigest} onChange={setEmailDigest} />
            </FieldRow>
          </Section>
        </div>
      )}

      {/* Privacy */}
      {tab === 'privacy' && (
        <div className="space-y-5">
          <Section title="Data Retention">
            <FieldRow label="Finance Records" desc="Years to retain invoices, escrow logs, and payroll records (IFRS 15 minimum: 7 years)">
              <div className="flex items-center gap-2">
                <input type="number" min="5" max="15" value={retention} onChange={e => setRetention(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">years</span>
              </div>
            </FieldRow>
            <FieldRow label="Post-Offboarding Anonymization" desc="Days after offboarding before editor PII is anonymized">
              <div className="flex items-center gap-2">
                <input type="number" min="30" max="365" value={anonDays} onChange={e => setAnonDays(e.target.value)} className="input w-20 py-2 text-sm text-center" />
                <span className="text-sm text-navy/50">days</span>
              </div>
            </FieldRow>
          </Section>
          <Section title="Audit">
            <FieldRow label="Immutable Audit Log" desc="Record all scope changes, revision classifications, and payment events (cannot be disabled in production)">
              <Toggle checked={auditLog} onChange={setAuditLog} />
            </FieldRow>
          </Section>
          <div className="card bg-amber-50 border-amber-200 p-4">
            <div className="flex gap-3">
              <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-800">IFRS 15 Compliance Active</p>
                <p className="text-xs text-amber-700 mt-0.5">Revenue recognition events are logged immutably and cannot be altered. Contact your compliance officer before modifying retention settings.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Save button */}
      <div className="flex items-center gap-3">
        <button onClick={handleSave} className="btn-primary">
          <Save className="w-4 h-4" />{saved ? 'Saved!' : 'Save Changes'}
        </button>
        {saved && <span className="text-sm text-emerald-600 font-medium">Settings updated successfully.</span>}
      </div>
    </div>
  )
}
