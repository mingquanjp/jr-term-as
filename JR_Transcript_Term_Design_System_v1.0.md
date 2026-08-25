# JR Transcript Term Assistant — Design System v1.1

> **Status:** v1.1 — synchronized with the Figma source of truth.  
> **Scope:** Landing page, sign-in, transcript upload, processing state and two-column JR terminology results.  
> **Last updated:** 2026-08-26.

## 0. Source of truth and design direction

This system is adapted from the structure and decisions in `Design_System_Slacord_v1.0 copy.md` and its Figma references:

- [JR Design System / Figma](https://www.figma.com/design/3awPwboDvBZcvucTzG1FIa/JR-specialize-term?node-id=0-1&m=dev)
- [Slacord Components](https://www.figma.com/design/uME9ARmZYLL4IliGxGh5b5/Slacord---Smart-Study-Group?node-id=45-2&m=dev)
- [Slacord Foundations](https://www.figma.com/design/uME9ARmZYLL4IliGxGh5b5/Slacord---Smart-Study-Group?node-id=51-2&m=dev)
- [Slacord Screens](https://www.figma.com/design/uME9ARmZYLL4IliGxGh5b5/Slacord---Smart-Study-Group?node-id=45-3&m=dev)

The reference system contributes the following reusable ideas:

- primitive → semantic → component token hierarchy;
- 4 px spacing grid;
- a small, explicit component/state inventory;
- one primary action per region;
- status communicated by icon + label + color;
- documented loading, empty, error, responsive and keyboard behavior.

The JR product is not a study-group product. Do not copy Slacord's mascot, academic language, lavender identity, or domain cards. The JR product should feel calm, reliable, precise and suitable for an internal enterprise demo.

### 0.1 Product promise

> **社内用語を見つけ、意味を確認し、会議内容を正しく理解する。**

Working product name for UI copy: **JR Term Assistant**. This label can be replaced after the team confirms the final product name.

### 0.2 Product flow

```text
Landing
  → Sign in
  → Upload transcript
  → Processing progress
  → JR terminology results
```

The prototype detects registered JR terms and returns exactly two result columns:

| 検出された社内用語 | 意味 |
|---|---|
| イノ本 | イノベーション本部（新規事業・技術革新を担う部門） |

The UI must not claim that the system summarizes the transcript unless that capability is actually implemented. The current product promise is detection and meaning display.

## 1. Experience principles

| Principle | UI consequence |
|---|---|
| Evidence first | Show the detected term and its canonical meaning directly; never invent a definition in the interface. |
| Calm operational clarity | Use restrained color, clear hierarchy and compact states; avoid decorative SaaS effects. |
| One next action | Each page/region has one primary CTA: upload, start analysis, view results or retry. |
| Make processing legible | Show explicit stages and current state instead of an unexplained spinner. |
| Human review remains visible | Distinguish registered meaning from unresolved/needs-review cases. |
| Japanese-first | Japanese is the primary UI language; Latin text and IDs remain readable. |

## 2. Foundation tokens

### 2.1 Token layers

```text
Primitive tokens → Semantic tokens → Component tokens
```

Screens and components use semantic/component tokens. Primitive values should appear only in the token definition file or illustration assets.

### 2.2 Core color palette

The palette is intentionally neutral and professional. The rail-teal accent is a product token, not a claim about official JR branding.

| Token | Value | Intended use |
|---|---|---|
| `color.canvas` | `#F6F8FB` | page background |
| `color.surface` | `#FFFFFF` | cards, table, dialog, forms |
| `color.surface-subtle` | `#EEF2F6` | soft panels, upload idle area |
| `color.brand-900` | `#4F8590` | brand mark, primary headings |
| `color.brand-700` | `#5B949A` | primary action, links |
| `color.brand-600` | `#74A8AA` | hover/focus action |
| `color.ink` | `#17212B` | primary text |
| `color.ink-muted` | `#5E6B78` | metadata, helper text |
| `color.ink-soft` | `#788694` | placeholder, disabled text |
| `color.border` | `#CBD5DF` | default border |
| `color.border-subtle` | `#E3E9EF` | separators, table rows |
| `color.focus` | `#74A8AA` | visible focus ring |
| `color.header-bg` | `#FFFDF9` | persistent desktop header |
| `color.header-border` | `#D6E3E3` | header divider |

### 2.3 Semantic states

Every state uses an icon and text label in addition to color.

| Semantic token | Foreground | Tint | Use |
|---|---:|---:|---|
| `state.processing` | `#5B949A` | `#E2F1F1` | 分析中 / processing |
| `state.success` | `#23613F` | `#DDF1E5` | 完了 / detected successfully |
| `state.attention` | `#8A5A17` | `#F8EACF` | needs review, slow processing |
| `state.error` | `#A33E32` | `#FBE3DE` | failed upload/processing |
| `state.neutral` | `#526170` | `#E8EDF2` | not started, disabled |

Do not use a gradient for page backgrounds, cards, upload surfaces, table rows or state communication. Do not use glow effects or a purple/multicolor gradient.

### 2.4 Typography

Japanese requires a Japanese-capable typeface. Use Inter for Latin characters and Noto Sans JP for Japanese, with a stable system fallback.

```css
font-family: Inter, "Noto Sans JP", "Hiragino Kaku Gothic ProN", Meiryo, sans-serif;
```

| Role | Size / line-height | Weight | Use |
|---|---:|---:|---|
| Display | 36 / 1.15 | 700 | landing hero only |
| Page heading | 28 / 1.25 | 700 | page title |
| Section heading | 20 / 1.35 | 700 | section/card heading |
| Body | 15 / 1.6 | 400 | explanatory copy |
| Label | 13 / 1.4 | 600 | form/table labels |
| Small | 12 / 1.45 | 400 | helper/status detail |
| Data | 14 / 1.5 | 400 | table content; use `tabular-nums` for counts |

Use `text-balance` for headings and `text-pretty` for paragraphs. Do not use custom letter spacing unless the team explicitly approves it.

### 2.5 Space, shape and elevation

- Base grid: `4, 8, 12, 16, 20, 24, 32, 40, 48, 64 px`.
- Field/button height: `44 px` default; compact controls may be `36 px`.
- Radius: `8 px` control, `12 px` field, `16 px` card, `20 px` major panel, `999 px` pill.
- Card shadow: `0 4px 16px rgb(79 133 144 / 7%)`.
- Hover shadow: `0 8px 24px rgb(79 133 144 / 12%)`, pointer hover only.
- Border is the primary structure; shadows are secondary.

### 2.6 Motion

Motion is functional and optional, not decorative:

- feedback: `160 ms`, ease-out;
- panel entrance: `200 ms`, transform/opacity only;
- progress indicator: may loop only while processing and must pause off-screen;
- respect `prefers-reduced-motion`;
- never animate width/height/layout as the main feedback;
- do not add animation unless the interaction needs it.

## 3. Responsive layout

### 3.1 Page shell

```text
┌─ Header ──────────────────────────────────────────────┐
│ logo / page context                         account   │
├───────────────────────────────────────────────────────┤
│ content max-width 1120 px, centered                    │
└───────────────────────────────────────────────────────┘
```

| Viewport | Rule |
|---|---|
| ≥ 1280 px | max content width 1120 px, horizontal padding 32 px |
| 768–1279 px | horizontal padding 24 px; single content column |
| 480–767 px | horizontal padding 16 px; stacked controls |
| < 480 px | one column; no horizontal table scroll if a card layout is possible |

Use `min-h-dvh`, never `h-screen`. Fixed elements must respect safe-area insets.

### 3.2 Page anatomy

```text
Header → page title/description → primary task region → supporting state/content
```

The upload and results screens should remain visually related so the user understands that they are in one analysis flow.

## 4. Component inventory

### 4.1 Header / Navigation

Source component: `Header / Global`. Variants: `landing`, `authenticated`, `compact-mobile`.

- Persistent on every desktop product screen. Use `color.header-bg` with `color.header-border`; it is a stable page shell, not a hero panel.
- Logo/product name is left. The authenticated desktop navigation exposes `ホーム` / `解析` / `辞書` / `履歴`, followed by the `JR西日本アカウント` status on the right.
- The landing variant keeps the same brand anchor and exposes the `ログイン` action.
- Authenticated header may show `新しい解析` as the single primary action when it is relevant to the current screen.
- Mobile collapses to logo + menu button; icon-only buttons need an accessible name.

### 4.2 Button

Variants: `primary`, `secondary`, `quiet`, `destructive` × `default`, `hover`, `focus`, `loading`, `disabled`.

- Primary uses rail-teal and is reserved for the page's main action.
- Secondary is white/outlined; it must not look like a success badge.
- Destructive requires an `AlertDialog` for irreversible actions.
- Loading preserves button width, sets `aria-busy="true"` and prevents double submit.
- Minimum touch target: `44 × 44 px`.

### 4.3 AuthField / Input

Variants: `default`, `focus`, `error`, `disabled`.

- Visible label is required; placeholder never replaces the label.
- Error text appears directly below the field and explains recovery.
- Use native input semantics and accessible error association.
- Never block paste.

Suggested copy:

- Email: `会社メールアドレス`
- Password: `パスワード`
- Submit: `ログイン`
- Error: `メールアドレスまたはパスワードを確認してください。`

### 4.4 FileDropzone

Variants: `idle`, `drag-over`, `selected`, `invalid`, `uploading`, `complete`.

Content hierarchy:

1. upload icon;
2. `トランスクリプトをアップロード`;
3. `ファイルをドラッグ＆ドロップ、または選択`;
4. accepted format/size helper from the product contract;
5. selected filename, size and remove action.

Do not promise a file type or size until the backend contract is fixed. Errors appear in the dropzone and are announced with `role="alert"`.

### 4.5 ProcessingStepper

Four stages match the product flow:

1. `ファイルを確認中`
2. `トランスクリプトを解析中`
3. `社内用語を照合中`
4. `結果を整理中`

State variants: `pending`, `active`, `complete`, `error`. The current stage has visible text and `aria-live="polite"`; a spinner alone is insufficient. If the system has fewer/more backend stages, the UI labels must be updated to match the real contract.

### 4.6 StatusBadge

Variants: `processing`, `success`, `attention`, `error`, `neutral`.

Each badge contains icon + Japanese label. Never rely on color alone.

### 4.7 TermResultTable

This is the core result component and remains exactly two columns:

| Column | Rule |
|---|---|
| `検出された社内用語` | detected transcript text, preserved as written |
| `意味` | mentor-reviewed dictionary explanation; it may include the official name and a short business description |

Behavior:

- sticky header on long results;
- alternating row tint is optional; subtle borders are preferred;
- long meanings wrap; do not truncate meaning without an expand affordance;
- empty state explains that no registered JR terms were detected;
- loading state uses structural table skeleton rows;
- error state keeps the uploaded filename and offers `もう一度解析`;
- duplicate detections may be grouped only after the product decision is confirmed;
- if a term requires context, show a small `要確認` label in the meaning cell without adding a third column.

The table is not a generated summary. The meaning is displayed verbatim from the registered, mentor-confirmed dictionary; no model-written explanation is substituted at runtime.

### 4.8 EmptyState / ErrorState

Use one clear recovery action:

- empty upload: `トランスクリプトを選択`;
- no result: `別のファイルを解析`;
- failed processing: `もう一度解析`;
- expired/unauthorized: `ログイン画面へ戻る`.

Illustration is optional and secondary to the message. Do not use a mascot or “AI is thinking” language.

## 5. Screen patterns

### 5.1 Landing page

Purpose: explain the problem and the value in the midterm demo language.

Structure:

1. `Header / Global` with product name and `ログイン`;
2. hero: `JR社内用語を、会議トランスクリプトから見つける`;
3. one primary CTA: `デモを始める`;
4. three-step flow: upload → detect → understand;
5. small two-column example table with `イノ本` and `イノベーション本部（新規事業・技術革新を担う部門）`;
6. trust note: `登録済みの社内用語辞書を使用`;
7. footer with prototype/disclaimer copy.

Avoid claiming perfect accuracy, automatic summarization, or general AI understanding.

### 5.2 Sign-in page

Structure: `Header / Global` → centered auth card → short explanatory line → email/password fields → primary login button → error region. A quiet abstract transcript/rail motif may be used, but it must not compete with the form. No decorative illustration is required for the MVP.

### 5.3 Upload home

Structure: `Header / Global` → page heading → short helper copy → FileDropzone → selected file row → `解析を開始`.

The home screen should show one primary task and no dashboard clutter. A small recent-analysis section may be added only if history is supported by the contract.

### 5.4 Processing

Structure: `Header / Global` → file summary → ProcessingStepper → current status message → optional cancel/back action. Keep the user's filename visible so the state is attributable to the correct upload.

### 5.5 Results

Structure: `Header / Global` → result heading → analyzed filename/time → result count/status → two-column TermResultTable. Optional controls such as search/filter belong above the table and must not change the required two-column result model. The `意味` cell is the registered dictionary explanation, not a separate "official name" column.

## 6. Accessibility and interaction quality

Target WCAG 2.2 AA.

- text contrast ≥ 4.5:1 for normal text;
- visible focus ring: 3 px with offset;
- keyboard path: header → upload/select → primary action → result table;
- dialog has accessible name, Escape handling, focus trap and return focus;
- status updates use `aria-live`; upload errors are announced near the dropzone;
- icon-only controls have `aria-label` and a visible tooltip where useful;
- table headers are real `<th>` elements with appropriate scope;
- color is never the only status signal;
- respect reduced motion and zoom/reflow;
- Japanese copy should not be clipped or forced into unnaturally narrow columns.

## 7. Implementation contract

### 7.1 Token mapping

Frontend should map semantic CSS variables rather than scattering hex values:

```css
:root {
  --color-canvas: #f6f8fb;
  --color-surface: #ffffff;
  --color-brand-900: #4f8590;
  --color-brand-700: #5b949a;
  --color-brand-600: #74a8aa;
  --color-ink: #17212b;
  --color-ink-muted: #5e6b78;
  --color-border: #cbd5df;
  --color-border-subtle: #e3e9ef;
  --color-focus: #74a8aa;
  --color-header-bg: #fffdf9;
  --color-header-border: #d6e3e3;
  --color-processing: #5b949a;
  --color-processing-bg: #e2f1f1;
  --color-success-bg: #ddf1e5;
  --color-attention-bg: #f8eacf;
  --color-error-bg: #fbe3de;
  --radius-control: 8px;
  --radius-field: 12px;
  --radius-card: 16px;
  --radius-panel: 20px;
}
```

If the frontend uses Tailwind, use the project token theme and `cn` (`clsx` + `tailwind-merge`) for conditional classes. Use accessible primitives for dialog, select and menu interactions; do not rebuild focus behavior manually.

### 7.2 Suggested component names

```text
HeaderGlobal (Figma: Header / Global)
AuthCard
Button
FormField
FileDropzone
ProcessingStepper
StatusBadge
TermResultTable
EmptyState
ErrorState
```

Use PascalCase in React and `Component / Property=Value` naming in Figma.

## 8. Definition of done for each screen

- [ ] Business state and API assumption are documented.
- [ ] Semantic/component tokens are used; no scattered hard-coded colors.
- [ ] The desktop page shell uses the shared `Header / Global` component.
- [ ] Default, focus, loading, disabled and error states exist where relevant.
- [ ] Desktop, tablet and mobile layouts are specified at 1440, 768 and 375 px.
- [ ] Keyboard, screen-reader announcement, focus and reduced-motion behavior are checked.
- [ ] Long Japanese text and long meanings do not clip.
- [ ] Screenshot and Figma node are attached to the implementation handoff.
- [ ] Claims match the actual prototype; no unsupported summary/AI capability is implied.

## 9. Decisions still needed before implementation

1. Final product name and logo treatment.
2. Login method and whether authentication is real or demo-only.
3. Accepted transcript file formats and maximum size.
4. Whether processing can be cancelled/retried.
5. Whether duplicate term detections are grouped.
6. Whether `Context Required` terms show a visible `要確認` label.
7. Whether the result includes only registered terms or also unresolved candidates.
8. Whether transcript text itself is shown after processing.

Until these are decided, the UI should use explicit placeholders and must not imply unsupported backend behavior.
