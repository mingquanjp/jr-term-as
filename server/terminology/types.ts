export type MatchType = 'Exact' | 'Context Required'

export type VariantEntry = {
  value: string
  matchType?: MatchType
  note?: string
}

export type TermEntry = {
  termId: string
  canonicalTerm: string
  meaning: string
  variants: VariantEntry[]
}

export type GeneratedDictionary = {
  generatedAt: string
  source: string
  terms: TermEntry[]
}

export type DictionaryBuildWarning = {
  code: 'DUPLICATE_VARIANT' | 'UNKNOWN_MATCH_TYPE' | 'INCOMPLETE_TERM'
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
