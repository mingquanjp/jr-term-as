import { describe, expect, it } from 'vitest'

import { parseDictionaryRows } from './parseDictionaryRows.js'

describe('parseDictionaryRows', () => {
  it('forward-fills grouped metadata and preserves match types', () => {
    const result = parseDictionaryRows([
      {
        termId: 'TERM_001',
        canonicalTerm: 'イノベーション本部',
        variant: 'イノベーション本部',
        meaning: '組織名称',
        matchType: 'Exact',
      },
      { variant: 'イノ本', matchType: 'Exact' },
      {},
      {
        termId: 'TERM_003',
        canonicalTerm: 'ゲート判定',
        variant: 'ゲート',
        meaning: '統制上の判断点',
        matchType: 'Context Required',
      },
      { variant: 'ゲート判断', matchType: '' },
    ])

    expect(result.terms).toHaveLength(2)
    expect(result.terms[0].variants).toEqual([
      { value: 'イノベーション本部', matchType: 'Exact' },
      { value: 'イノ本', matchType: 'Exact' },
    ])
    expect(result.terms[1].variants[0].matchType).toBe('Context Required')
    expect(result.terms[1].variants[1].matchType).toBeUndefined()
    expect(result.stats).toMatchObject({
      totalTerms: 2,
      totalVariants: 4,
      exactVariants: 2,
      contextRequiredVariants: 1,
      blankMatchTypeVariants: 1,
    })
  })

  it('does not require continuous TERM numbers and warns on cross-term duplicates', () => {
    const result = parseDictionaryRows([
      {
        termId: 'TERM_001',
        canonicalTerm: '用語A',
        variant: '重複表記',
        meaning: '意味A',
        matchType: 'Exact',
      },
      {
        termId: 'TERM_087',
        canonicalTerm: '用語B',
        variant: '重複表記',
        meaning: '意味B',
        matchType: 'Exact',
      },
    ])

    expect(result.terms.map((term) => term.termId)).toEqual(['TERM_001', 'TERM_087'])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'DUPLICATE_VARIANT' }),
    )
  })

  it('reads Excel rich text and never carries metadata across a new incomplete Term_ID', () => {
    const result = parseDictionaryRows([
      {
        termId: 'TERM_001',
        canonicalTerm: '用語A',
        meaning: '意味A',
        variant: '用語A',
        matchType: 'Exact',
      },
      {
        termId: 'TERM_035',
        variant: 'けんめい',
        matchType: 'Context Required',
      },
      {
        termId: 'TERM_036',
        canonicalTerm: { richText: [{ text: '用語' }, { text: 'B' }] },
        meaning: { richText: [{ text: '意味' }, { text: 'B' }] },
        variant: '用語B',
        matchType: 'Exact',
      },
    ])

    expect(result.terms).toEqual([
      expect.objectContaining({ termId: 'TERM_001', canonicalTerm: '用語A' }),
      expect.objectContaining({
        termId: 'TERM_036',
        canonicalTerm: '用語B',
        meaning: '意味B',
      }),
    ])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'INCOMPLETE_TERM' }),
    )
  })

  it('ignores a second canonical term assigned to the same Term_ID', () => {
    const result = parseDictionaryRows([
      {
        termId: 'TERM_087',
        canonicalTerm: 'WISE-NETポータル',
        meaning: '社内システム',
        variant: 'WISE-NET',
        matchType: 'Exact',
      },
      {
        termId: 'TERM_087',
        canonicalTerm: '主管部',
        meaning: '組織名称',
        variant: '主管部',
        matchType: 'Context Required',
      },
      { variant: 'しゅかんぶ', matchType: 'Context Required' },
    ])

    expect(result.terms).toEqual([
      expect.objectContaining({
        termId: 'TERM_087',
        canonicalTerm: 'WISE-NETポータル',
        variants: [{ value: 'WISE-NET', matchType: 'Exact' }],
      }),
    ])
    expect(result.warnings).toContainEqual(
      expect.objectContaining({ code: 'CONFLICTING_TERM_METADATA' }),
    )
  })
})
