import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '@prisma/client'
import { HttpError } from './errorHandler.js'

// Gate an endpoint to specific roles. Chain after `authenticate`.
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction) => {
    if (!req.user) return next(new HttpError(401, 'Not authenticated'))
    if (!allowed.includes(req.user.role)) {
      return next(new HttpError(403, 'Insufficient role for this action'))
    }
    next()
  }
}
