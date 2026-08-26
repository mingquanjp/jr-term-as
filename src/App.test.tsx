import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import App from './App'

const admin = { id: 'admin-1', email: 'admin@jr-term.local', role: 'admin' }

function jsonResponse(body: unknown, status = 200) {
  return Promise.resolve(
    new Response(JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  )
}

function successAnalysis(results: unknown[]) {
  return {
    success: true,
    file: { name: 'meeting.txt', size: 128, type: 'text/plain' },
    stats: {
      characterCount: 20,
      detectedTermCount: results.length,
      totalOccurrences: results.length,
    },
    results,
  }
}

beforeEach(() => {
  window.location.hash = ''
  vi.stubGlobal(
    'fetch',
    vi.fn((input: RequestInfo | URL) => {
      const url = String(input)
      if (url.includes('/api/dictionary/examples')) {
        return jsonResponse({
          success: true,
          examples: [{ term: 'イノ本', meaning: 'イノベーション本部' }],
        })
      }
      if (url.includes('/api/auth/session')) {
        return jsonResponse(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'ログインが必要です。' },
          },
          401,
        )
      }
      return jsonResponse({ success: true })
    }),
  )
})

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

describe('JR Term Assistant pages', () => {
  it('renders dictionary-backed examples on the landing page', async () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: 'JR社内用語を、会議トランスクリプトから見つける',
      }),
    ).toBeInTheDocument()
    expect(await screen.findByRole('rowheader', { name: 'イノ本' })).toBeInTheDocument()
  })

  it('logs in through the backend API', async () => {
    window.location.hash = '#login'
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/auth/login'))
        return jsonResponse({ success: true, user: admin })
      if (url.includes('/api/auth/session')) {
        return jsonResponse(
          {
            success: false,
            error: { code: 'UNAUTHORIZED', message: 'ログインが必要です。' },
          },
          401,
        )
      }
      if (url.includes('/api/dictionary/examples')) {
        return jsonResponse({ success: true, examples: [] })
      }
      return jsonResponse({ success: true })
    })
    render(<App />)

    fireEvent.change(screen.getByLabelText('会社メールアドレス'), {
      target: { value: admin.email },
    })
    fireEvent.change(screen.getByLabelText('パスワード'), {
      target: { value: 'password' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'ログイン' }))

    expect(
      await screen.findByRole('heading', { name: 'トランスクリプトを解析' }),
    ).toBeInTheDocument()
    expect(fetch).toHaveBeenCalledWith(
      '/api/auth/login',
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('uploads a file, shows processing, and renders API results', async () => {
    window.location.hash = '#upload'
    let resolveAnalysis!: (response: Response) => void
    const analysisPromise = new Promise<Response>((resolve) => {
      resolveAnalysis = resolve
    })
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/auth/session'))
        return jsonResponse({ success: true, user: admin })
      if (url.includes('/api/dictionary/examples')) {
        return jsonResponse({ success: true, examples: [] })
      }
      if (url.includes('/api/analyze-transcript')) return analysisPromise
      return jsonResponse({ success: true })
    })
    render(<App />)

    const fileInput = await screen.findByLabelText('トランスクリプトファイルを選択')
    const file = new File(['イノ本について確認します。'], 'meeting.txt', {
      type: 'text/plain',
    })
    fireEvent.change(fileInput, { target: { files: [file] } })
    fireEvent.click(screen.getByRole('button', { name: '解析を開始' }))

    expect(await screen.findByRole('heading', { name: '解析中' })).toBeInTheDocument()
    resolveAnalysis(
      new Response(
        JSON.stringify(
          successAnalysis([
            {
              termId: 'TERM_001',
              displayTerm: 'イノ本',
              canonicalTerm: 'イノベーション本部',
              classification: '組織名称',
              meaning: '組織名称',
              contextSentence: 'イノ本について確認します。',
              matchedVariants: ['イノ本'],
              occurrenceCount: 1,
              firstOccurrenceIndex: 0,
            },
          ]),
        ),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    )

    expect(await screen.findByRole('heading', { name: '解析結果' })).toBeInTheDocument()
    expect(screen.getByRole('rowheader', { name: /イノ本/ })).toBeInTheDocument()
    expect(
      screen.getByText(
        (_content, element) =>
          element?.tagName === 'TD' &&
          element.textContent === 'イノ本について確認します。',
      ),
    ).toBeInTheDocument()
    expect(screen.getByText('イノ本', { selector: 'mark' })).toHaveClass(
      /contextTermHighlight/,
    )
    expect(screen.getAllByText('組織名称')).toHaveLength(2)
    expect(screen.getByRole('columnheader', { name: '意味の推測' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: '分類' })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Excelをダウンロード' }),
    ).toBeInTheDocument()
    expect(screen.queryByText('Pattern / Results · 1440 × 900')).toBeNull()
  })

  it('shows a retryable API error', async () => {
    window.location.hash = '#upload'
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/auth/session'))
        return jsonResponse({ success: true, user: admin })
      if (url.includes('/api/dictionary/examples')) {
        return jsonResponse({ success: true, examples: [] })
      }
      if (url.includes('/api/analyze-transcript')) {
        return jsonResponse(
          {
            success: false,
            error: { code: 'EMPTY_TRANSCRIPT', message: 'トランスクリプトが空です。' },
          },
          422,
        )
      }
      return jsonResponse({ success: true })
    })
    render(<App />)

    const input = await screen.findByLabelText('トランスクリプトファイルを選択')
    fireEvent.change(input, {
      target: { files: [new File([''], 'empty.txt', { type: 'text/plain' })] },
    })
    fireEvent.click(screen.getByRole('button', { name: '解析を開始' }))

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'トランスクリプトが空です。',
    )
    expect(screen.getByRole('button', { name: '再試行' })).toBeInTheDocument()
  })

  it('renders the empty result state', async () => {
    window.location.hash = '#upload'
    vi.mocked(fetch).mockImplementation((input) => {
      const url = String(input)
      if (url.includes('/api/auth/session'))
        return jsonResponse({ success: true, user: admin })
      if (url.includes('/api/dictionary/examples')) {
        return jsonResponse({ success: true, examples: [] })
      }
      if (url.includes('/api/analyze-transcript')) {
        return jsonResponse(successAnalysis([]))
      }
      return jsonResponse({ success: true })
    })
    render(<App />)

    const input = await screen.findByLabelText('トランスクリプトファイルを選択')
    fireEvent.change(input, {
      target: { files: [new File(['一般的な会議です。'], 'meeting.txt')] },
    })
    fireEvent.click(screen.getByRole('button', { name: '解析を開始' }))

    expect(
      await screen.findByText(
        '社内用語辞書に登録されている用語は検出されませんでした。',
      ),
    ).toBeInTheDocument()
  })

  it('allows the password to be revealed and hidden', () => {
    window.location.hash = '#login'
    render(<App />)

    const password = screen.getByLabelText('パスワード')
    fireEvent.click(screen.getByRole('button', { name: 'パスワードを表示' }))
    expect(password).toHaveAttribute('type', 'text')

    fireEvent.click(screen.getByRole('button', { name: 'パスワードを隠す' }))
    expect(password).toHaveAttribute('type', 'password')
  })

  it('redirects protected routes to login when no session exists', async () => {
    window.location.hash = '#results'
    render(<App />)

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'ログイン' })).toBeInTheDocument()
    })
  })
})
