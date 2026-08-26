import { afterEach, describe, expect, it, vi } from 'vitest'

import type { TermMatchOccurrence } from '../terminology/matchTerms.js'
import { getQwenContextGateConfig, validateOccurrencesWithQwen } from './qwenClient.js'

const occurrence: TermMatchOccurrence = {
  termId: 'TERM_009',
  canonicalTerm: '運転休止',
  meaning: '列車の運行を一時的に休止すること',
  classification: '業務種別',
  variantNote: '一般語との区別が必要',
  displayTerm: 'うや',
  matchedVariant: 'うや',
  matchType: 'Context Required',
  originalIndex: 12,
  contextSentence: '明日は台風のため、うやを検討します。',
  contextWindow: {
    previous: '台風の接近に伴い、運行計画を確認します。',
    current: '明日は台風のため、うやを検討します。',
    next: '利用者への案内も準備してください。',
  },
}

afterEach(() => vi.unstubAllGlobals())

describe('getQwenContextGateConfig', () => {
  it('is disabled unless explicitly enabled', () => {
    expect(getQwenContextGateConfig({})).toBeNull()
  })

  it('requires a key when enabled', () => {
    expect(() => getQwenContextGateConfig({ QWEN_CONTEXT_GATE: 'true' })).toThrow(
      'QWEN_API_KEY',
    )
  })

  it('uses the local Qwen defaults and risky mode', () => {
    expect(
      getQwenContextGateConfig({
        QWEN_CONTEXT_GATE: 'true',
        QWEN_API_KEY: 'local-vllm',
      }),
    ).toMatchObject({
      baseUrl: 'http://127.0.0.1:18000/v1',
      model: 'Qwen/Qwen3-4B-Instruct-2507-FP8',
      mode: 'risky',
    })
  })

  it('only accepts a decision tied to the matching term and occurrence', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    decisions: [
                      {
                        occurrenceId: 'TERM_009:12',
                        termId: 'TERM_009',
                        decision: 'accept',
                        reason: '運行の休止を検討する文脈です。',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    const result = await validateOccurrencesWithQwen([occurrence], {
      baseUrl: 'http://127.0.0.1:18000/v1',
      apiKey: 'local-vllm',
      model: 'Qwen/Qwen3-4B-Instruct-2507-FP8',
      mode: 'risky',
      timeoutMs: 1000,
    })

    expect(result).toMatchObject({
      validatedCount: 1,
      rejectedCount: 0,
      uncertainCount: 0,
    })
    expect(result.accepted).toEqual([occurrence])
    expect(fetch).toHaveBeenCalledWith(
      'http://127.0.0.1:18000/v1/chat/completions',
      expect.objectContaining({ method: 'POST' }),
    )
    const requestInit = vi.mocked(fetch).mock.calls[0]?.[1] as RequestInit
    expect(String(requestInit.body)).toContain('一般語との区別が必要')
    expect(String(requestInit.body)).toContain('dictionaryNote がある場合は最優先する')
    expect(String(requestInit.body)).toContain(
      '"response_format":{"type":"json_schema"',
    )
  })

  it('fails closed when Qwen returns the wrong term ID', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content: JSON.stringify({
                    decisions: [
                      {
                        occurrenceId: 'TERM_009:12',
                        termId: 'TERM_OTHER',
                        decision: 'accept',
                      },
                    ],
                  }),
                },
              },
            ],
          }),
          { status: 200 },
        ),
      ),
    )

    const result = await validateOccurrencesWithQwen([occurrence], {
      baseUrl: 'http://127.0.0.1:18000/v1',
      apiKey: 'local-vllm',
      model: 'Qwen/Qwen3-4B-Instruct-2507-FP8',
      mode: 'risky',
      timeoutMs: 1000,
    })

    expect(result).toMatchObject({ accepted: [], validatedCount: 1, uncertainCount: 1 })
  })
})
