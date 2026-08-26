import type { Request, Response } from 'express'

export const SESSION_COOKIE = 'jr_term_session'

export function readCookie(request: Request, name: string): string | undefined {
  const header = request.headers.cookie
  if (!header) return undefined

  for (const item of header.split(';')) {
    const separator = item.indexOf('=')
    if (separator === -1) continue
    const key = item.slice(0, separator).trim()
    if (key === name) return decodeURIComponent(item.slice(separator + 1).trim())
  }
  return undefined
}

export function setSessionCookie(response: Response, token: string): void {
  response.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })
}

export function clearSessionCookie(response: Response): void {
  response.clearCookie(SESSION_COOKIE, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  })
}
