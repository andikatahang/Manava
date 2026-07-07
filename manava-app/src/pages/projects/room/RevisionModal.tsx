// Modal permintaan revisi klien. Alur wajib: tulis deskripsi perubahan →
// "Analisis dengan AI" → ringkasan kategori (minor/major) muncul → barulah
// tombol "Kirim Revisi ke Editor" aktif. Mengubah teks membatalkan hasil
// analisis sehingga teks yang dikirim selalu sama dengan yang dianalisis.

import { useState } from 'react'
import type { UseMutationResult } from '@tanstack/react-query'
import { Loader2, RefreshCw, Sparkles } from 'lucide-react'
import { Modal } from '../../../components/ui/Modal'
import { StatusBadge } from '../../../components/ui/Badge'
import type { RevisionClassification, RevisionEnvelope, RevisionRequest } from '../../../types'

const MIN_TEXT = 10

export function RevisionModal({ open, onClose, envelope, classify, submit }: {
  open: boolean
  onClose: () => void
  envelope: RevisionEnvelope | null
  classify: UseMutationResult<RevisionClassification, Error, string>
  submit: UseMutationResult<RevisionRequest, Error, {
    request_text: string
    ai_label: 'minor' | 'major' | 'uncertain'
    ai_confidence: number
    ai_summary: string
  }>
}) {
  const [text, setText] = useState('')
  const [analysis, setAnalysis] = useState<RevisionClassification | null>(null)

  const remaining = envelope ? envelope.allowance_count - envelope.allowance_consumed : 0
  const minorBlocked = analysis?.label === 'minor' && remaining <= 0
  const canAnalyze = text.trim().length >= MIN_TEXT && !classify.isPending
  const canSubmit = !!analysis && !minorBlocked && !submit.isPending

  function handleTextChange(value: string) {
    setText(value)
    // Teks berubah → hasil analisis lama tidak berlaku lagi.
    if (analysis) setAnalysis(null)
  }

  function runAnalysis() {
    if (!canAnalyze) return
    classify.mutate(text.trim(), { onSuccess: setAnalysis })
  }

  function handleSubmit() {
    if (!analysis || !canSubmit) return
    submit.mutate(
      {
        request_text: text.trim(),
        ai_label: analysis.label,
        ai_confidence: analysis.confidence,
        ai_summary: analysis.summary,
      },
      {
        onSuccess: () => {
          setText('')
          setAnalysis(null)
          onClose()
        },
      },
    )
  }

  return (
    <Modal open={open} onClose={onClose} title="Minta Revisi" size="lg">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-3 -mt-1">
          <p className="text-xs text-navy/55">
            Jelaskan perubahan yang Anda inginkan. AI akan mengkategorikan permintaan sebagai
            revisi <strong>minor</strong> (gratis, memakai jatah) atau <strong>major</strong> (di luar cakupan).
          </p>
          {envelope && (
            <span className={`shrink-0 text-[11px] font-semibold rounded-full px-2.5 py-1 ${remaining > 0 ? 'bg-navy/5 text-navy/70' : 'bg-red-50 text-red-600'}`}>
              Sisa jatah minor: {Math.max(0, remaining)}/{envelope.allowance_count}
            </span>
          )}
        </div>

        <div>
          <label className="label">Deskripsi perubahan</label>
          <textarea
            className="input min-h-[110px] resize-y"
            value={text}
            onChange={e => handleTextChange(e.target.value)}
            placeholder="mis. Warna langit di foto 3 dan 7 terlalu jenuh, tolong diturunkan sedikit agar natural…"
            maxLength={2000}
          />
          <p className="text-[11px] text-navy/40 mt-1">Minimal {MIN_TEXT} karakter.</p>
        </div>

        {/* Langkah 1: analisis AI */}
        {!analysis && (
          <button
            onClick={runAnalysis}
            disabled={!canAnalyze}
            className="btn-secondary w-full justify-center text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {classify.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Menganalisis permintaan…</>
              : <><Sparkles className="w-4 h-4" /> Analisis dengan AI</>}
          </button>
        )}
        {classify.isError && !analysis && (
          <p className="text-xs text-red-600">{classify.error.message}</p>
        )}

        {/* Langkah 2: ringkasan AI muncul → kirim bisa ditekan */}
        {analysis && (
          <div className="border border-violet-200 bg-violet-50/60 rounded-2xl p-4">
            <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-violet-700 mb-2">
              <Sparkles className="w-3.5 h-3.5" /> Ringkasan AI
              <span className="ml-auto font-medium normal-case tracking-normal text-violet-700/70">
                {analysis.source === 'openai' ? 'model AI' : 'aturan otomatis'}
              </span>
            </p>
            <div className="flex items-center gap-2">
              <StatusBadge status={analysis.label} />
              <span className="text-[11px] text-navy/50">keyakinan {(analysis.confidence * 100).toFixed(0)}%</span>
            </div>
            <p className="text-xs text-navy/75 mt-2 leading-relaxed">{analysis.summary}</p>

            <div className="mt-3 pt-3 border-t border-violet-200/60 text-[11.5px] leading-relaxed">
              {analysis.label === 'minor' && (remaining > 0 ? (
                <p className="text-navy/60">
                  Revisi ini <strong>gratis</strong> dan memakai 1 jatah revisi minor
                  ({envelope ? `${envelope.allowance_consumed + 1} dari ${envelope.allowance_count}` : '—'}).
                </p>
              ) : (
                <p className="text-red-600">
                  Jatah revisi minor sudah habis. Selesaikan proyek, atau diskusikan revisi berbayar
                  dengan editor melalui chat.
                </p>
              ))}
              {analysis.label === 'major' && (
                <p className="text-amber-700">
                  Revisi major berada <strong>di luar cakupan brief</strong> dan tidak memakai jatah minor —
                  editor dapat mengenakan biaya tambahan yang didiskusikan lewat chat.
                </p>
              )}
              {analysis.label === 'uncertain' && (
                <p className="text-navy/60">
                  Kategori belum pasti — permintaan tetap terkirim dan akan ditinjau manual sebelum
                  dihitung sebagai minor atau major.
                </p>
              )}
            </div>
          </div>
        )}

        {submit.isError && <p className="text-xs text-red-600">{submit.error.message}</p>}

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onClose} className="btn-secondary text-sm">Batal</button>
          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="btn-primary text-sm disabled:opacity-60 disabled:cursor-not-allowed"
            title={!analysis ? 'Jalankan analisis AI terlebih dahulu' : undefined}
          >
            {submit.isPending
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Mengirim…</>
              : <><RefreshCw className="w-4 h-4" /> Kirim Revisi ke Editor</>}
          </button>
        </div>
      </div>
    </Modal>
  )
}
