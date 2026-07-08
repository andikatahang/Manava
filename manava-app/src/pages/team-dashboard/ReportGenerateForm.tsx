// Form untuk Admin Manager generate laporan departemen bulanan

import { useState } from 'react'
import { FileText, Send, AlertCircle } from 'lucide-react'
import { useReportMutations } from '../../hooks/queries/useReports'
import { Modal } from '../../components/ui/Modal'
import { ApiError } from '../../lib/api'

interface ReportGenerateFormProps {
  onSuccess?: () => void
}

function getCurrentPeriod(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default function ReportGenerateForm({ onSuccess }: ReportGenerateFormProps) {
  const [period, setPeriod] = useState(getCurrentPeriod())
  const [notes, setNotes] = useState('')
  const [showPreview, setShowPreview] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const { createReport } = useReportMutations()

  function handleSubmit() {
    setError(null)
    if (!period) {
      setError('Pilih periode laporan')
      return
    }

    createReport.mutate(
      { period, manager_notes: notes || undefined },
      {
        onSuccess: () => {
          setSuccess(true)
          setNotes('')
          setTimeout(() => {
            setSuccess(false)
            setShowPreview(false)
            onSuccess?.()
          }, 2000)
        },
        onError: (err) => {
          const msg = err instanceof ApiError ? err.message : 'Gagal membuat laporan'
          setError(msg)
        },
      },
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-start gap-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-700">
          <FileText className="w-4 h-4 mt-0.5 shrink-0" />
          <p>✓ Laporan berhasil disimpan</p>
        </div>
      )}

      <div>
        <label className="label">Periode Laporan</label>
        <input
          type="month"
          value={period}
          onChange={e => setPeriod(e.target.value)}
          className="input w-full"
        />
        <p className="text-xs text-navy/50 mt-1">Laporan untuk periode yang dipilih</p>
      </div>

      <div>
        <label className="label">Catatan/Highlight (Opsional)</label>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          rows={4}
          placeholder="Tuliskan highlight, pencapaian, atau hal penting lainnya untuk periode ini..."
          className="input resize-none w-full"
        />
        <p className="text-xs text-navy/50 mt-1">Catatan ini akan ditampilkan di laporan</p>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={() => setShowPreview(true)}
          className="btn-secondary"
          disabled={createReport.isPending}
        >
          Preview
        </button>
        <button
          onClick={handleSubmit}
          className="btn-primary"
          disabled={createReport.isPending}
        >
          <Send className="w-4 h-4" />
          {createReport.isPending ? 'Memproses…' : 'Buat & Kirim Laporan'}
        </button>
      </div>

      {/* Preview Modal */}
      <Modal
        open={showPreview}
        onClose={() => setShowPreview(false)}
        title="Preview Laporan"
        size="lg"
      >
        <div className="space-y-4 text-sm">
          <p className="text-navy/60">
            Laporan untuk periode <strong>{period}</strong> akan berisi ringkasan aktivitas departemen Anda:
          </p>
          <ul className="space-y-2 list-disc list-inside text-navy/70">
            <li>Statistik kehadiran (Present, Late, Absent, Leave)</li>
            <li>Ringkasan KPI tim (rata-rata, distribusi band)</li>
            <li>Ringkasan cuti/izin (approved, rejected, pending)</li>
            <li>Ringkasan peringatan kerja (total, tipe, repeat offenders)</li>
            <li>Catatan dari manajer</li>
          </ul>
          <p className="text-navy/50 text-xs italic">
            Semua metrik dihitung otomatis dari data sistem. Data akan disimpan permanen sebagai arsip.
          </p>
          <div className="flex gap-2 justify-end pt-4 border-t border-border">
            <button onClick={() => setShowPreview(false)} className="btn-secondary">Kembali</button>
            <button onClick={handleSubmit} className="btn-primary" disabled={createReport.isPending}>
              {createReport.isPending ? 'Memproses…' : 'Lanjutkan & Kirim'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
