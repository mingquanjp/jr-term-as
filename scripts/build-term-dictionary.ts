import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'

import ExcelJS from 'exceljs'

import {
  parseDictionaryRows,
  type DictionaryRow,
} from '../server/terminology/parseDictionaryRows.js'
import type { GeneratedDictionary } from '../server/terminology/types.js'

const SOURCE_SHEET = '社内用語辞書_統合版'
const REQUIRED_HEADERS = [
  'Term_ID',
  'Canonical_Term',
  'Variant',
  'Meaning',
  'Match_Type',
  'Note',
] as const

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'object' && 'text' in value) return String(value.text)
  if (typeof value === 'object' && 'result' in value) return String(value.result ?? '')
  return String(value)
}

async function buildDictionary() {
  const sourcePath = path.resolve('data/jr-terms.xlsx')
  const outputPath = path.resolve('data/jr-terms.generated.json')
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.readFile(sourcePath)

  const sheet = workbook.getWorksheet(SOURCE_SHEET)
  if (!sheet) throw new Error(`Dictionary sheet "${SOURCE_SHEET}" was not found.`)

  let headerRowNumber = 0
  let headerIndexes = new Map<string, number>()
  sheet.eachRow((row, rowNumber) => {
    if (headerRowNumber) return
    const indexes = new Map<string, number>()
    row.eachCell((cell, columnNumber) => {
      indexes.set(cellText(cell.value).trim(), columnNumber)
    })
    if (REQUIRED_HEADERS.every((header) => indexes.has(header))) {
      headerRowNumber = rowNumber
      headerIndexes = indexes
    }
  })

  if (!headerRowNumber) throw new Error('Dictionary header row was not found.')

  const rows: DictionaryRow[] = []
  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= sheet.rowCount;
    rowNumber += 1
  ) {
    const row = sheet.getRow(rowNumber)
    const get = (header: (typeof REQUIRED_HEADERS)[number]) =>
      row.getCell(headerIndexes.get(header)!).value
    rows.push({
      termId: get('Term_ID'),
      canonicalTerm: get('Canonical_Term'),
      variant: get('Variant'),
      meaning: get('Meaning'),
      matchType: get('Match_Type'),
      note: get('Note'),
    })
  }

  const result = parseDictionaryRows(rows)
  const dictionary: GeneratedDictionary = {
    generatedAt: new Date().toISOString(),
    source: path.basename(sourcePath),
    terms: result.terms,
  }

  await mkdir(path.dirname(outputPath), { recursive: true })
  await writeFile(outputPath, `${JSON.stringify(dictionary, null, 2)}\n`, 'utf8')

  result.warnings.forEach((warning) =>
    console.warn(`[${warning.code}] ${warning.message}`),
  )
  console.log(JSON.stringify(result.stats, null, 2))
}

buildDictionary().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Dictionary build failed.')
  process.exitCode = 1
})
