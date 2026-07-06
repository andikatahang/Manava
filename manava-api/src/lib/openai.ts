// OpenAI client for candidate insight. Optional: without OPENAI_API_KEY the
// caller falls back to the deterministic heuristic, so the public /apply
// endpoint never depends on OpenAI availability.

import OpenAI from 'openai'
import { env } from '../config/env.js'

const REQUEST_TIMEOUT_MS = 8_000
export const OPENAI_MODEL = 'gpt-4o-mini'

let client: OpenAI | null = null

export function isOpenAiConfigured(): boolean {
  return Boolean(env.OPENAI_API_KEY)
}

export function getOpenAi(): OpenAI {
  if (!client) {
    client = new OpenAI({
      apiKey: env.OPENAI_API_KEY,
      timeout: REQUEST_TIMEOUT_MS,
      maxRetries: 1,
    })
  }
  return client
}
