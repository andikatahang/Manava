// Real SMTP delivery via Nodemailer. Configuration is optional: without
// SMTP_* env vars the mailer logs the message and reports delivered:false,
// so development machines and CI never depend on an email provider.

import nodemailer, { type Transporter } from 'nodemailer'
import { env } from '../config/env.js'

export interface MailResult {
  delivered: boolean
  error?: string
}

// Host alone is enough: auth-less relays (Mailpit/MailHog in dev) are valid
// SMTP servers, so credentials are only attached when both halves are set.
const isConfigured = Boolean(env.SMTP_HOST)
const hasAuth = Boolean(env.SMTP_USER && env.SMTP_PASS)

let transporter: Transporter | null = null
function getTransporter(): Transporter {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // implicit TLS; 587 upgrades via STARTTLS
      ...(hasAuth ? { auth: { user: env.SMTP_USER, pass: env.SMTP_PASS } } : {}),
    })
  }
  return transporter
}

// Failures never throw: callers must be able to finish their DB transition
// and surface delivered:false to the UI instead of aborting the workflow.
export async function sendEmail(to: string, subject: string, body: string): Promise<MailResult> {
  if (!isConfigured) {
    console.warn(`📧 [email skipped — SMTP not configured] to=${to} subject="${subject}"`)
    return { delivered: false, error: 'SMTP belum dikonfigurasi' }
  }
  try {
    await getTransporter().sendMail({
      // `||` (not ??): compose passes unset vars as empty strings. The final
      // fallback covers auth-less relays where SMTP_USER is also empty.
      from: env.MAIL_FROM || env.SMTP_USER || 'Manava HR <no-reply@manava.id>',
      to,
      subject,
      text: body,
    })
    return { delivered: true }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown SMTP error'
    console.error(`📧 [email failed] to=${to} subject="${subject}": ${message}`)
    return { delivered: false, error: message }
  }
}
