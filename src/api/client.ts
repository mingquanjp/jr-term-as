import type {
  AnalyzeTranscriptResponse,
  ApiErrorResponse,
  AuthUser,
  DictionaryExample,
  LoginResponse,
} from '../../shared/analysis'

export class ApiClientError extends Error {
  constructor(
    public readonly code: ApiErrorResponse['error']['code'],
    message: string,
  ) {
    super(message)
  }
}

async function parseResponse<T>(response: Response): Promise<T> {
  if (response.ok) return (await response.json()) as T
  const body = (await response.json().catch(() => null)) as ApiErrorResponse | null
  throw new ApiClientError(
    body?.error.code ?? 'INTERNAL_SERVER_ERROR',
    body?.error.message ?? 'サーバーとの通信に失敗しました。',
  )
}

export async function login(email: string, password: string): Promise<AuthUser> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  return (await parseResponse<LoginResponse>(response)).user
}

export async function getSession(): Promise<AuthUser | null> {
  const response = await fetch('/api/auth/session', { credentials: 'include' })
  if (response.status === 401) return null
  return (await parseResponse<LoginResponse>(response)).user
}

export async function logout(): Promise<void> {
  await fetch('/api/auth/logout', {
    method: 'POST',
    credentials: 'include',
  })
}

export async function analyzeTranscript(
  file: File,
  signal?: AbortSignal,
): Promise<AnalyzeTranscriptResponse> {
  const formData = new FormData()
  formData.append('file', file)
  const response = await fetch('/api/analyze-transcript', {
    method: 'POST',
    credentials: 'include',
    body: formData,
    signal,
  })
  return parseResponse<AnalyzeTranscriptResponse>(response)
}

export async function getDictionaryExamples(): Promise<DictionaryExample[]> {
  const response = await fetch('/api/dictionary/examples')
  const body = await parseResponse<{
    success: true
    examples: DictionaryExample[]
  }>(response)
  return body.examples
}
