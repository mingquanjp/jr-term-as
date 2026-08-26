import { Router } from 'express'

import type { ApiErrorResponse, LoginResponse } from '../../shared/analysis.js'
import {
  clearSessionCookie,
  readCookie,
  SESSION_COOKIE,
  setSessionCookie,
} from '../auth/cookies.js'
import { createSession, deleteSession, getSession } from '../auth/sessionStore.js'
import { authenticateUser } from '../auth/userStore.js'

export const authRouter = Router()

authRouter.post('/login', async (request, response) => {
  const email = typeof request.body?.email === 'string' ? request.body.email : ''
  const password =
    typeof request.body?.password === 'string' ? request.body.password : ''
  const user = await authenticateUser(email, password)

  if (!user) {
    const body: ApiErrorResponse = {
      success: false,
      error: {
        code: 'INVALID_CREDENTIALS',
        message: 'メールアドレスまたはパスワードが正しくありません。',
      },
    }
    response.status(401).json(body)
    return
  }

  const token = createSession(user)
  setSessionCookie(response, token)
  const body: LoginResponse = { success: true, user }
  response.json(body)
})

authRouter.get('/session', (request, response) => {
  const user = getSession(readCookie(request, SESSION_COOKIE))
  if (!user) {
    const body: ApiErrorResponse = {
      success: false,
      error: { code: 'UNAUTHORIZED', message: 'ログインが必要です。' },
    }
    response.status(401).json(body)
    return
  }
  const body: LoginResponse = { success: true, user }
  response.json(body)
})

authRouter.post('/logout', (request, response) => {
  deleteSession(readCookie(request, SESSION_COOKIE))
  clearSessionCookie(response)
  response.status(204).end()
})
