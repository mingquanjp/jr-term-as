import type { AnalysisResult } from '../../shared/analysis.js'
import { extractContextSentence } from '../transcript/extractContextSentence.js'
import { normalizeText, normalizeTextWithMap } from '../transcript/normalizeText.js'
import type { TermEntry } from './types.js'

type MatchCandidate = {
  term: TermEntry
  normalizedVariant: string
  startsWithLatinAlphanumeric: boolean
  endsWithLatinAlphanumeric: boolean
}

type MutableResult = AnalysisResult & {
  matchedVariantIndexes: Map<string, number>
}

function isLatinBoundaryCharacter(character: string | undefined): boolean {
  return character != null && /[a-z0-9]/i.test(character)
}

function originalSlice(
  originalText: string,
  originalIndexes: number[],
  start: number,
  length: number,
): string {
  const originalStart = originalIndexes[start] ?? start
  const lastNormalizedIndex = start + length - 1
  const lastOriginalStart = originalIndexes[lastNormalizedIndex] ?? originalStart
  const codePoint = originalText.codePointAt(lastOriginalStart)
  const originalEnd =
    lastOriginalStart + (codePoint != null && codePoint > 0xffff ? 2 : 1)
  return originalText.slice(originalStart, originalEnd)
}

export function matchTerms(transcript: string, terms: TermEntry[]): AnalysisResult[] {
  const normalized = normalizeTextWithMap(transcript)
  const candidates: MatchCandidate[] = terms
    .flatMap((term) =>
      term.variants.flatMap((variant) => {
        // Context Required and blank Match_Type entries are intentionally skipped.
        if (variant.matchType !== 'Exact') return []
        const normalizedVariant = normalizeText(variant.value)
        if (!normalizedVariant) return []
        return [
          {
            term,
            normalizedVariant,
            startsWithLatinAlphanumeric: /^[a-z0-9]/i.test(normalizedVariant),
            endsWithLatinAlphanumeric: /[a-z0-9]$/i.test(normalizedVariant),
          },
        ]
      }),
    )
    .sort(
      (left, right) => right.normalizedVariant.length - left.normalizedVariant.length,
    )

  const occupied = new Uint8Array(normalized.normalizedText.length)
  const groupedResults = new Map<string, MutableResult>()

  for (const candidate of candidates) {
    let searchFrom = 0
    while (
      searchFrom <=
      normalized.normalizedText.length - candidate.normalizedVariant.length
    ) {
      const matchIndex = normalized.normalizedText.indexOf(
        candidate.normalizedVariant,
        searchFrom,
      )
      if (matchIndex === -1) break
      const matchEnd = matchIndex + candidate.normalizedVariant.length
      searchFrom = matchIndex + Math.max(1, candidate.normalizedVariant.length)

      if (
        (candidate.startsWithLatinAlphanumeric &&
          isLatinBoundaryCharacter(normalized.normalizedText[matchIndex - 1])) ||
        (candidate.endsWithLatinAlphanumeric &&
          isLatinBoundaryCharacter(normalized.normalizedText[matchEnd]))
      ) {
        continue
      }

      let overlaps = false
      for (let index = matchIndex; index < matchEnd; index += 1) {
        if (occupied[index]) {
          overlaps = true
          break
        }
      }
      if (overlaps) continue
      occupied.fill(1, matchIndex, matchEnd)

      const displayTerm = originalSlice(
        normalized.originalText,
        normalized.originalIndexes,
        matchIndex,
        candidate.normalizedVariant.length,
      )
      const originalIndex = normalized.originalIndexes[matchIndex] ?? matchIndex
      let result = groupedResults.get(candidate.term.termId)
      if (!result) {
        result = {
          termId: candidate.term.termId,
          displayTerm,
          canonicalTerm: candidate.term.canonicalTerm,
          meaning: candidate.term.meaning,
          contextSentence: extractContextSentence(
            normalized.originalText,
            originalIndex,
          ),
          matchedVariants: [],
          matchedVariantIndexes: new Map<string, number>(),
          occurrenceCount: 0,
          firstOccurrenceIndex: originalIndex,
        }
        groupedResults.set(candidate.term.termId, result)
      }

      result.occurrenceCount += 1
      if (!result.matchedVariantIndexes.has(displayTerm)) {
        result.matchedVariantIndexes.set(displayTerm, originalIndex)
      }
      if (originalIndex < result.firstOccurrenceIndex) {
        result.firstOccurrenceIndex = originalIndex
        result.displayTerm = displayTerm
        result.contextSentence = extractContextSentence(
          normalized.originalText,
          originalIndex,
        )
      }
    }
  }

  return [...groupedResults.values()]
    .sort((left, right) => left.firstOccurrenceIndex - right.firstOccurrenceIndex)
    .map((result) => ({
      termId: result.termId,
      displayTerm: result.displayTerm,
      canonicalTerm: result.canonicalTerm,
      meaning: result.meaning,
      contextSentence: result.contextSentence,
      matchedVariants: [...result.matchedVariantIndexes.entries()]
        .sort((left, right) => left[1] - right[1])
        .map(([variant]) => variant),
      occurrenceCount: result.occurrenceCount,
      firstOccurrenceIndex: result.firstOccurrenceIndex,
    }))
}
