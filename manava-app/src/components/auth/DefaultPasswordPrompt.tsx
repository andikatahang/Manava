// Prompt shown after login to accounts still on the shared default password
// (auto-created editor accounts from recruitment approval). The user can
// update the password now or skip — skipping dismisses it for this session;
// it reappears on the next login until the password is actually changed.

import { useState } from 'react'
import { KeyRound, ShieldAlert } from 'lucide-react'
import { Modal } from '../ui/Modal'
import { changePassword } from '../../lib/leaveRequests'
import { ApiError } from '../../lib/api'
import type { User } from '../../types'

const MIN_PASSWORD_LENGTH = 8

export function DefaultPasswordPrompt({ user }: { user: User }) {
  const [dismissed, setDismissed] = useState(false)
  const [updated, setUpdated] = useState(false)
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const open = !!user.password_is_default && !dismissed && !updated
  if (!open) return null

  async function handleUpdate() {
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`Password baru minimal ${MIN_PASSWORD_LENGTH} karakter.`)
      return
    }
    if (next !== confirm) {
      setError('Konfirmasi password tidak sama.')
      return
    }
    setError(null)
    setSaving(true)
    try {
      await changePassword({ current_password: current, new_password: next })
      setUpdated(true)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Gagal memperbarui password — coba lagi.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Modal open onClose={() => setDismissed(true)} title="Amankan Akun Anda">
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-[13px] text-amber-900 leading-relaxed">
            Akun Anda masih memakai <span className="font-semibold">password default</span> yang
            diberikan saat diterima. Kami sarankan menggantinya sekarang agar akun tetap aman.
          </p>
        </div>

        <div>
          <label className="label">Password saat ini</label>
          <input
            type="password"
            className="input"
            value={current}
            onChange={e => setCurrent(e.target.value)}
            autoComplete="current-password"
          />
        </div>
        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <label className="label">Password baru</label>
            <input
              type="password"
              className="input"
              value={next}
              onChange={e => setNext(e.target.value)}
              autoComplete="new-password"
              placeholder={`Min. ${MIN_PASSWORD_LENGTH} karakter`}
            />
          </div>
          <div>
            <label className="label">Konfirmasi password baru</label>
            <input
              type="password"
              className="input"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              autoComplete="new-password"
            />
          </div>
        </div>

        {error && <p role="alert" className="text-xs text-red-600">{error}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className="btn-secondary" onClick={() => setDismissed(true)}>
            Lewati dulu
          </button>
          <button
            type="button"
            className="btn-primary disabled:opacity-40"
            disabled={!current || !next || !confirm || saving}
            onClick={handleUpdate}
          >
            <KeyRound className="w-4 h-4" />
            {saving ? 'Menyimpan…' : 'Perbarui Password'}
          </button>
        </div>
      </div>
    </Modal>
  )
}
