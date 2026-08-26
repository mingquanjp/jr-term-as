import express from 'express'

import type { ApiErrorResponse } from '../shared/analysis.js'
import { analyzeTranscriptRouter } from './routes/analyzeTranscript.js'
import { authRouter } from './routes/auth.js'
import { dictionaryRouter } from './routes/dictionary.js'
import { exportResultsRouter } from './routes/exportResults.js'

export const app = express()

app.disable('x-powered-by')
app.use(express.json({ limit: '2mb' }))
app.get('/api/health', (_request, response) => response.json({ status: 'ok' }))
app.use('/api/auth', authRouter)
app.use('/api/dictionary', dictionaryRouter)
app.use('/api/analyze-transcript', analyzeTranscriptRouter)
app.use('/api/export-results', exportResultsRouter)

app.use((_error: unknown, _request: express.Request, response: express.Response) => {
  const body: ApiErrorResponse = {
    success: false,
    error: { code: 'INTERNAL_SERVER_ERROR', message: 'サーバーエラーが発生しました。' },
  }
  response.status(500).json(body)
})
