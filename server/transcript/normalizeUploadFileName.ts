export function normalizeUploadFileName(fileName: string): string {
  const normalized = fileName.normalize('NFC')

  // Busboy/Multer may expose UTF-8 filename bytes as Latin-1 characters.
  // A name that already contains real Unicode must not be decoded a second time.
  if ([...normalized].some((character) => character.codePointAt(0)! > 0xff)) {
    return normalized
  }

  try {
    return new TextDecoder('utf-8', { fatal: true })
      .decode(Buffer.from(normalized, 'latin1'))
      .normalize('NFC')
  } catch {
    return normalized
  }
}
