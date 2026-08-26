import { Router } from 'express'

import type { DictionaryExample } from '../../shared/analysis.js'
import { loadDictionary } from '../terminology/loadDictionary.js'

export const dictionaryRouter = Router()

dictionaryRouter.get('/examples', async (_request, response) => {
  try {
    const terms = await loadDictionary()
    const examples: DictionaryExample[] = terms
      .flatMap((term) => {
        const variant = term.variants.find(
          (candidate) =>
            candidate.matchType === 'Exact' && candidate.value !== term.canonicalTerm,
        )
        return variant ? [{ term: variant.value, meaning: term.canonicalTerm }] : []
      })
      .slice(0, 2)
    response.json({ success: true, examples })
  } catch {
    response.status(500).json({
      success: false,
      error: { code: 'DICTIONARY_NOT_FOUND', message: '用語辞書が見つかりません。' },
    })
  }
})
