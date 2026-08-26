import { describe, expect, it } from 'vitest'

import { extractContextSentence } from './extractContextSentence.js'

describe('extractContextSentence', () => {
  it('extracts the Japanese sentence containing the occurrence', () => {
    const transcript = '最初の発話です。イノ本について確認します。次の発話です。'
    expect(extractContextSentence(transcript, transcript.indexOf('イノ本'))).toBe(
      'イノ本について確認します。',
    )
  })

  it('uses Teams line breaks as utterance boundaries', () => {
    const transcript = '藤村 勇斗 0:04\nイノ本の担当者へ確認します\n別の発話'
    expect(extractContextSentence(transcript, transcript.indexOf('イノ本'))).toBe(
      'イノ本の担当者へ確認します',
    )
  })

  it('separates a Teams speaker and timestamp when Word joins the soft line break', () => {
    const transcript = '藤村 勇斗   0:04イノ本の担当者へ確認します。'
    expect(extractContextSentence(transcript, transcript.indexOf('イノ本'))).toBe(
      '藤村 勇斗 0:04 — イノ本の担当者へ確認します。',
    )
  })
})
