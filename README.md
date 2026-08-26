# JR Term Assistant

JR西日本の会議トランスクリプトから、レビュー済み辞書に登録された社内用語・略称を検出し、正式名称と意味を表示するローカルWebアプリです。現在のフェーズは `Exact` 一致のみを扱い、LLM・外部AI・外部ストレージは使用しません。

## Architecture

```text
React / Vite frontend
        ↓ /api proxy
Node / Express backend
        ↓
In-memory TXT / DOCX extraction
        ↓
Unicode normalization
        ↓
Generated JR dictionary
        ↓
Exact-only terminology matching
        ↓
Results page
```

Authentication is handled by the local Express API. Passwords are stored only as bcrypt hashes in the ignored `data/users.json` file, and successful login creates an HTTP-only in-memory session cookie. Restarting the API invalidates active sessions.

## Requirements

- Node.js `24.19.0` (see `.nvmrc`)
- pnpm `11.19.0`

## Setup

```bash
pnpm install
pnpm dictionary:build
pnpm auth:seed-admin
pnpm dev
```

`pnpm dev` starts:

- Frontend: `http://127.0.0.1:5173`
- API: `http://127.0.0.1:3001`

To choose the initial admin credentials instead of generating a password:

```powershell
$env:ADMIN_EMAIL = "admin@example.local"
$env:ADMIN_PASSWORD = "replace-with-a-strong-password"
pnpm auth:seed-admin
```

## Commands

```bash
pnpm dev                 # frontend + API
pnpm dev:web             # Vite only
pnpm dev:server          # Express API only
pnpm dictionary:build    # XLSX → generated runtime JSON
pnpm auth:seed-admin     # create or replace the local admin
pnpm test
pnpm lint
pnpm build
pnpm check
```

## Project structure

```text
data/
├─ jr-terms.xlsx
├─ jr-terms.generated.json
└─ users.json                    # local only, ignored by Git
scripts/
├─ build-term-dictionary.ts
└─ seed-admin.ts
server/
├─ auth/
├─ routes/
├─ terminology/
├─ transcript/
├─ app.ts
└─ index.ts
shared/
└─ analysis.ts
src/
├─ api/client.ts
├─ assets/
├─ styles/
├─ test/
├─ App.tsx
├─ App.module.css
└─ App.test.tsx
test/fixtures/
└─ demo-transcript.txt
```

## Dictionary behavior

The source workbook is `data/jr-terms.xlsx`. The build script reads only the `社内用語辞書_統合版` sheet, locates the required headers without relying on a fixed row number, forward-fills grouped `Term_ID`, `Canonical_Term`, and `Meaning` cells, and writes `data/jr-terms.generated.json`.

Runtime behavior is intentionally strict:

```ts
if (variant.matchType !== 'Exact') {
  continue
}
```

- `Exact`: included in matching.
- `Context Required`: preserved in generated JSON but skipped at runtime.
- Blank or unknown match type: skipped at runtime.
- Latin/acronym variants use alphanumeric boundaries.
- Japanese variants use normalized substring matching without JavaScript `\b`.
- Multiple variants belonging to the same `Term_ID` produce one result.
- Results are ordered by their first occurrence in the transcript.

## API

### Authentication

```text
POST /api/auth/login
GET  /api/auth/session
POST /api/auth/logout
```

### Transcript analysis

```text
POST /api/analyze-transcript
Content-Type: multipart/form-data
Field: file
Supported: .txt, .docx
Maximum size: 10 MB
```

The endpoint requires an authenticated session. Uploaded buffers are processed in memory and are not persisted. The server never logs complete transcript contents.

### Dictionary examples

```text
GET /api/dictionary/examples
```

The landing page uses this endpoint so its example rows also come from the generated dictionary instead of mock data.

## Data handling

- No OpenAI, Copilot, Gemini, LLM, RAG, embeddings, fuzzy matching, or semantic search.
- No transcript content is stored in localStorage, sessionStorage, IndexedDB, a database, or permanent files.
- The two provided JR transcripts are used only for local verification and are not copied into the repository.
- `Context Required` resolution is intentionally outside the current phase.
