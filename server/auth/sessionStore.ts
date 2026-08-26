import { randomBytes } from 'node:crypto'

import type { AuthUser } from '../../shared/analysis.js'

type Session = {
  user: AuthUser
  expiresAt: number
}

const sessions = new Map<string, Session>()
const SESSION_TTL_MS = 8 * 60 * 60 * 1000

export function createSession(user: AuthUser): string {
  const token = randomBytes(32).toString('base64url')
  sessions.set(token, { user, expiresAt: Date.now() + SESSION_TTL_MS })
  return token
}

export function getSession(token: string | undefined): AuthUser | null {
  if (!token) return null
  const session = sessions.get(token)
  if (!session) return null
  if (session.expiresAt <= Date.now()) {
    sessions.delete(token)
    return null
  }
  return session.user
}

export function deleteSession(token: string | undefined): void {
  if (token) sessions.delete(token)
}

export function clearSessions(): void {
  sessions.clear()
}
