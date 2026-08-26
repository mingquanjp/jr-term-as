export type AnalysisResult = {
  termId: string
  displayTerm: string
  canonicalTerm: string
  meaning: string
  contextSentence: string
  matchedVariants: string[]
  occurrenceCount: number
  firstOccurrenceIndex: number
}

export type AnalyzeTranscriptResponse = {
  success: true
  file: {
    name: string
    size: number
    type: string
  }
  stats: {
    characterCount: number
    detectedTermCount: number
    totalOccurrences: number
  }
  results: AnalysisResult[]
}

export type ApiErrorCode =
  | 'NO_FILE'
  | 'FILE_TOO_LARGE'
  | 'UNSUPPORTED_FILE_TYPE'
  | 'EMPTY_TRANSCRIPT'
  | 'TRANSCRIPT_EXTRACTION_FAILED'
  | 'DICTIONARY_NOT_FOUND'
  | 'INVALID_CREDENTIALS'
  | 'UNAUTHORIZED'
  | 'INTERNAL_SERVER_ERROR'

export type ApiErrorResponse = {
  success: false
  error: {
    code: ApiErrorCode
    message: string
  }
}

export type AuthUser = {
  id: string
  email: string
  role: 'admin' | 'user'
}

export type LoginResponse = {
  success: true
  user: AuthUser
}

export type DictionaryExample = {
  term: string
  meaning: string
}
