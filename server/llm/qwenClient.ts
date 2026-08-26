import type { TermMatchOccurrence } from '../terminology/matchTerms.js'

const DEFAULT_BASE_URL = 'http://127.0.0.1:18000/v1'
const DEFAULT_MODEL = 'Qwen/Qwen3-4B-Instruct-2507-FP8'
// Smaller batches reduce cross-candidate interference in a classification task.
const BATCH_SIZE = 3

const CONTEXT_DECISION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['decisions'],
  properties: {
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['occurrenceId', 'decision', 'termId'],
        properties: {
          occurrenceId: { type: 'string' },
          decision: { type: 'string', enum: ['accept', 'reject', 'uncertain'] },
          termId: { type: ['string', 'null'] },
        },
      },
    },
  },
} as const

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
        '候補ごとに独立して判定し、他の候補の判定結果を根拠にしない。',
        '公式名称・意味・分類・dictionaryNote はJRレビュー済み辞書の事実である。dictionaryNote がある場合は最優先する。',
        '候補文字列が会議室名・話者名・一般語の一部・言いよどみである場合は reject。',
        '公式名称・意味・分類と前後文脈が明確に整合する場合のみ accept。根拠が不足する場合は推測せず uncertain。',
        '組織名称は、部署・本部・担当・所管・依頼先など、組織を指す根拠がある場合のみ accept。',
        'システム名称は、画面・データ・連携・改修・リプレース・運用など、対象システムを指す根拠がある場合のみ accept。',
        '辞書にない意味を作らず、候補の表記が辞書登録済みである事実そのものは否定しない。',
        'JSON以外は出力しない。',
      ],
      examples: [
        {
          candidate:
            'UK → 輸送計画システム（列車・車両・乗務員の運用を計画する社内システム）',
          context: 'UKのリプレースに伴い、インターフェース改修の見積を確認します。',
          decision: 'accept',
        },
        {
          candidate:
            'UK → 輸送計画システム（列車・車両・乗務員の運用を計画する社内システム）',
          context: 'UK市場向けの販売資料を確認します。',
          decision: 'reject',
        },
        {
          candidate: '輸送計画 → 輸送計画システム',
          context: '展示会の機材の輸送計画を立てます。',
          decision: 'reject',
        },
        {
          candidate: '安全推進 → 安全推進部',
          context: '安全推進のため、保護具の着用を徹底します。',
          decision: 'reject',
        },
        {
          candidate: '均等 → 近畿統括本部',
          context: '均等本部側でダイヤ改正の連絡事項を確認します。',
          decision: 'accept',
        },
        {
          candidate: 'ボックス → BOX（ファイル共有サービス）',
          context: 'この機能はブラックボックスになっています。',
          decision: 'reject',
        },
      ],
      output: {
        decisions: [
          {
            occurrenceId: 'TERM_001:123',
            decision: 'accept | reject | uncertain',
            termId: '候補と同じtermId、reject/uncertainではnull可',
          },
        ],
      },
      candidates: occurrences.map((occurrence) => ({
        occurrenceId: occurrenceId(occurrence),
        matchedVariant: occurrence.displayTerm,
        termId: occurrence.termId,
        officialName: occurrence.canonicalTerm,
        jrMeaning: occurrence.meaning,
        jrClassification: occurrence.classification,
        dictionaryNote: occurrence.variantNote ?? null,
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
      max_tokens: 400,
      response_format: {
        type: 'json_schema',
        json_schema: {
          name: 'jr_term_context_decisions',
          strict: true,
          schema: CONTEXT_DECISION_SCHEMA,
        },
      },
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
