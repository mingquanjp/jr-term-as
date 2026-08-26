const KANA_ONLY = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]+$/u
const KANA_CHARACTER = /^[\p{Script=Hiragana}\p{Script=Katakana}ー]$/u
const ALLOWED_LEFT_KANA_BOUNDARIES = new Set([
  'は',
  'が',
  'を',
  'に',
  'で',
  'と',
  'の',
  'も',
  'へ',
])
const ALLOWED_RIGHT_KANA_BOUNDARIES = [
  'は',
  'が',
  'を',
  'に',
  'で',
  'と',
  'の',
  'も',
  'へ',
  'です',
  'でした',
  'だ',
  'だった',
]

function previousCharacter(text: string, index: number): string {
  return index <= 0 ? '' : String.fromCodePoint(text.codePointAt(index - 1) ?? 0)
}

function isShortKanaVariant(variant: string): boolean {
  return KANA_ONLY.test(variant) && [...variant].length <= 3
}

function hasValidShortKanaBoundaries(
  text: string,
  matchIndex: number,
  variant: string,
): boolean {
  if (!isShortKanaVariant(variant)) return true

  const previous = previousCharacter(text, matchIndex)
  if (
    previous &&
    KANA_CHARACTER.test(previous) &&
    !ALLOWED_LEFT_KANA_BOUNDARIES.has(previous)
  ) {
    return false
  }

  const suffix = text.slice(matchIndex + variant.length)
  const next = suffix[0] ?? ''
  if (
    next &&
    KANA_CHARACTER.test(next) &&
    !ALLOWED_RIGHT_KANA_BOUNDARIES.some((boundary) => suffix.startsWith(boundary))
  ) {
    return false
  }

  return true
}

function isInsideTeamsMetadataPrefix(
  originalText: string,
  originalIndex: number,
): boolean {
  const transcriptStartMarker = originalText.indexOf('文字起こしを開始しました')
  if (transcriptStartMarker !== -1) {
    const firstUtteranceStart = originalText.indexOf('\n\n', transcriptStartMarker)
    if (firstUtteranceStart !== -1 && originalIndex < firstUtteranceStart + 2) {
      return true
    }
  }

  const paragraphSeparator = originalText.lastIndexOf('\n\n', originalIndex)
  const paragraphStart = paragraphSeparator === -1 ? 0 : paragraphSeparator + 2
  const paragraphEndCandidate = originalText.indexOf('\n\n', originalIndex)
  const paragraphEnd =
    paragraphEndCandidate === -1 ? originalText.length : paragraphEndCandidate
  const paragraph = originalText.slice(paragraphStart, paragraphEnd)
  const prefix = paragraph.match(/^.{1,180}?\s{2,}\d{1,2}:\d{2}/u)?.[0]
  if (!prefix) return false
  return originalIndex < paragraphStart + prefix.length
}

export type MatchRuleInput = {
  normalizedText: string
  normalizedMatchIndex: number
  normalizedVariant: string
  originalText: string
  originalMatchIndex: number
}

export function passesRuleBasedMatchChecks(input: MatchRuleInput): boolean {
  if (isInsideTeamsMetadataPrefix(input.originalText, input.originalMatchIndex)) {
    return false
  }

  return hasValidShortKanaBoundaries(
    input.normalizedText,
    input.normalizedMatchIndex,
    input.normalizedVariant,
  )
}
