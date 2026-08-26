import type { NextFunction, Request, Response } from 'express'

import type { ApiErrorResponse, AuthUser } from '../../shared/analysis.js'
import { readCookie, SESSION_COOKIE } from './cookies.js'
import { getSession } from './sessionStore.js'

export type AuthenticatedRequest = Request & { user: AuthUser }

export function requireAuth(request: Request, response: Response, next: NextFunction) {
  const user = getSession(readCookie(request, SESSION_COOKIE))
  if (!user) {
    const body: ApiErrorResponse = {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'ログインが必要です。' },
    }
    response.status(401).json(body)
    return
  }

  ;(request as AuthenticatedRequest).user = user
  next()
}
