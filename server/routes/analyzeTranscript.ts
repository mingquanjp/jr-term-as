import { promises as fs } from 'node:fs'

import { Router } from 'express'
import multer from 'multer'

import type {
  AnalyzeTranscriptResponse,
  ApiErrorCode,
  ApiErrorResponse,
} from '../../shared/analysis.js'
import { requireAuth } from '../auth/requireAuth.js'
import { loadDictionary } from '../terminology/loadDictionary.js'
import { matchTerms } from '../terminology/matchTerms.js'
import {
  extractTranscript,
  TranscriptExtractionError,
} from '../transcript/extractTranscript.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
})

function sendError(
  response: Parameters<Parameters<typeof analyzeTranscriptRouter.post>[1]>[1],
  status: number,
  code: ApiErrorCode,
  message: string,
) {
  const body: ApiErrorResponse = { success: false, error: { code, message } }
  response.status(status).json(body)
}

export const analyzeTranscriptRouter = Router()

analyzeTranscriptRouter.post(
  '/',
  requireAuth,
  (request, response, next) => {
    upload.single('file')(request, response, (error) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        sendError(
          response,
          413,
          'FILE_TOO_LARGE',
          'ファイルサイズは10MB以下にしてください。',
        )
        return
      }
      if (error) {
        next(error)
        return
      }
      next()
    })
  },
  async (request, response) => {
    if (!request.file) {
      sendError(response, 400, 'NO_FILE', 'ファイルを選択してください。')
      return
    }

    try {
      const transcript = await extractTranscript(request.file)
      if (!transcript.trim()) {
        sendError(response, 422, 'EMPTY_TRANSCRIPT', 'トランスクリプトが空です。')
        return
      }

      const terms = await loadDictionary()
      const results = matchTerms(transcript, terms)
      const body: AnalyzeTranscriptResponse = {
        success: true,
        file: {
          name: request.file.originalname,
          size: request.file.size,
          type: request.file.mimetype,
        },
        stats: {
          characterCount: transcript.length,
          detectedTermCount: results.length,
          totalOccurrences: results.reduce(
            (total, result) => total + result.occurrenceCount,
            0,
          ),
        },
        results,
      }
      response.json(body)
    } catch (error) {
      if (error instanceof TranscriptExtractionError) {
        sendError(response, 415, error.code, error.message)
        return
      }
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
        sendError(response, 500, 'DICTIONARY_NOT_FOUND', '用語辞書が見つかりません。')
        return
      }
      sendError(
        response,
        500,
        'INTERNAL_SERVER_ERROR',
        '解析中にエラーが発生しました。',
      )
    } finally {
      if (request.file && 'path' in request.file && request.file.path) {
        await fs.unlink(request.file.path).catch(() => undefined)
      }
    }
  },
)
