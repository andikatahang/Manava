import type { NextFunction, Request, Response } from 'express'
import { verifyAccessToken, type AccessTokenPayload } from '../lib/jwt.js'
import { HttpError } from './errorHandler.js'

// Attach the decoded token payload to req.user for downstream handlers.
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AccessTokenPayload
    }
  }
}

export function authenticate(req: Request, _res: Response, next: NextFunction) {
  const header = req.headers.authorization
  if (!header || !header.startsWith('Bearer ')) {
    return next(new HttpError(401, 'Missing or invalid Authorization header'))
  }
  const token = header.slice('Bearer '.length).trim()
  try {
    req.user = verifyAccessToken(token)
    next()
  } catch {
    next(new HttpError(401, 'Invalid or expired access token'))
  }
}
