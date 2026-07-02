import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@prisma/client'
import { fail } from '../lib/response.js'

export class HttpError extends Error {
  public status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    const first = err.errors[0]
    const path = first?.path.join('.') ?? ''
    const msg = path ? `${path}: ${first?.message}` : first?.message ?? 'Validation error'
    return res.status(400).json(fail(msg))
  }

  if (err instanceof HttpError) {
    return res.status(err.status).json(fail(err.message))
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      const target = Array.isArray(err.meta?.target) ? err.meta?.target.join(', ') : 'field'
      return res.status(409).json(fail(`Duplicate value for ${target}`))
    }
    if (err.code === 'P2025') {
      return res.status(404).json(fail('Record not found'))
    }
  }

  console.error('[unhandled]', err)
  const message = err instanceof Error ? err.message : 'Internal server error'
  return res.status(500).json(fail(message))
}
