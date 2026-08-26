export type MatchType = 'Exact' | 'Context Required'

export type VariantEntry = {
  value: string
  matchType?: MatchType
  note?: string
}

export type TermEntry = {
  termId: string
  canonicalTerm: string
  /** Detailed JR-reviewed definition. Used for UI and context validation. */
  meaning: string
  /** Broad classification supplied by the reviewed v2 dictionary. */
  classification?: string
  variants: VariantEntry[]
}

export type GeneratedDictionary = {
  generatedAt: string
  source: string
  terms: TermEntry[]
}

export type DictionaryBuildWarning = {
  code:
    | 'DUPLICATE_VARIANT'
    | 'UNKNOWN_MATCH_TYPE'
    | 'INCOMPLETE_TERM'
    | 'CONFLICTING_TERM_METADATA'
  message: string
}

export type DictionaryBuildResult = {
  terms: TermEntry[]
  warnings: DictionaryBuildWarning[]
  stats: {
    totalTerms: number
    totalVariants: number
    exactVariants: number
    contextRequiredVariants: number
    blankMatchTypeVariants: number
  }
}
