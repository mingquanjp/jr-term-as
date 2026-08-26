import type {
  DictionaryBuildResult,
  DictionaryBuildWarning,
  MatchType,
  TermEntry,
  VariantEntry,
} from './types.js'

export type DictionaryRow = {
  termId?: unknown
  canonicalTerm?: unknown
  variant?: unknown
  meaning?: unknown
  matchType?: unknown
  note?: unknown
}

function clean(value: unknown): string {
  if (value == null) return ''
  if (typeof value === 'string' || typeof value === 'number')
    return String(value).trim()
  if (typeof value === 'object') {
    const cell = value as {
      text?: unknown
      result?: unknown
      richText?: Array<{ text?: unknown }>
    }
    if (Array.isArray(cell.richText))
      return cell.richText
        .map((part) => String(part.text ?? ''))
        .join('')
        .trim()
    if (cell.text != null) return String(cell.text).trim()
    if (cell.result != null) return clean(cell.result)
  }
  return String(value).trim()
}

function parseMatchType(
  value: unknown,
  rowNumber: number,
  warnings: DictionaryBuildWarning[],
): MatchType | undefined {
  const normalized = clean(value)
  if (!normalized) return undefined
  if (normalized === 'Exact' || normalized === 'Context Required') return normalized

  warnings.push({
    code: 'UNKNOWN_MATCH_TYPE',
    message: `Row ${rowNumber}: unknown Match_Type "${normalized}" was preserved as blank.`,
  })
  return undefined
}

export function parseDictionaryRows(rows: DictionaryRow[]): DictionaryBuildResult {
  const warnings: DictionaryBuildWarning[] = []
  const terms = new Map<string, TermEntry>()
  const variantOwners = new Map<string, Set<string>>()
  let currentTermId = ''
  let currentCanonicalTerm = ''
  let currentMeaning = ''
  let currentTermIsConflicting = false
  const reportedMetadataConflicts = new Set<string>()

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const termId = clean(row.termId)
    const canonicalTerm = clean(row.canonicalTerm)
    const meaning = clean(row.meaning)
    const variant = clean(row.variant)

    if (termId) {
      currentTermId = termId
      currentCanonicalTerm = canonicalTerm
      currentMeaning = meaning
      currentTermIsConflicting = false

      const existing = terms.get(termId)
      if (
        existing &&
        ((canonicalTerm && canonicalTerm !== existing.canonicalTerm) ||
          (meaning && meaning !== existing.meaning))
      ) {
        currentTermIsConflicting = true
        const conflictKey = `${termId}\u0000${canonicalTerm}\u0000${meaning}`
        if (!reportedMetadataConflicts.has(conflictKey)) {
          reportedMetadataConflicts.add(conflictKey)
          warnings.push({
            code: 'CONFLICTING_TERM_METADATA',
            message: `Row ${rowNumber}: ${termId} has conflicting canonical term or meaning metadata. This row group was ignored.`,
          })
        }
      }
    }
    if (canonicalTerm) currentCanonicalTerm = canonicalTerm
    if (meaning) currentMeaning = meaning
    if (!variant) return

    if (currentTermIsConflicting) return

    if (!currentTermId || !currentCanonicalTerm || !currentMeaning) {
      warnings.push({
        code: 'INCOMPLETE_TERM',
        message: `Row ${rowNumber}: variant "${variant}" has incomplete term metadata and was ignored.`,
      })
      return
    }

    let term = terms.get(currentTermId)
    if (!term) {
      term = {
        termId: currentTermId,
        canonicalTerm: currentCanonicalTerm,
        meaning: currentMeaning,
        variants: [],
      }
      terms.set(currentTermId, term)
    }

    const entry: VariantEntry = {
      value: variant,
      matchType: parseMatchType(row.matchType, rowNumber, warnings),
    }
    const note = clean(row.note)
    if (note) entry.note = note
    term.variants.push(entry)

    const owners = variantOwners.get(variant) ?? new Set<string>()
    owners.add(currentTermId)
    variantOwners.set(variant, owners)
  })

  variantOwners.forEach((owners, variant) => {
    if (owners.size > 1) {
      warnings.push({
        code: 'DUPLICATE_VARIANT',
        message: `Variant "${variant}" belongs to multiple terms: ${[...owners].join(', ')}.`,
      })
    }
  })

  const parsedTerms = [...terms.values()]
  const variants = parsedTerms.flatMap((term) => term.variants)

  return {
    terms: parsedTerms,
    warnings,
    stats: {
      totalTerms: parsedTerms.length,
      totalVariants: variants.length,
      exactVariants: variants.filter((variant) => variant.matchType === 'Exact').length,
      contextRequiredVariants: variants.filter(
        (variant) => variant.matchType === 'Context Required',
      ).length,
      blankMatchTypeVariants: variants.filter((variant) => !variant.matchType).length,
    },
  }
}
