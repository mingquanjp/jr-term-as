import { describe, expect, it } from 'vitest'

import { getQwenContextGateConfig } from './qwenClient.js'

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
})
