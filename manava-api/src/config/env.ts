import 'dotenv/config'
import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url({ message: 'DATABASE_URL harus URL Postgres yang valid' }),
  JWT_ACCESS_SECRET: z.string().min(24, 'JWT_ACCESS_SECRET minimal 24 karakter'),
  JWT_REFRESH_SECRET: z.string().min(24, 'JWT_REFRESH_SECRET minimal 24 karakter'),
  ACCESS_TOKEN_TTL: z.string().default('15m'),
  REFRESH_TOKEN_TTL_DAYS: z.coerce.number().int().positive().default(7),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(10),

  // ── Optional integrations — the API boots without them ─────────────────────
  // SMTP: when unset, emails are logged to stdout and flagged email_sent:false.
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.coerce.number().int().positive().default(587),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  MAIL_FROM: z.string().optional(), // e.g. "Manava HR <hr@manava.id>"
  // OpenAI: when unset, candidate insight falls back to the deterministic heuristic.
  OPENAI_API_KEY: z.string().optional(),
  // Login URL embedded in the credentials email for newly approved editors.
  APP_URL: z.string().default('http://localhost:5173'),
})

const parsed = envSchema.safeParse(process.env)
if (!parsed.success) {
  console.error('❌ Invalid environment variables:')
  console.error(parsed.error.flatten().fieldErrors)
  process.exit(1)
}

export const env = parsed.data
