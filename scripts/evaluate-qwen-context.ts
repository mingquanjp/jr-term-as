import { readFile } from 'node:fs/promises'
import path from 'node:path'

import {
  getQwenContextGateConfig,
  validateOccurrencesWithQwen,
} from '../server/llm/qwenClient.js'
import type { TermMatchOccurrence } from '../server/terminology/matchTerms.js'
import { loadDictionary } from '../server/terminology/loadDictionary.js'

type EvaluationCase = {
  id: string
  termId: string
  variant: string
  expectedDisplay: boolean
  previous: string
  current: string
  next: string
}

type EvaluationFixture = {
  version: number
  reviewStatus: string
  cases: EvaluationCase[]
}

function percentage(value: number, divisor: number): string {
  return divisor ? `${((value / divisor) * 100).toFixed(1)}%` : '—'
}

async function evaluate() {
  process.loadEnvFile('.env.local')
  const config = getQwenContextGateConfig()
  if (!config) throw new Error('Set QWEN_CONTEXT_GATE=true in .env.local first.')

  const fixturePath = path.resolve('test/fixtures/qwen-context-evaluation.json')
  const fixture = JSON.parse(await readFile(fixturePath, 'utf8')) as EvaluationFixture
  const terms = await loadDictionary()
  const casesByOccurrenceId = new Map<string, EvaluationCase>()
  const occurrences: TermMatchOccurrence[] = fixture.cases.map((testCase, index) => {
    const term = terms.find((candidate) => candidate.termId === testCase.termId)
    const variant = term?.variants.find(
      (candidate) =>
        candidate.value === testCase.variant &&
        candidate.matchType === 'Context Required',
    )
    if (!term || !variant) {
      throw new Error(
        `${testCase.id}: Context Required variant is not in the generated dictionary.`,
      )
    }

    const originalIndex = index + 1
    const occurrence: TermMatchOccurrence = {
      termId: term.termId,
      canonicalTerm: term.canonicalTerm,
      meaning: term.meaning,
      classification: term.classification,
      displayTerm: testCase.variant,
      matchedVariant: testCase.variant,
      matchType: 'Context Required',
      originalIndex,
      contextSentence: testCase.current,
      contextWindow: {
        previous: testCase.previous,
        current: testCase.current,
        next: testCase.next,
      },
    }
    casesByOccurrenceId.set(`${term.termId}:${originalIndex}`, testCase)
    return occurrence
  })

  const startedAt = Date.now()
  const validation = await validateOccurrencesWithQwen(occurrences, {
    ...config,
    mode: 'risky',
  })
  const acceptedIds = new Set(
    validation.accepted.map(
      (occurrence) => `${occurrence.termId}:${occurrence.originalIndex}`,
    ),
  )

  let truePositive = 0
  let falsePositive = 0
  let falseNegative = 0
  let trueNegative = 0
  const incorrect: Array<{ id: string; expectedDisplay: boolean; displayed: boolean }> =
    []
  for (const [id, testCase] of casesByOccurrenceId) {
    const displayed = acceptedIds.has(id)
    if (displayed && testCase.expectedDisplay) truePositive += 1
    if (displayed && !testCase.expectedDisplay) falsePositive += 1
    if (!displayed && testCase.expectedDisplay) falseNegative += 1
    if (!displayed && !testCase.expectedDisplay) trueNegative += 1
    if (displayed !== testCase.expectedDisplay) {
      incorrect.push({
        id: testCase.id,
        expectedDisplay: testCase.expectedDisplay,
        displayed,
      })
    }
  }

  console.log(
    JSON.stringify(
      {
        fixtureVersion: fixture.version,
        reviewStatus: fixture.reviewStatus,
        elapsedSeconds: Number(((Date.now() - startedAt) / 1000).toFixed(1)),
        totalCases: fixture.cases.length,
        truePositive,
        falsePositive,
        falseNegative,
        trueNegative,
        precision: percentage(truePositive, truePositive + falsePositive),
        recall: percentage(truePositive, truePositive + falseNegative),
        incorrect,
      },
      null,
      2,
    ),
  )
}

evaluate().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Qwen evaluation failed.')
  process.exitCode = 1
})
