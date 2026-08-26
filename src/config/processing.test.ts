import { describe, expect, it } from 'vitest'

import { PROCESSING_STAGE_DURATION_MS } from './processing'

describe('processing timing', () => {
  it('keeps each visible processing stage on screen for seven seconds', () => {
    expect(PROCESSING_STAGE_DURATION_MS).toBe(7_000)
  })
})
