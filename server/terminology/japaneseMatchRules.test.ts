import { describe, expect, it } from 'vitest'

import { passesRuleBasedMatchChecks } from './japaneseMatchRules.js'

function check(text: string, variant: string) {
  const index = text.indexOf(variant)
  return passesRuleBasedMatchChecks({
    normalizedText: text,
    normalizedMatchIndex: index,
    normalizedVariant: variant,
    originalText: text,
    originalMatchIndex: index,
  })
}

describe('Japanese rule-based match checks', () => {
  it('rejects short kana variants embedded in ordinary words', () => {
    expect(check('えっと、どうやったかなあ。', 'うや')).toBe(false)
    expect(check('受け止めとけばいい。', 'とけ')).toBe(false)
  })

  it('keeps standalone short kana terminology', () => {
    expect(check('運転はうやです。', 'うや')).toBe(true)
    expect(check('本日はとけです。', 'とけ')).toBe(true)
  })

  it('rejects matches inside a Teams speaker or room metadata prefix', () => {
    const text = '\n\n【4階】本社・山幹共通_会議室   0:04いいっすね。\n\n'
    expect(check(text, '山幹')).toBe(false)
  })

  it('rejects the Teams document header but keeps the spoken content', () => {
    const text =
      '技術変革（DX技術）GMT-会議の録音\n\n2026年6月26日\n\n森岡 達也 文字起こしを開始しました\n\n技術変革について発言しました。'
    const titleIndex = text.indexOf('技術変革')
    const spokenIndex = text.lastIndexOf('技術変革')

    expect(
      passesRuleBasedMatchChecks({
        normalizedText: text,
        normalizedMatchIndex: titleIndex,
        normalizedVariant: '技術変革',
        originalText: text,
        originalMatchIndex: titleIndex,
      }),
    ).toBe(false)
    expect(
      passesRuleBasedMatchChecks({
        normalizedText: text,
        normalizedMatchIndex: spokenIndex,
        normalizedVariant: '技術変革',
        originalText: text,
        originalMatchIndex: spokenIndex,
      }),
    ).toBe(true)
  })
})
