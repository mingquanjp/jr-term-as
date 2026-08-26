export type NormalizedText = {
  originalText: string
  normalizedText: string
  originalIndexes: number[]
}

export function normalizeTextWithMap(originalText: string): NormalizedText {
  const normalizedCharacters: string[] = []
  const originalIndexes: number[] = []
  let previousWasWhitespace = false

  for (let index = 0; index < originalText.length;) {
    const codePoint = originalText.codePointAt(index)
    if (codePoint == null) break
    const character = String.fromCodePoint(codePoint)
    const normalizedCharacter = character.normalize('NFKC').toLocaleLowerCase('en-US')
    const isWhitespace = /^\s+$/u.test(normalizedCharacter)

    if (isWhitespace) {
      if (!previousWasWhitespace && normalizedCharacters.length > 0) {
        normalizedCharacters.push(' ')
        originalIndexes.push(index)
      }
      previousWasWhitespace = true
    } else {
      for (const outputCharacter of normalizedCharacter) {
        normalizedCharacters.push(outputCharacter)
        originalIndexes.push(index)
      }
      previousWasWhitespace = false
    }

    index += character.length
  }

  if (normalizedCharacters.at(-1) === ' ') {
    normalizedCharacters.pop()
    originalIndexes.pop()
  }

  return {
    originalText,
    normalizedText: normalizedCharacters.join(''),
    originalIndexes,
  }
}

export function normalizeText(text: string): string {
  return normalizeTextWithMap(text).normalizedText
}
