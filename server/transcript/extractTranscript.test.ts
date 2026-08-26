import { Document, Packer, Paragraph } from 'docx'
import { describe, expect, it } from 'vitest'

import { extractTranscript, TranscriptExtractionError } from './extractTranscript.js'

describe('extractTranscript', () => {
  it('decodes UTF-8 TXT', async () => {
    const text = await extractTranscript({
      originalname: 'transcript.txt',
      mimetype: 'text/plain',
      buffer: Buffer.from('イノ本を確認します。', 'utf8'),
    })
    expect(text).toContain('イノ本')
  })

  it('extracts Japanese text from DOCX', async () => {
    const document = new Document({
      sections: [{ children: [new Paragraph('イノ本を確認します。')] }],
    })
    const buffer = await Packer.toBuffer(document)
    const text = await extractTranscript({
      originalname: 'transcript.docx',
      mimetype:
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      buffer,
    })
    expect(text).toContain('イノ本を確認します。')
  })

  it('rejects unsupported formats', async () => {
    await expect(
      extractTranscript({
        originalname: 'transcript.pdf',
        mimetype: 'application/pdf',
        buffer: Buffer.from('not a PDF'),
      }),
    ).rejects.toBeInstanceOf(TranscriptExtractionError)
  })
})
