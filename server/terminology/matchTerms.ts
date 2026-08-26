import type { AnalysisResult } from '../../shared/analysis.js'
import { extractContextSentence } from '../transcript/extractContextSentence.js'
import {
  extractContextWindow,
  isTranscriptMetadataOccurrence,
  type ContextWindow,
} from '../transcript/extractContextWindow.js'
import { normalizeText, normalizeTextWithMap } from '../transcript/normalizeText.js'
import type { MatchType, TermEntry } from './types.js'

type MatchCandidate = {
  term: TermEntry
  normalizedVariant: string
  matchType: MatchType
  startsWithLatinAlphanumeric: boolean
  endsWithLatinAlphanumeric: boolean
}

export type TermMatchOccurrence = {
  termId: string
  canonicalTerm: string
  meaning: string
  displayTerm: string
  matchedVariant: string
  matchType: MatchType
  originalIndex: number
  contextSentence: string
  contextWindow: ContextWindow
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

export function findTermOccurrences(
  transcript: string,
  terms: TermEntry[],
  options: { includeContextRequired?: boolean } = {},
): TermMatchOccurrence[] {
  const normalized = normalizeTextWithMap(transcript)
  const candidates: MatchCandidate[] = terms
    .flatMap((term) =>
      term.variants.flatMap((variant) => {
        if (
          variant.matchType !== 'Exact' &&
          !(options.includeContextRequired && variant.matchType === 'Context Required')
        ) {
          return []
        }
        const normalizedVariant = normalizeText(variant.value)
        if (!normalizedVariant || !variant.matchType) return []
        return [
          {
            term,
            normalizedVariant,
            matchType: variant.matchType,
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
  const occurrences: TermMatchOccurrence[] = []

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

      const originalIndex = normalized.originalIndexes[matchIndex] ?? matchIndex
      if (isTranscriptMetadataOccurrence(normalized.originalText, originalIndex))
        continue

      occupied.fill(1, matchIndex, matchEnd)
      const displayTerm = originalSlice(
        normalized.originalText,
        normalized.originalIndexes,
        matchIndex,
        candidate.normalizedVariant.length,
      )
      occurrences.push({
        termId: candidate.term.termId,
        canonicalTerm: candidate.term.canonicalTerm,
        meaning: candidate.term.meaning,
        displayTerm,
        matchedVariant: candidate.normalizedVariant,
        matchType: candidate.matchType,
        originalIndex,
        contextSentence: extractContextSentence(normalized.originalText, originalIndex),
        contextWindow: extractContextWindow(normalized.originalText, originalIndex),
      })
    }
  }

  return occurrences.sort((left, right) => left.originalIndex - right.originalIndex)
}

export function groupTermOccurrences(
  occurrences: TermMatchOccurrence[],
): AnalysisResult[] {
  const groupedResults = new Map<string, MutableResult>()

  for (const occurrence of occurrences) {
    let result = groupedResults.get(occurrence.termId)
    if (!result) {
      result = {
        termId: occurrence.termId,
        displayTerm: occurrence.displayTerm,
        canonicalTerm: occurrence.canonicalTerm,
        meaning: occurrence.meaning,
        contextSentence: occurrence.contextSentence,
        matchedVariants: [],
        matchedVariantIndexes: new Map<string, number>(),
        occurrenceCount: 0,
        firstOccurrenceIndex: occurrence.originalIndex,
      }
      groupedResults.set(occurrence.termId, result)
    }

    result.occurrenceCount += 1
    if (!result.matchedVariantIndexes.has(occurrence.displayTerm)) {
      result.matchedVariantIndexes.set(occurrence.displayTerm, occurrence.originalIndex)
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

/** Existing exact-only API used when the Context Gate is disabled. */
export function matchTerms(transcript: string, terms: TermEntry[]): AnalysisResult[] {
  return groupTermOccurrences(findTermOccurrences(transcript, terms))
}
