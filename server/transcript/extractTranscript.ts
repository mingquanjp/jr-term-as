import path from 'node:path'

import mammoth from 'mammoth'

export class TranscriptExtractionError extends Error {
  constructor(
    public readonly code: 'UNSUPPORTED_FILE_TYPE' | 'TRANSCRIPT_EXTRACTION_FAILED',
    message: string,
  ) {
    super(message)
  }
}

type TranscriptFile = {
  originalname: string
  mimetype: string
  buffer: Buffer
}

export async function extractTranscript(file: TranscriptFile): Promise<string> {
  const extension = path.extname(file.originalname).toLocaleLowerCase('en-US')

  try {
    if (extension === '.txt') {
      return new TextDecoder('utf-8', { fatal: true })
        .decode(file.buffer)
        .replace(/^\uFEFF/, '')
    }

    if (extension === '.docx') {
      const result = await mammoth.extractRawText({ buffer: file.buffer })
      return result.value
    }
  } catch {
    throw new TranscriptExtractionError(
      'TRANSCRIPT_EXTRACTION_FAILED',
      'トランスクリプトを読み取れませんでした。',
    )
  }

  throw new TranscriptExtractionError(
    'UNSUPPORTED_FILE_TYPE',
    'このファイル形式には対応していません。',
  )
}
