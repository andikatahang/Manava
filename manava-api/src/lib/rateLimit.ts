// Shared rate limiters. In-memory store — adequate for a single API instance;
// swap in a Redis store before scaling horizontally.

import rateLimit from 'express-rate-limit'
import { fail } from './response.js'

const MINUTE = 60 * 1000

// Brute-force guard for credential endpoints: 10 attempts / 15 min / IP.
export const authLimiter = rateLimit({
  windowMs: 15 * MINUTE,
  limit: 10,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(fail('Terlalu banyak percobaan. Coba lagi dalam 15 menit.'))
  },
})

// Public application form: 5 submissions / hour / IP — caps spam, CV payload
// abuse (up to ~7.5MB each), and downstream AI-call cost.
export const publicApplyLimiter = rateLimit({
  windowMs: 60 * MINUTE,
  limit: 5,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (_req, res) => {
    res.status(429).json(fail('Terlalu banyak lamaran dari alamat ini. Coba lagi dalam satu jam.'))
  },
})
