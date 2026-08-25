# JR Term Assistant

JR西日本の会議トランスクリプトから社内用語・略称を検出し、正式名称と意味を確認するためのプロトタイプです。

現在のリポジトリは、Figmaの設計を実装へ移すためのフロントエンド基盤です。現段階では辞書照合と要約APIは未実装で、スターター画面と開発品質チェックを含みます。

## Tech stack

- React 19
- TypeScript 5.9
- Vite 7
- CSS Modules + CSS variables
- Vitest + Testing Library
- ESLint flat config + Prettier
- pnpm

## Requirements

- Node.js `24.19.0` (see `.nvmrc`)
- pnpm `11.19.0`

## Getting started

```bash
pnpm install
pnpm dev
```

Open the local URL printed by Vite. The default command starts the development server with hot reload.

## Quality checks

```bash
pnpm lint
pnpm format:check
pnpm test
pnpm build
```

Run all checks together:

```bash
pnpm check
```

GitHub Actions runs the same `pnpm check` command for pushes and pull requests.

## Project structure

```text
src/
├─ App.tsx                 # Starter screen
├─ App.module.css          # Screen-local styles
├─ styles/
│  ├─ globals.css          # Reset and global behavior
│  └─ tokens.css           # JR product design tokens
└─ test/
   └─ setup.ts             # Test environment setup
```

When features are added, keep UI and domain logic separated by feature:

```text
src/
├─ components/             # Shared UI primitives
├─ features/
│  ├─ upload/
│  ├─ processing/
│  └─ results/
└─ lib/
   └─ term-matcher/
```

## Data handling

The JR dictionary workbook is source material for a future import step. Do not commit the original internal workbook or real transcripts unless the team has confirmed that they may be stored in this repository. A future importer should generate a demo-safe JSON dictionary for the browser-side matcher.

No external LLM or API is required by the current starter screen.

## GitHub workflow

- `main` is the protected integration branch once branch protection is enabled.
- Create feature branches such as `feat/upload-screen` or `fix/matcher-normalization`.
- Open a pull request before merging to `main`.
- Keep `pnpm check` green before requesting review.
