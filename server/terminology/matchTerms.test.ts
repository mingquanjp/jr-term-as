import { describe, expect, it } from 'vitest'

import { matchTerms } from './matchTerms.js'
import type { TermEntry } from './types.js'

const terms: TermEntry[] = [
  {
    termId: 'TERM_001',
    canonicalTerm: 'イノベーション本部',
    meaning: '組織名称',
    variants: [
      { value: 'イノベーション本部', matchType: 'Exact' },
      { value: 'イノ本', matchType: 'Exact' },
      { value: 'イノホン', matchType: 'Exact' },
    ],
  },
  {
    termId: 'TERM_015',
    canonicalTerm: '輸送計画システム',
    meaning: '列車の運行計画を扱うシステム',
    variants: [{ value: 'UK', matchType: 'Context Required' }],
  },
  {
    termId: 'TERM_078',
    canonicalTerm: 'BOX',
    meaning: 'オンラインストレージ',
    variants: [{ value: 'BOX', matchType: 'Exact' }],
  },
]

describe('matchTerms', () => {
  it('detects Exact variants and groups multiple variants by Term_ID', () => {
    const results = matchTerms('最初にイノ本、その後イノホンとイノ本を確認。', terms)

    expect(results).toHaveLength(1)
    expect(results[0]).toMatchObject({
      termId: 'TERM_001',
      displayTerm: 'イノ本',
      contextSentence: '最初にイノ本、その後イノホンとイノ本を確認。',
      matchedVariants: ['イノ本', 'イノホン'],
      occurrenceCount: 3,
    })
  })

  it('skips Context Required and blank match types', () => {
    const results = matchTerms('UKについて確認します。', terms)
    expect(results).toEqual([])
  })

  it('uses Latin token boundaries', () => {
    expect(matchTerms('ABCBOXDEF', terms)).toEqual([])
    expect(matchTerms('BOXを開きます。', terms)[0]?.canonicalTerm).toBe('BOX')
  })

  it('orders results by first appearance', () => {
    const results = matchTerms('BOXのあとでイノ本を確認。', terms)
    expect(results.map((result) => result.termId)).toEqual(['TERM_078', 'TERM_001'])
  })
})
