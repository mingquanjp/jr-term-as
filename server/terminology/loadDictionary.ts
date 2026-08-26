import { readFile } from 'node:fs/promises'
import path from 'node:path'

import type { GeneratedDictionary, TermEntry } from './types.js'

let cachedTerms: TermEntry[] | null = null

export async function loadDictionary(): Promise<TermEntry[]> {
  if (cachedTerms) return cachedTerms

  const dictionaryPath = path.resolve('data/jr-terms.generated.json')
  const content = await readFile(dictionaryPath, 'utf8')
  const dictionary = JSON.parse(content) as GeneratedDictionary
  if (!Array.isArray(dictionary.terms))
    throw new Error('Generated dictionary is invalid.')
  cachedTerms = dictionary.terms
  return cachedTerms
}

export function clearDictionaryCache() {
  cachedTerms = null
}
