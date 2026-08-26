import { describe, expect, it } from 'vitest'

import { normalizeText } from './normalizeText.js'

describe('normalizeText', () => {
  it('normalizes width, Latin case, line endings and repeated whitespace', () => {
    expect(normalizeText('ＢＯＸ\r\n  IPD\t基盤')).toBe('box ipd 基盤')
  })

  it('preserves Japanese punctuation', () => {
    expect(normalizeText('イノ本、確認。')).toBe('イノ本、確認。')
  })
})
