import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'

import bcrypt from 'bcryptjs'
import ExcelJS from 'exceljs'
import request from 'supertest'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'

import { app } from './app.js'
import { clearSessions } from './auth/sessionStore.js'

let temporaryDirectory = ''
const email = 'admin@example.test'
const password = 'Test-Admin-Password-2026!'

beforeEach(async () => {
  temporaryDirectory = await mkdtemp(path.join(tmpdir(), 'jr-term-auth-'))
  const usersFile = path.join(temporaryDirectory, 'users.json')
  process.env.USERS_FILE = usersFile
  await writeFile(
    usersFile,
    JSON.stringify([
      {
        id: 'admin-test',
        email,
        passwordHash: await bcrypt.hash(password, 4),
        role: 'admin',
        createdAt: new Date().toISOString(),
      },
    ]),
    'utf8',
  )
})

afterEach(async () => {
  clearSessions()
  delete process.env.USERS_FILE
  await rm(temporaryDirectory, { recursive: true, force: true })
})

describe('API', () => {
  it('authenticates the admin and returns its session', async () => {
    const agent = request.agent(app)
    const loginResponse = await agent.post('/api/auth/login').send({ email, password })
    expect(loginResponse.status).toBe(200)
    expect(loginResponse.body.user).toMatchObject({ email, role: 'admin' })

    const sessionResponse = await agent.get('/api/auth/session')
    expect(sessionResponse.status).toBe(200)
    expect(sessionResponse.body.user.email).toBe(email)
  })

  it('protects transcript analysis', async () => {
    const response = await request(app)
      .post('/api/analyze-transcript')
      .attach('file', Buffer.from('イノ本'), 'transcript.txt')
    expect(response.status).toBe(401)
    expect(response.body.error.code).toBe('UNAUTHORIZED')
  })

  it('analyzes a TXT file with the generated Exact-only dictionary', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email, password })
    const response = await agent
      .post('/api/analyze-transcript')
      .attach('file', Buffer.from('イノ本とUKについて確認します。', 'utf8'), {
        filename: 'transcript.txt',
        contentType: 'text/plain',
      })

    expect(response.status).toBe(200)
    expect(response.body.results).toHaveLength(1)
    expect(response.body.results[0]).toMatchObject({
      canonicalTerm: 'イノベーション本部',
      displayTerm: 'イノ本',
      contextSentence: 'イノ本とUKについて確認します。',
    })
  })

  it('exports accepted analysis results as an Excel file', async () => {
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email, password })

    const response = await agent
      .post('/api/export-results')
      .buffer(true)
      .parse((response, callback) => {
        const chunks: Buffer[] = []
        response.on('data', (chunk: Buffer) => chunks.push(chunk))
        response.on('end', () => callback(null, Buffer.concat(chunks)))
      })
      .send({
        fileName: 'demo.docx',
        analyzedAt: '2026-08-26T10:00:00.000Z',
        results: [
          {
            termId: 'TERM_001',
            displayTerm: 'イノ本',
            canonicalTerm: 'イノベーション本部',
            classification: '組織名称',
            meaning: 'イノベーションを推進する本部',
            contextSentence: 'イノ本と連携します。',
            matchedVariants: ['イノ本'],
            occurrenceCount: 1,
            firstOccurrenceIndex: 0,
          },
        ],
      })

    expect(response.status).toBe(200)
    expect(response.headers['content-type']).toContain(
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    expect(response.body).toBeInstanceOf(Buffer)
    expect(response.body.length).toBeGreaterThan(1000)

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(response.body)
    const sheet = workbook.getWorksheet('解析結果')
    expect(sheet?.getCell('A3').value).toBe('検出された社内用語')
    expect(sheet?.getCell('C4').value).toBe('組織名称')
    expect(sheet?.getCell('D4').value).toBe('イノベーションを推進する本部')
  })
})
