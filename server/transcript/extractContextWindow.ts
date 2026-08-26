const MAX_UTTERANCE_LENGTH = 360

export type ContextWindow = {
  previous: string
  current: string
  next: string
}

function compact(value: string): string {
  return value.replace(/\s+/gu, ' ').trim()
}

function truncate(value: string, maxLength = MAX_UTTERANCE_LENGTH): string {
  if (value.length <= maxLength) return value
  return `${value.slice(0, maxLength - 1).trimEnd()}…`
}

function blockStart(text: string, index: number): number {
  const separator = text.lastIndexOf('\n\n', index)
  return separator === -1 ? 0 : separator + 2
}

function blockEnd(text: string, index: number): number {
  const separator = text.indexOf('\n\n', index)
  return separator === -1 ? text.length : separator
}

function previousBlock(text: string, currentStart: number): string {
  if (currentStart === 0) return ''
  const end = Math.max(0, currentStart - 2)
  const separator = text.lastIndexOf('\n\n', Math.max(0, end - 1))
  const start = separator === -1 ? 0 : separator + 2
  return text.slice(start, end)
}

function nextBlock(text: string, currentEnd: number): string {
  if (currentEnd >= text.length) return ''
  const start = Math.min(text.length, currentEnd + 2)
  return text.slice(start, blockEnd(text, start))
}

/**
 * Returns the preceding, matching, and following transcript utterance.
 * Teams DOCX exports separate utterances with blank lines; the fallback also
 * works for plain text by returning the surrounding text block.
 */
export function extractContextWindow(
  text: string,
  occurrenceIndex: number,
): ContextWindow {
  if (!text || occurrenceIndex < 0 || occurrenceIndex >= text.length) {
    return { previous: '', current: '', next: '' }
  }

  const currentStart = blockStart(text, occurrenceIndex)
  const currentEnd = blockEnd(text, occurrenceIndex)

  return {
    previous: truncate(compact(previousBlock(text, currentStart))),
    current: truncate(compact(text.slice(currentStart, currentEnd))),
    next: truncate(compact(nextBlock(text, currentEnd))),
  }
}

/**
 * A candidate occurring inside a Teams speaker/room prefix is metadata, not
 * spoken transcript content. Example: "…山幹共通（会議室） 0:04 発話".
 */
export function isTranscriptMetadataOccurrence(
  text: string,
  occurrenceIndex: number,
): boolean {
  if (!text || occurrenceIndex < 0 || occurrenceIndex >= text.length) return false

  const start = blockStart(text, occurrenceIndex)
  const end = blockEnd(text, occurrenceIndex)
  const block = text.slice(start, end)
  const timestampStart = block.search(/\s{2,}\d{1,2}:\d{2}/u)
  if (timestampStart === -1 || timestampStart > 220) return false

  return occurrenceIndex - start < timestampStart
}
