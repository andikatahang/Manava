import type { NextFunction, Request, Response } from 'express'

// Wraps async route handlers so thrown errors reach the Express error middleware.
type AsyncFn = (req: Request, res: Response, next: NextFunction) => Promise<unknown>

export function asyncHandler(fn: AsyncFn) {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next)
  }
}
