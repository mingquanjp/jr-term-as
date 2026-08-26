import { promises as fs } from 'node:fs'

import { Router } from 'express'
import multer from 'multer'

import type {
  AnalyzeTranscriptResponse,
  ApiErrorCode,
  ApiErrorResponse,
} from '../../shared/analysis.js'
import { requireAuth } from '../auth/requireAuth.js'
import {
  getQwenContextGateConfig,
  validateOccurrencesWithQwen,
} from '../llm/qwenClient.js'
import { loadDictionary } from '../terminology/loadDictionary.js'
import { findTermOccurrences, groupTermOccurrences } from '../terminology/matchTerms.js'
import {
  extractTranscript,
  TranscriptExtractionError,
} from '../transcript/extractTranscript.js'
import { normalizeUploadFileName } from '../transcript/normalizeUploadFileName.js'

const MAX_FILE_SIZE = 10 * 1024 * 1024
const MAX_FILE_COUNT = 10
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILE_COUNT },
})

function uploadedFiles(request: Parameters<typeof requireAuth>[0]) {
  if (!request.files || Array.isArray(request.files)) return request.files ?? []
  return Object.values(request.files).flat()
}

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
    upload.fields([
      { name: 'files', maxCount: MAX_FILE_COUNT },
      { name: 'file', maxCount: 1 },
    ])(request, response, (error) => {
      if (error instanceof multer.MulterError && error.code === 'LIMIT_FILE_SIZE') {
        sendError(
          response,
          413,
          'FILE_TOO_LARGE',
          '各ファイルのサイズは10MB以下にしてください。',
        )
        return
      }
      if (
        error instanceof multer.MulterError &&
        (error.code === 'LIMIT_FILE_COUNT' || error.code === 'LIMIT_UNEXPECTED_FILE')
      ) {
        sendError(
          response,
          400,
          'TOO_MANY_FILES',
          `一度にアップロードできるファイルは${MAX_FILE_COUNT}件までです。`,
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
    const files = uploadedFiles(request)
    files.forEach((file) => {
      file.originalname = normalizeUploadFileName(file.originalname)
    })
    if (files.length === 0) {
      sendError(response, 400, 'NO_FILE', 'ファイルを1件以上選択してください。')
      return
    }

    try {
      const terms = await loadDictionary()
      const contextGate = getQwenContextGateConfig()
      const results: AnalyzeTranscriptResponse['results'] = []
      let characterCount = 0

      for (const file of files) {
        const transcript = await extractTranscript(file)
        if (!transcript.trim()) {
          sendError(
            response,
            422,
            'EMPTY_TRANSCRIPT',
            `${file.originalname} のトランスクリプトが空です。`,
          )
          return
        }

        const occurrences = findTermOccurrences(transcript, terms, {
          includeContextRequired: contextGate != null,
        })
        let acceptedOccurrences = occurrences
        if (contextGate) {
          try {
            acceptedOccurrences = (
              await validateOccurrencesWithQwen(occurrences, contextGate)
            ).accepted
          } catch (error) {
            console.error(
              'Qwen Context Gate failed:',
              error instanceof Error ? error.message : 'unknown error',
            )
            sendError(
              response,
              503,
              'CONTEXT_VALIDATION_UNAVAILABLE',
              '文脈判定AIに接続できません。接続を確認してから再試行してください。',
            )
            return
          }
        }

        characterCount += transcript.length
        results.push(
          ...groupTermOccurrences(acceptedOccurrences).map((result) => ({
            ...result,
            transcriptName: file.originalname,
          })),
        )
      }

      const body: AnalyzeTranscriptResponse = {
        success: true,
        files: files.map((file) => ({
          name: file.originalname,
          size: file.size,
          type: file.mimetype,
        })),
        stats: {
          characterCount,
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
      await Promise.all(
        files.map((file) =>
          'path' in file && file.path
            ? fs.unlink(file.path).catch(() => undefined)
            : Promise.resolve(),
        ),
      )
    }
  },
)
