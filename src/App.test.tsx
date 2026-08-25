import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('JR Term Assistant starter screen', () => {
  it('renders the product promise and workflow', () => {
    render(<App />)

    expect(
      screen.getByRole('heading', {
        name: '社内用語を見つけ、意味を確認する。',
      }),
    ).toBeInTheDocument()
    expect(screen.getByText('アップロード')).toBeInTheDocument()
    expect(screen.getByText('検出')).toBeInTheDocument()
    expect(screen.getByText('意味を確認')).toBeInTheDocument()
  })
})
