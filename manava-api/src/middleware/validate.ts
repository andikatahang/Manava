import type { NextFunction, Request, Response } from 'express'
import type { ZodSchema } from 'zod'

// Middleware factory to validate request parts against a Zod schema.
export function validateBody<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.body)
    if (!result.success) return next(result.error)
    req.body = result.data
    next()
  }
}

export function validateQuery<T>(schema: ZodSchema<T>) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const result = schema.safeParse(req.query)
    if (!result.success) return next(result.error)
    // Query is read-only on the underlying Express Request; assign to a namespaced field.
    ;(req as Request & { validatedQuery: T }).validatedQuery = result.data
    next()
  }
}
