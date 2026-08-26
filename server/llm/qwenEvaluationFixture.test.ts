import { readFile } from 'node:fs/promises'
import path from 'node:path'

import { describe, expect, it } from 'vitest'

type EvaluationCase = {
  id: string
  termId: string
  variant: string
  expectedDisplay: boolean
}

type EvaluationFixture = {
  reviewStatus: string
  cases: EvaluationCase[]
}

describe('Qwen context evaluation fixture', () => {
  it('covers every v2 Context Required variant with a positive and negative case', async () => {
    const filePath = path.resolve('test/fixtures/qwen-context-evaluation.json')
    const fixture = JSON.parse(await readFile(filePath, 'utf8')) as EvaluationFixture

    expect(fixture.reviewStatus).toBe('JRレビュー待ち')
    expect(fixture.cases).toHaveLength(14)
    expect(new Set(fixture.cases.map((testCase) => testCase.id)).size).toBe(
      fixture.cases.length,
    )

    const variants = new Map<string, Set<boolean>>()
    for (const testCase of fixture.cases) {
      expect(testCase.termId).toMatch(/^TERM_\d{3}$/u)
      expect(testCase.variant).not.toBe('')
      const labels = variants.get(testCase.variant) ?? new Set<boolean>()
      labels.add(testCase.expectedDisplay)
      variants.set(testCase.variant, labels)
    }

    expect([...variants.keys()].sort()).toEqual([
      'UK',
      'ボックス',
      '一見一様',
      '人財開発室',
      '均等',
      '安全推進',
      '輸送計画',
    ])
    expect([...variants.values()].every((labels) => labels.size === 2)).toBe(true)
  })
})
