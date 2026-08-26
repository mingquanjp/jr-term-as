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
  return value == null ? '' : String(value).trim()
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

  rows.forEach((row, index) => {
    const rowNumber = index + 1
    const termId = clean(row.termId)
    const canonicalTerm = clean(row.canonicalTerm)
    const meaning = clean(row.meaning)
    const variant = clean(row.variant)

    if (termId) currentTermId = termId
    if (canonicalTerm) currentCanonicalTerm = canonicalTerm
    if (meaning) currentMeaning = meaning
    if (!variant) return

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
