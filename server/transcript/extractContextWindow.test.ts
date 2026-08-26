import { describe, expect, it } from 'vitest'

import {
  extractContextWindow,
  isTranscriptMetadataOccurrence,
} from './extractContextWindow.js'

describe('extractContextWindow', () => {
  const transcript =
    '田中 0:01 前の発話です。\n\n山田 0:04 うやを確認します。\n\n佐藤 0:09 次の発話です。'

  it('extracts adjacent utterances around a match', () => {
    expect(extractContextWindow(transcript, transcript.indexOf('うや'))).toEqual({
      previous: '田中 0:01 前の発話です。',
      current: '山田 0:04 うやを確認します。',
      next: '佐藤 0:09 次の発話です。',
    })
  })

  it('identifies a term found inside a Teams room prefix', () => {
    const block = '【4階】山幹共通 会議室   0:04 発話内容です。'
    expect(isTranscriptMetadataOccurrence(block, block.indexOf('山幹'))).toBe(true)
    expect(isTranscriptMetadataOccurrence(block, block.indexOf('発話'))).toBe(false)
  })
})
