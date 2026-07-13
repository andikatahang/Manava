// Email delivery with two transports, picked by configuration:
//
//   1. HTTPS API (Brevo or Resend) — REQUIRED in production: Railway blocks
//      outbound SMTP ports entirely (connect timeouts to any :587/:465), so
//      only port-443 API calls can actually deliver mail from there.
//   2. SMTP via Nodemailer — dev/self-hosted fallback (Mailpit, real relays).
//
// Without any configuration the mailer logs the message and reports
// delivered:false, so development machines and CI never depend on a provider.

import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'

export interface MailResult {
  delivered: boolean
  error?: string
  // True when the send outlived the HTTP wait budget and continues in the
  // background — the UI shows "sedang dikirim" instead of a hard failure.
  pending?: boolean
}

const HTTP_API_TIMEOUT_MS = 8_000

// MAIL_FROM is stored as "Manava HR <hr@manava.id>"; the APIs want the parts.
function parseFrom(): { name: string; email: string } {
  const raw = env.MAIL_FROM || env.SMTP_USER || 'Manava HR <no-reply@manava.id>'
  const match = raw.match(/^(.*)<([^>]+)>\s*$/)
  if (match) return { name: match[1].trim().replace(/^"|"$/g, '') || 'Manava HR', email: match[2].trim() }
  return { name: 'Manava HR', email: raw.trim() }
}

async function sendViaBrevo(to: string, subject: string, body: string): Promise<MailResult> {
  const sender = parseFrom()
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: { 'api-key': env.BREVO_API_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({ sender, to: [{ email: to }], subject, textContent: body }),
    signal: AbortSignal.timeout(HTTP_API_TIMEOUT_MS),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Brevo ${res.status}: ${detail.slice(0, 200)}`)
  }
  return { delivered: true }
}

async function sendViaResend(to: string, subject: string, body: string): Promise<MailResult> {
  const sender = parseFrom()
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY!}`, 'content-type': 'application/json' },
    body: JSON.stringify({ from: `${sender.name} <${sender.email}>`, to: [to], subject, text: body }),
    signal: AbortSignal.timeout(HTTP_API_TIMEOUT_MS),
  })
  if (!res.ok) {
    const detail = await res.text().catch(() => '')
    throw new Error(`Resend ${res.status}: ${detail.slice(0, 200)}`)
  }
  return { delivered: true }
}

// Host alone is enough: auth-less relays (Mailpit/MailHog in dev) are valid
// SMTP servers, so credentials are only attached when both halves are set.
const hasHttpApi = Boolean(env.BREVO_API_KEY || env.RESEND_API_KEY)
const isConfigured = hasHttpApi || Boolean(env.SMTP_HOST)
const hasAuth = Boolean(env.SMTP_USER && env.SMTP_PASS)

let transporter: Transporter | null = null
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // implicit TLS; 587 upgrades via STARTTLS
      ...(hasAuth ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
      // Routes await sendEmail before responding, so an unreachable SMTP host
      // (e.g. blocked egress) must fail in seconds — Nodemailer's defaults
      // (2-minute connect, 10-minute socket) hang the whole HTTP request.
      connectionTimeout: 5_000,
      greetingTimeout: 5_000,
      socketTimeout: 10_000,
      dnsTimeout: 5_000,
    })
  }
  return transporter
}

async function sendViaSmtp(to: string, subject: string, body: string): Promise<MailResult> {
  await getTransporter().sendMail({
    // `||` (not ??): compose passes unset vars as empty strings. The final
    // fallback covers auth-less relays where SMTP_USER is also empty.
    from: env.MAIL_FROM || env.SMTP_USER || 'Manava HR <no-reply@manava.id>',
    to,
    subject,
    text: body,
  })
  return { delivered: true }
}

// Failures never throw: callers must be able to finish their DB transition
// and surface delivered:false to the UI instead of aborting the workflow.
export async function sendEmail(to: string, subject: string, body: string): Promise<MailResult> {
  if (!isConfigured) {
    console.warn(`📧 [email skipped — mailer not configured] to=${to} subject="${subject}"`)
    return { delivered: false, error: 'Email belum dikonfigurasi' }
  }
  try {
    if (env.BREVO_API_KEY) return await sendViaBrevo(to, subject, body)
    if (env.RESEND_API_KEY) return await sendViaResend(to, subject, body)
    return await sendViaSmtp(to, subject, body)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown mailer error'
    console.error(`📧 [email failed] to=${to} subject="${subject}": ${message}`)
    return { delivered: false, error: message }
  }
}

// HR decision endpoints (shortlist/approve/reject) must never hang on the
// mail transport: wait briefly for a fast result, otherwise let the send
// finish in the background and tell the caller it is still in flight.
const MAX_HTTP_WAIT_MS = 2_500

export async function sendEmailBounded(
  to: string,
  subject: string,
  body: string,
): Promise<MailResult> {
  const send = sendEmail(to, subject, body)
  const timeout = new Promise<MailResult>(resolve => {
    const timer = setTimeout(
      () => resolve({ delivered: false, pending: true }),
      MAX_HTTP_WAIT_MS,
    )
    // Don't keep the process alive just for this timer.
    timer.unref?.()
  })
  const result = await Promise.race([send, timeout])
  if (result.pending) {
    // sendEmail already logs failures; log the late success for the audit trail.
    void send.then(r => {
      if (r.delivered) console.log(`📧 [email delivered late] to=${to} subject="${subject}"`)
    })
  }
  return result
}
