const SENTENCE_ENDINGS = new Set(['。', '！', '？', '!', '?', '\n', '\r'])
const MAX_CONTEXT_LENGTH = 240

function isSentenceEnding(character: string): boolean {
  return SENTENCE_ENDINGS.has(character)
}

function compactWhitespace(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function formatTeamsPrefix(value: string): string {
  const match = value.match(/^(.{1,160}?)\s{2,}(\d{1,2}:\d{2})(.+)$/u)
  if (!match) return compactWhitespace(value)
  return `${compactWhitespace(match[1])} ${match[2]} — ${compactWhitespace(match[3])}`
}

export function extractContextSentence(text: string, occurrenceIndex: number): string {
  if (!text || occurrenceIndex < 0 || occurrenceIndex >= text.length) return ''

  let start = occurrenceIndex
  while (start > 0 && !isSentenceEnding(text[start - 1])) start -= 1

  let end = occurrenceIndex
  while (end < text.length && !isSentenceEnding(text[end])) end += 1
  if (end < text.length && text[end] !== '\n' && text[end] !== '\r') end += 1

  let sentence = formatTeamsPrefix(text.slice(start, end))
  if (sentence.length <= MAX_CONTEXT_LENGTH) return sentence

  const termOffset = occurrenceIndex - start
  const halfWindow = Math.floor(MAX_CONTEXT_LENGTH / 2)
  const fullSentenceLength = sentence.length
  const windowStart = Math.max(
    0,
    Math.min(termOffset - halfWindow, fullSentenceLength - MAX_CONTEXT_LENGTH),
  )
  const windowEnd = Math.min(sentence.length, windowStart + MAX_CONTEXT_LENGTH)
  sentence = sentence.slice(windowStart, windowEnd).trim()
  return `${windowStart > 0 ? '…' : ''}${sentence}${windowEnd < fullSentenceLength ? '…' : ''}`
}
