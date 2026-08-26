import { describe, expect, it } from 'vitest'

import { normalizeUploadFileName } from './normalizeUploadFileName.js'

describe('normalizeUploadFileName', () => {
  it('repairs a UTF-8 Japanese filename interpreted as Latin-1', () => {
    const expected = '0626_技術変革（DX技術）GMT.docx'
    const mojibake = Buffer.from(expected, 'utf8').toString('latin1')

    expect(normalizeUploadFileName(mojibake)).toBe(expected)
  })

  it('keeps existing Unicode and ASCII filenames unchanged', () => {
    expect(normalizeUploadFileName('業務変革.docx')).toBe('業務変革.docx')
    expect(normalizeUploadFileName('meeting-01.txt')).toBe('meeting-01.txt')
  })
})
