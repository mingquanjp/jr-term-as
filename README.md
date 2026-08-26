# JR Term Assistant

JR西日本の会議トランスクリプトから、レビュー済み辞書に登録された社内用語・略称を検出し、正式名称と意味を表示するローカルWebアプリです。通常は `Exact` 一致のみを扱い、任意でローカルGPU上のQwenによる文脈判定（Context Gate）を有効化できます。外部ストレージは使用しません。

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

- Frontend: `http://127.0.0.1:5174`
- API: `http://127.0.0.1:3001`

### Optional: Qwen Context Gate

The Context Gate keeps the JR-reviewed dictionary as the source of truth and uses
Qwen only to decide whether a matched occurrence is actually used with that
meaning in its surrounding utterances. `reject` and `uncertain` results are not
returned to the UI.

1. Keep the SSH tunnel to the Qwen/vLLM server running on local port `18000`.
2. Copy `.env.example` to `.env.local` and set:

```dotenv
QWEN_CONTEXT_GATE=true
QWEN_API_KEY=local-vllm
QWEN_CONTEXT_GATE_MODE=risky
```

3. Start `pnpm dev` as usual.

`risky` validates `Context Required` variants and short forms (for example,
`うや` and `とけ`) while directly retaining the other `Exact` matches. `all`
validates every match and is slower; use it only after testing the target
transcript.

### Qwen context evaluation

`test/fixtures/qwen-context-evaluation.json` contains anonymized, synthetic
positive and negative examples for every v2 `Context Required` variant. Its
labels are an internal draft (`JRレビュー待ち`), not JR-approved ground truth.
After the SSH tunnel is running and Qwen is enabled, run:

```bash
pnpm qwen:evaluate
```

The command reports TP, FP, FN, TN, precision, recall, and the individual
incorrect case IDs. Ask JR reviewers to approve or correct the expected labels
before citing the metric externally.

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
├─ jr-terms.legacy.xlsx           # detailed definitions retained for Qwen
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

The reviewed v2 workbook is `data/jr-terms.xlsx`. The build script reads only
the `社内用語辞書_統合版` sheet, locates required headers without relying on a
fixed row number, reads Excel rich-text cells, and writes
`data/jr-terms.generated.json`. The v2 `Meaning` is stored as a broad
classification; for still-valid Term_IDs, the detailed JR-reviewed description
from `data/jr-terms.legacy.xlsx` is retained for Qwen context validation.

Rows with incomplete metadata or one Term_ID assigned to multiple canonical
terms are skipped with build warnings. They are never silently assigned to a
previous term.

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
Field: files (repeat for each transcript; legacy field `file` is also accepted)
Supported: .txt, .docx
Maximum: 10 files per request, 10 MB per file
```

The endpoint requires an authenticated session. Uploaded buffers are processed in memory and are not persisted. The server never logs complete transcript contents.

### Dictionary examples

```text
GET /api/dictionary/examples
```

The landing page uses this endpoint so its example rows also come from the generated dictionary instead of mock data.

### Excel export

```text
POST /api/export-results
```

The authenticated results page sends only its displayed, accepted results to
this endpoint and downloads an `.xlsx` file with the detected term, transcript
name (for multi-file analysis), official name, inferred meaning, context
sentence, and occurrence count.

## Data handling

- Qwen is optional and receives only a candidate term, relevant JR dictionary
  information, and a short previous/current/next context window through the
  configured SSH tunnel. It never receives the full workbook or transcript.
- No transcript content is stored in localStorage, sessionStorage, IndexedDB, a database, or permanent files.
- The two provided JR transcripts are used only for local verification and are not copied into the repository.
- `Context Required` resolution is intentionally outside the current phase.
