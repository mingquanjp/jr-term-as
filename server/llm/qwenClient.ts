import type { TermMatchOccurrence } from '../terminology/matchTerms.js'

const DEFAULT_BASE_URL = 'http://127.0.0.1:18000/v1'
const DEFAULT_MODEL = 'Qwen/Qwen3-4B-Instruct-2507-FP8'
const BATCH_SIZE = 6

export type QwenContextGateConfig = {
  baseUrl: string
  apiKey: string
  model: string
  mode: 'risky' | 'all'
  timeoutMs: number
}

export type ContextDecision = 'accept' | 'reject' | 'uncertain'

type ModelDecision = {
  occurrenceId?: unknown
  decision?: unknown
  termId?: unknown
  reason?: unknown
}

type ChatCompletionResponse = {
  choices?: Array<{ message?: { content?: string | null } }>
}

export type ContextValidationResult = {
  accepted: TermMatchOccurrence[]
  rejectedCount: number
  uncertainCount: number
  validatedCount: number
}

export function getQwenContextGateConfig(
  environment = process.env,
): QwenContextGateConfig | null {
  if (environment.QWEN_CONTEXT_GATE !== 'true') return null

  const apiKey = environment.QWEN_API_KEY
  if (!apiKey) {
    throw new Error('QWEN_API_KEY is required when QWEN_CONTEXT_GATE=true.')
  }

  return {
    baseUrl: (environment.QWEN_BASE_URL ?? DEFAULT_BASE_URL).replace(/\/+$/u, ''),
    apiKey,
    model: environment.QWEN_MODEL ?? DEFAULT_MODEL,
    mode: environment.QWEN_CONTEXT_GATE_MODE === 'all' ? 'all' : 'risky',
    timeoutMs: Number(environment.QWEN_TIMEOUT_MS ?? 45_000),
  }
}

function requiresContextValidation(
  occurrence: TermMatchOccurrence,
  mode: QwenContextGateConfig['mode'],
): boolean {
  if (mode === 'all' || occurrence.matchType === 'Context Required') return true

  // Short forms are highly likely to be embedded in ordinary Japanese words.
  return Array.from(occurrence.displayTerm).length <= 2
}

function occurrenceId(occurrence: TermMatchOccurrence): string {
  return `${occurrence.termId}:${occurrence.originalIndex}`
}

function parseModelContent(content: string): ModelDecision[] {
  const withoutFence = content
    .trim()
    .replace(/^```(?:json)?\s*/iu, '')
    .replace(/\s*```$/u, '')
  const parsed = JSON.parse(withoutFence) as { decisions?: unknown }
  return Array.isArray(parsed.decisions) ? (parsed.decisions as ModelDecision[]) : []
}

function buildPrompt(occurrences: TermMatchOccurrence[]) {
  return {
    role: 'user' as const,
    content: JSON.stringify({
      task: '各候補が会議文脈でJR西日本の社内用語として使われているかを判定してください。',
      rules: [
        '公式名称・意味はJRレビュー済み辞書の情報だけを根拠にする。推測で新しい意味を作らない。',
        '候補文字列が一般語の一部、言いよどみ、または会議室名・話者名などのメタデータに含まれる場合は reject。',
        '明確に判断できない場合は uncertain。',
        'JSON以外は出力しない。',
      ],
      output: {
        decisions: [
          {
            occurrenceId: 'TERM_001:123',
            decision: 'accept | reject | uncertain',
            termId: '候補と同じtermId、reject/uncertainではnull可',
            reason: '短い日本語の理由',
          },
        ],
      },
      candidates: occurrences.map((occurrence) => ({
        occurrenceId: occurrenceId(occurrence),
        matchedVariant: occurrence.displayTerm,
        termId: occurrence.termId,
        officialName: occurrence.canonicalTerm,
        jrMeaning: occurrence.meaning,
        context: occurrence.contextWindow,
      })),
    }),
  }
}

async function requestDecisions(
  occurrences: TermMatchOccurrence[],
  config: QwenContextGateConfig,
): Promise<Map<string, ModelDecision>> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      'Content-Type': 'application/json',
    },
    signal: AbortSignal.timeout(config.timeoutMs),
    body: JSON.stringify({
      model: config.model,
      messages: [
        {
          role: 'system',
          content:
            'あなたはJR西日本の社内用語の文脈判定器です。辞書にない知識を補わず、指定JSONだけを返してください。',
        },
        buildPrompt(occurrences),
      ],
      temperature: 0,
      max_tokens: 700,
    }),
  })
  const responseText = await response.text()
  if (!response.ok) {
    throw new Error(
      `Qwen request failed (${response.status}): ${responseText.slice(0, 300)}`,
    )
  }

  const payload = JSON.parse(responseText) as ChatCompletionResponse
  const content = payload.choices?.[0]?.message?.content
  if (!content) throw new Error('Qwen response did not include a completion message.')

  const expectedIds = new Set(occurrences.map(occurrenceId))
  return new Map(
    parseModelContent(content)
      .filter(
        (decision) =>
          typeof decision.occurrenceId === 'string' &&
          expectedIds.has(decision.occurrenceId),
      )
      .map((decision) => [decision.occurrenceId as string, decision]),
  )
}

function isAccepted(
  decision: ModelDecision | undefined,
  occurrence: TermMatchOccurrence,
): boolean {
  return decision?.decision === 'accept' && decision.termId === occurrence.termId
}

export async function validateOccurrencesWithQwen(
  occurrences: TermMatchOccurrence[],
  config: QwenContextGateConfig,
): Promise<ContextValidationResult> {
  const directAccepts = occurrences.filter(
    (occurrence) => !requiresContextValidation(occurrence, config.mode),
  )
  const candidates = occurrences.filter((occurrence) =>
    requiresContextValidation(occurrence, config.mode),
  )
  const accepted = [...directAccepts]
  let rejectedCount = 0
  let uncertainCount = 0

  for (let index = 0; index < candidates.length; index += BATCH_SIZE) {
    const batch = candidates.slice(index, index + BATCH_SIZE)
    const decisions = await requestDecisions(batch, config)
    for (const occurrence of batch) {
      const decision = decisions.get(occurrenceId(occurrence))
      if (isAccepted(decision, occurrence)) {
        accepted.push(occurrence)
      } else if (decision?.decision === 'reject') {
        rejectedCount += 1
      } else {
        uncertainCount += 1
      }
    }
  }

  return {
    accepted: accepted.sort((left, right) => left.originalIndex - right.originalIndex),
    rejectedCount,
    uncertainCount,
    validatedCount: candidates.length,
  }
}
