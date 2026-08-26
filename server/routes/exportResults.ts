import ExcelJS from 'exceljs'
import { Router } from 'express'

import type { AnalysisResult } from '../../shared/analysis.js'
import { requireAuth } from '../auth/requireAuth.js'

const MAX_RESULTS = 500

type ExportRequest = {
  fileName?: unknown
  analyzedAt?: unknown
  results?: unknown
}

function isAnalysisResult(value: unknown): value is AnalysisResult {
  if (!value || typeof value !== 'object') return false
  const result = value as Partial<AnalysisResult>
  return (
    typeof result.termId === 'string' &&
    typeof result.displayTerm === 'string' &&
    typeof result.canonicalTerm === 'string' &&
    typeof result.meaning === 'string' &&
    typeof result.contextSentence === 'string' &&
    typeof result.occurrenceCount === 'number'
  )
}

function safeText(value: unknown): string {
  return typeof value === 'string' ? value.slice(0, 500) : ''
}

export const exportResultsRouter = Router()

exportResultsRouter.post('/', requireAuth, async (request, response, next) => {
  const body = request.body as ExportRequest
  if (
    !Array.isArray(body.results) ||
    body.results.length > MAX_RESULTS ||
    !body.results.every(isAnalysisResult)
  ) {
    response.status(400).json({
      success: false,
      error: { code: 'INTERNAL_SERVER_ERROR', message: '出力する解析結果が不正です。' },
    })
    return
  }

  try {
    const workbook = new ExcelJS.Workbook()
    workbook.creator = 'JR Term Assistant'
    workbook.created = new Date()
    const sheet = workbook.addWorksheet('解析結果', {
      views: [{ state: 'frozen', ySplit: 3 }],
    })

    sheet.mergeCells('A1:F1')
    sheet.getCell('A1').value = 'JR Term Assistant 解析結果'
    sheet.getCell('A1').font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } }
    sheet.getCell('A1').fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF005E68' },
    }
    sheet.getCell('A2').value = '対象ファイル'
    sheet.getCell('B2').value = safeText(body.fileName) || '—'
    sheet.getCell('D2').value = '解析日時'
    sheet.getCell('E2').value = safeText(body.analyzedAt) || '—'

    sheet.columns = [
      { header: '検出された社内用語', key: 'displayTerm', width: 22 },
      { header: '正式名称', key: 'canonicalTerm', width: 30 },
      { header: '分類', key: 'classification', width: 18 },
      { header: '意味の推測', key: 'meaning', width: 38 },
      { header: '出現した発話', key: 'contextSentence', width: 64 },
      { header: '検出回数', key: 'occurrenceCount', width: 12 },
    ]
    const headerRow = sheet.getRow(3)
    headerRow.values = [
      '検出された社内用語',
      '正式名称',
      '分類',
      '意味の推測',
      '出現した発話',
      '検出回数',
    ]
    headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } }
    headerRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF007582' },
    }
    headerRow.alignment = { vertical: 'middle' }

    body.results.forEach((result) => {
      const row = sheet.addRow({
        displayTerm: result.displayTerm,
        canonicalTerm: result.canonicalTerm,
        classification: result.classification ?? '—',
        meaning: result.meaning,
        contextSentence: result.contextSentence,
        occurrenceCount: result.occurrenceCount,
      })
      row.alignment = { vertical: 'top', wrapText: true }
    })
    sheet.eachRow((row) => {
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFD8E0E2' } },
          left: { style: 'thin', color: { argb: 'FFD8E0E2' } },
          bottom: { style: 'thin', color: { argb: 'FFD8E0E2' } },
          right: { style: 'thin', color: { argb: 'FFD8E0E2' } },
        }
      })
    })

    const file = await workbook.xlsx.writeBuffer()
    response
      .status(200)
      .set({
        'Content-Type':
          'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="jr-term-analysis.xlsx"',
        'Cache-Control': 'no-store',
      })
      .send(Buffer.from(file))
  } catch (error) {
    next(error)
  }
})
