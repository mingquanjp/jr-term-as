import {
  ChangeEvent,
  type CSSProperties,
  FormEvent,
  type KeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react'

import accountStatus from './assets/account-status.svg'
import mascotLanding from './assets/mascot-landing.png'
import mascotProcessingHelper from './assets/mascot-processing-helper.png'
import mascotResultsHelper from './assets/mascot-results-helper.png'
import mascotUploadHelper from './assets/mascot-upload-helper.png'
import processingActiveStep from './assets/processing-active-step.svg'
import processingCompleteStep from './assets/processing-complete-step.svg'
import processingDivider from './assets/processing-divider.svg'
import processingGuidanceBadge from './assets/processing-guidance-badge.svg'
import processingPendingStep from './assets/processing-pending-step.svg'
import processingStatusDot from './assets/processing-status-dot.svg'
import resultsGuidanceBadge from './assets/results-guidance-badge.svg'
import resultsStatus from './assets/results-status.svg'
import statusDot from './assets/status-dot.svg'
import stepBadge from './assets/step-badge.svg'
import {
  analyzeTranscript,
  ApiClientError,
  exportAnalysisResults,
  getDictionaryExamples,
  getSession,
  login,
  logout,
} from './api/client'
import { LOGIN_LOADING_DURATION_MS, OPENING_SPLASH_DURATION_MS } from './config/loading'
import { PROCESSING_STAGE_DURATION_MS } from './config/processing'
import styles from './App.module.css'
import type {
  AnalyzeTranscriptResponse,
  AuthUser,
  DictionaryExample,
} from '../shared/analysis'

const steps = [
  { number: '01', title: 'アップロード', detail: 'Transcriptを選択' },
  { number: '02', title: '検出', detail: 'JR用語を照合' },
  { number: '03', title: '理解', detail: '意味・正式名称を確認' },
]

const landingRoutes = ['', '#landing', '#features', '#workflow', '#example']

type BrandMarkProps = {
  href: string
}

function BrandMark({ href }: BrandMarkProps) {
  return (
    <a className={styles.brand} href={href} aria-label="JR Term Assistant ホーム">
      <svg
        className={styles.brandTrainLogo}
        viewBox="0 0 360 132"
        role="img"
        aria-label="Shinkansen"
      >
        <path
          d="M15 91c0-18 17-29 46-40l58-20 29-20c7-5 14-7 23-7h174"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          strokeLinejoin="round"
          strokeWidth="9"
        />
        <path d="M116 31h65c-8 10-17 15-31 15H87" fill="currentColor" />
        <path
          d="M15 91c0 11 8 18 21 18h309M15 126h330M166 77h179"
          fill="none"
          stroke="currentColor"
          strokeLinecap="square"
          strokeWidth="9"
        />
        <g fill="currentColor">
          <rect x="213" y="47" width="18" height="18" rx="3" />
          <rect x="247" y="47" width="18" height="18" rx="3" />
          <rect x="281" y="47" width="18" height="18" rx="3" />
          <rect x="315" y="47" width="18" height="18" rx="3" />
        </g>
      </svg>
      <span className={styles.brandWordmark} aria-hidden="true">
        <strong>JR TERM</strong>
        <small>ASSISTANT</small>
      </span>
    </a>
  )
}

function ShinkansenLogo() {
  return (
    <span className={styles.shinkansenLogo} aria-hidden="true">
      <span className={styles.logoTrainBody}>
        <span className={styles.logoTrainWindow} />
        <span className={styles.logoTrainStripe} />
      </span>
      <span className={styles.logoTrainNose} />
      <span className={styles.logoRail} />
    </span>
  )
}

function OpeningSplash() {
  return (
    <div
      className={styles.openingSplash}
      data-testid="opening-splash"
      style={
        {
          '--opening-splash-duration': `${OPENING_SPLASH_DURATION_MS}ms`,
        } as CSSProperties
      }
    >
      <div className={styles.splashPanelTop} />
      <div className={styles.splashPanelBottom} />
      <div className={styles.splashIdentity}>
        <ShinkansenLogo />
        <strong>JR Term Assistant</strong>
        <span>言葉をつなぎ、理解を加速する</span>
      </div>
    </div>
  )
}

function LandingPage({ examples }: { examples: DictionaryExample[] }) {
  return (
    <main className={styles.landingPage} data-testid="landing-page">
      <header className={styles.landingHeader}>
        <div className={styles.landingHeaderInner}>
          <BrandMark href="#landing" />
          <nav className={styles.landingNav} aria-label="ランディングナビゲーション">
            <a href="#features">機能</a>
            <a href="#workflow">使い方</a>
            <a href="#example">出力例</a>
          </nav>
          <a className={styles.headerLoginButton} href="#login">
            ログイン
            <span aria-hidden="true">→</span>
          </a>
        </div>
      </header>

      <section className={styles.landingHero} aria-labelledby="landing-title">
        <div className={styles.heroCopy}>
          <p className={styles.heroEyebrow}>
            <span /> JR INTERNAL KNOWLEDGE PLATFORM
          </p>
          <h1 id="landing-title">
            JR社内用語を、
            <em>会議トランスクリプト</em>から見つける
          </h1>
          <p className={styles.heroDescription}>
            登録済みの社内用語辞書と生成AIを活用し、会議の中にある略語や専門用語を、
            誰にでもわかる知識へ変換します。
          </p>
          <div className={styles.heroActions}>
            <a className={styles.primaryButton} href="#login">
              解析を始める <span aria-hidden="true">→</span>
            </a>
            <a className={styles.heroTextLink} href="#workflow">
              使い方を見る <span aria-hidden="true">↓</span>
            </a>
          </div>
          <div className={styles.heroTrust}>
            <span>TXT / DOCX 対応</span>
            <span>社内辞書連携</span>
            <span>安全な解析環境</span>
          </div>
        </div>

        <div className={styles.heroVisual} aria-label="用語解析のイメージ">
          <div className={styles.heroVisualAccent} />
          <div className={styles.transcriptCard}>
            <div className={styles.mockWindowBar}>
              <span />
              <span />
              <span />
              <small>meeting_transcript.txt</small>
            </div>
            <p>
              次回の定例では、<mark>イノ本</mark>との連携について確認します。
            </p>
            <div className={styles.detectedTermCard}>
              <span>DETECTED TERM</span>
              <strong>イノ本</strong>
              <p>イノベーション本部</p>
              <small>組織名称 · 辞書登録済み</small>
            </div>
          </div>
          <img src={mascotLanding} alt="JR Term Assistantの案内キャラクター" />
          <div className={styles.heroVisualBadge}>
            <strong>AI</strong>
            <span>文脈から意味を補完</span>
          </div>
        </div>
      </section>

      <section className={styles.valueStrip} aria-label="サービスの特徴">
        <div>
          <strong>01</strong>
          <span>会議データをアップロード</span>
        </div>
        <div>
          <strong>02</strong>
          <span>社内用語を自動検出</span>
        </div>
        <div>
          <strong>03</strong>
          <span>正式名称と意味を整理</span>
        </div>
      </section>

      <section className={styles.featuresSection} id="features">
        <div className={styles.sectionHeading}>
          <p>WHY JR TERM ASSISTANT</p>
          <h2>会議の理解を、もっと速く・正確に</h2>
          <span>人によって異なる社内用語の理解を、ひとつの共通知識に整えます。</span>
        </div>
        <div className={styles.featureGrid}>
          <article>
            <span className={styles.featureIcon}>01</span>
            <h3>自動用語検出</h3>
            <p>
              トランスクリプトを読み込み、辞書に登録された略語・専門用語を素早く特定します。
            </p>
          </article>
          <article>
            <span className={styles.featureIcon}>02</span>
            <h3>文脈を含めて整理</h3>
            <p>
              用語だけでなく、実際に使われた発話文も並べて表示。背景まで確認できます。
            </p>
          </article>
          <article>
            <span className={styles.featureIcon}>03</span>
            <h3>共有しやすい結果</h3>
            <p>
              解析結果を一覧で確認し、Excelとして出力。チームのナレッジ共有に活用できます。
            </p>
          </article>
        </div>
      </section>

      <section className={styles.workflowSection} id="workflow">
        <div className={styles.workflowIntro}>
          <p>HOW IT WORKS</p>
          <h2>
            わずか3ステップで、
            <br />
            会議の言葉がわかる
          </h2>
          <span>
            複雑な設定は必要ありません。ファイルを選ぶだけで解析を開始できます。
          </span>
          <a href="#login">
            今すぐ試してみる <span aria-hidden="true">→</span>
          </a>
        </div>
        <ol className={styles.steps} aria-label="利用の流れ">
          {steps.map((step) => (
            <li key={step.number}>
              <span>{step.number}</span>
              <div>
                <strong>{step.title}</strong>
                <small>{step.detail}</small>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className={styles.exampleSection} id="example">
        <div className={styles.sectionHeading}>
          <p>OUTPUT EXAMPLE</p>
          <h2>検出結果を、ひと目で確認</h2>
          <span>
            社内辞書に登録された正式名称と意味を、発話の文脈と一緒に表示します。
          </span>
        </div>
        <div className={styles.exampleArea}>
          <div className={styles.exampleTableWrapper}>
            <table className={styles.exampleTable}>
              <thead>
                <tr>
                  <th scope="col">検出された社内用語</th>
                  <th scope="col">意味</th>
                  <th scope="col">ステータス</th>
                </tr>
              </thead>
              <tbody>
                {examples.map((item) => (
                  <tr key={item.term}>
                    <th scope="row">{item.term}</th>
                    <td>{item.meaning}</td>
                    <td>
                      <span className={styles.tableStatus}>辞書登録済み</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.landingCta}>
        <ShinkansenLogo />
        <div>
          <p>READY TO DEPART?</p>
          <h2>会議の「わからない」を、次の駅へ。</h2>
        </div>
        <a href="#login">
          解析を始める <span aria-hidden="true">→</span>
        </a>
      </section>

      <footer className={styles.landingFooter}>
        <div className={styles.footerMain}>
          <BrandMark href="#landing" />
          <p>社内用語の理解を支え、組織のコミュニケーションをよりスムーズに。</p>
          <nav aria-label="フッターナビゲーション">
            <a href="#features">機能</a>
            <a href="#workflow">使い方</a>
            <a href="#example">出力例</a>
            <a href="#login">ログイン</a>
          </nav>
        </div>
        <div className={styles.footerBottom}>
          <span>JR Term Assistant</span>
          <small>© 2026 JR WEST. Internal use only.</small>
        </div>
      </footer>
    </main>
  )
}

type FormFieldProps = {
  autoComplete: string
  helperText: string
  id: string
  label: string
  name: string
  placeholder: string
  type: 'email' | 'password' | 'text'
}

function FormField({
  autoComplete,
  helperText,
  id,
  label,
  name,
  placeholder,
  type,
}: FormFieldProps) {
  const [passwordVisible, setPasswordVisible] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && passwordVisible ? 'text' : type
  const helperId = `${id}-helper`

  return (
    <div className={styles.formField}>
      <label htmlFor={id}>{label}</label>
      <div className={styles.inputShell}>
        <input
          id={id}
          name={name}
          type={inputType}
          autoComplete={autoComplete}
          placeholder={placeholder}
          aria-describedby={helperId}
          required
        />
        {isPassword && (
          <button
            className={styles.passwordToggle}
            type="button"
            aria-label={passwordVisible ? 'パスワードを隠す' : 'パスワードを表示'}
            aria-pressed={passwordVisible}
            onClick={() => setPasswordVisible((visible) => !visible)}
          >
            <span aria-hidden="true">◉</span>
          </button>
        )}
      </div>
      <p id={helperId}>{helperText}</p>
    </div>
  )
}

function LoginPage({ onLogin }: { onLogin: (user: AuthUser) => void }) {
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    const form = new FormData(event.currentTarget)
    try {
      const user = await login(
        String(form.get('email') ?? ''),
        String(form.get('password') ?? ''),
      )
      onLogin(user)
    } catch (loginError) {
      setError(
        loginError instanceof ApiClientError
          ? loginError.message
          : 'ログイン中にエラーが発生しました。',
      )
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className={styles.loginPage} data-testid="login-page">
      <section className={styles.authCard} aria-labelledby="login-title">
        <BrandMark href="#landing" />

        <div className={styles.introduction}>
          <h1 id="login-title">ログイン</h1>
          <p>JR社内用語の検出を始めるにはログインしてください。</p>
        </div>

        <form className={styles.form} onSubmit={handleSubmit}>
          <FormField
            id="company-email"
            name="email"
            label="会社メールアドレス"
            type="email"
            autoComplete="email"
            placeholder="メールアドレスを入力"
            helperText="会社アカウントを使用してください。"
          />
          <FormField
            id="password"
            name="password"
            label="パスワード"
            type="password"
            autoComplete="current-password"
            placeholder="パスワードを入力"
            helperText="8文字以上のパスワード"
          />
          {error && (
            <p className={styles.formError} role="alert">
              {error}
            </p>
          )}
          <button className={styles.submitButton} type="submit" disabled={submitting}>
            {submitting ? 'ログイン中…' : 'ログイン'}
          </button>
        </form>

        <p className={styles.supportText}>
          ログインできない場合は管理者へ確認してください。
        </p>
      </section>
    </main>
  )
}

function LoginLoadingPage() {
  return (
    <main
      className={styles.loginLoadingPage}
      data-testid="login-loading-page"
      style={
        {
          '--login-loading-duration': `${LOGIN_LOADING_DURATION_MS}ms`,
        } as CSSProperties
      }
    >
      <div className={styles.loadingGlow} aria-hidden="true" />
      <section
        className={styles.loginLoadingContent}
        aria-labelledby="login-loading-title"
        aria-describedby="login-loading-description"
      >
        <div className={styles.loadingBrand} aria-label="JR Term Assistant">
          <span className={styles.loadingMonogram} aria-hidden="true">
            JR
          </span>
          <span>JR Term Assistant</span>
        </div>

        <div className={styles.trainScene} aria-hidden="true">
          <span className={`${styles.speedLine} ${styles.speedLineOne}`} />
          <span className={`${styles.speedLine} ${styles.speedLineTwo}`} />
          <span className={`${styles.speedLine} ${styles.speedLineThree}`} />
          <div className={styles.shinkansen}>
            <div className={styles.trainTail} />
            <div className={styles.trainNose} />
            <div className={styles.trainBody}>
              <span className={styles.trainWindow} />
              <span className={styles.trainWindow} />
              <span className={styles.trainWindow} />
              <span className={styles.trainDoor} />
              <span className={styles.trainRearDoor} />
              <span className={styles.trainStripe} />
            </div>
          </div>
          <div className={styles.railway}>
            <span />
          </div>
        </div>

        <div className={styles.loadingCopy} aria-live="polite">
          <p className={styles.loadingEyebrow}>WELCOME ABOARD</p>
          <h1 id="login-loading-title">ワークスペースへ移動しています</h1>
          <p id="login-loading-description">
            安全に接続しています。まもなくご利用いただけます。
          </p>
        </div>

        <div className={styles.loginProgress} aria-hidden="true">
          <span />
        </div>
        <p className={styles.loadingStatus}>
          <span aria-hidden="true" />
          セッションを準備中
        </p>
      </section>
    </main>
  )
}

const uploadGuidance = [
  'TXT / DOCX に対応',
  '日本語テキストを推奨',
  '選択後に解析を開始',
]

function GlobalHeader({ user, onLogout }: { user: AuthUser; onLogout: () => void }) {
  return (
    <header className={styles.globalHeader}>
      <BrandMark href="#landing" />
      <span className={styles.headerDivider} aria-hidden="true" />
      <nav className={styles.globalNav} aria-label="メインナビゲーション">
        <a href="#landing">ホーム</a>
        <a className={styles.activeNavItem} href="#upload" aria-current="page">
          解析
        </a>
        <a href="#dictionary">辞書</a>
        <a href="#history">履歴</a>
      </nav>
      <span className={styles.accountLabel} title={user.email}>
        {user.role === 'admin' ? '管理者アカウント' : 'JR西日本アカウント'}
      </span>
      <img className={styles.accountStatus} src={accountStatus} alt="接続中" />
      <button className={styles.logoutButton} type="button" onClick={onLogout}>
        ログアウト
      </button>
    </header>
  )
}

type ProtectedPageProps = {
  user: AuthUser
  onLogout: () => void
}

type UploadPageProps = ProtectedPageProps & {
  selectedFiles: File[]
  onFilesChange: (files: File[]) => void
  onAnalyze: () => void
}

function UploadPage({
  selectedFiles,
  onFilesChange,
  onAnalyze,
  user,
  onLogout,
}: UploadPageProps) {
  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? [])
    if (files.length === 0) return

    onFilesChange(files)
    event.target.value = ''
  }

  const totalSize = selectedFiles.reduce((total, file) => total + file.size, 0)

  return (
    <main className={styles.uploadPage} data-testid="upload-page">
      <GlobalHeader user={user} onLogout={onLogout} />

      <div className={styles.uploadWorkspace}>
        <section className={styles.uploadSurface} aria-labelledby="upload-title">
          <div className={styles.uploadMain}>
            <h1 id="upload-title">トランスクリプトを解析</h1>
            <p className={styles.uploadDescription}>
              会議後のトランスクリプトをアップロードすると、JR社内用語を検出できます。
            </p>

            <label className={styles.dropzone}>
              <input
                type="file"
                accept=".txt,.docx"
                multiple
                onChange={handleFileChange}
                aria-label="トランスクリプトファイルを選択"
              />
              <span className={styles.uploadTypeIcon} aria-hidden="true">
                TXT
              </span>
              <strong>
                {selectedFiles.length > 0
                  ? `${selectedFiles.length}件のファイルを選択しました`
                  : 'ファイルを選択'}
              </strong>
              <span>
                {selectedFiles.length > 0
                  ? `${Math.max(1, Math.round(totalSize / 1024))} KB · 解析を開始できます`
                  : 'TXT / DOCX ファイルを選択してください'}
              </span>
              <small>
                {selectedFiles.length > 0
                  ? '選択したファイルは下の一覧で確認できます'
                  : 'ファイルが選択されていません'}
              </small>
            </label>

            {selectedFiles.length > 0 && (
              <div className={styles.fileSummaryList} aria-label="選択したファイル">
                {selectedFiles.map((file, index) => (
                  <div className={styles.fileSummary} key={`${file.name}-${index}`}>
                    <span className={styles.fileTypeIcon} aria-hidden="true">
                      {file.name.toLocaleLowerCase('en-US').endsWith('.docx')
                        ? 'DOCX'
                        : 'TXT'}
                    </span>
                    <span className={styles.fileDetails}>
                      <strong>{file.name}</strong>
                      <small>{Math.max(1, Math.round(file.size / 1024))} KB</small>
                    </span>
                    <span className={styles.selectedStatus}>
                      <img src={statusDot} alt="" />
                      選択済み
                    </span>
                    <button
                      type="button"
                      className={styles.removeFile}
                      aria-label={`${file.name}を削除`}
                      onClick={() =>
                        onFilesChange(
                          selectedFiles.filter((_, fileIndex) => fileIndex !== index),
                        )
                      }
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            )}

            <button
              className={styles.analysisButton}
              type="button"
              disabled={selectedFiles.length === 0}
              onClick={onAnalyze}
            >
              解析を開始
            </button>
            <p className={styles.uploadContractNote}>
              TXT / DOCX · ファイルサイズ上限は product contract に準拠
            </p>
          </div>

          <aside className={styles.contextRail} aria-labelledby="upload-hints-title">
            <div className={styles.contextHero}>
              <img src={mascotUploadHelper} alt="アップロードを案内するキャラクター" />
              <div>
                <h2 id="upload-hints-title">アップロードのヒント</h2>
                <p>ファイルを選ぶ前に確認しましょう。</p>
              </div>
            </div>
            <div className={styles.contextDivider} />
            <ol className={styles.guidanceList}>
              {uploadGuidance.map((guidance, index) => (
                <li key={guidance}>
                  <img src={stepBadge} alt="" />
                  <strong>{String(index + 1).padStart(2, '0')}</strong>
                  <span>{guidance}</span>
                </li>
              ))}
            </ol>
          </aside>
        </section>
      </div>
    </main>
  )
}

const processingSteps = [
  {
    title: 'ファイルを読み込んでいます',
    pendingDetail: '待機中',
  },
  {
    title: '文字起こしを抽出しています',
    pendingDetail: '待機中',
  },
  {
    title: '社内用語辞書と照合しています',
    pendingDetail: '待機中',
  },
  {
    title: '解析が完了しました',
    pendingDetail: '待機中',
  },
] as const

const processingGuidance = [
  '文字起こしを抽出します',
  'JR用語辞書と照合します',
  '意味・正式名称を整理します',
]

type ProcessingPageProps = ProtectedPageProps & {
  files: File[]
  stage: number
  error: string
  onCancel: () => void
  onRetry: () => void
}

function ProcessingPage({
  files,
  stage,
  error,
  onCancel,
  onRetry,
  user,
  onLogout,
}: ProcessingPageProps) {
  const batchName =
    files.length === 0
      ? 'ファイル未選択'
      : files.length === 1
        ? files[0].name
        : `${files.length}件のトランスクリプト`

  return (
    <main className={styles.uploadPage} data-testid="processing-page">
      <GlobalHeader user={user} onLogout={onLogout} />

      <div className={styles.processingWorkspace}>
        <section
          className={styles.processingSurface}
          aria-labelledby="processing-title"
        >
          <div className={styles.processingMain}>
            <h1 id="processing-title">解析中</h1>
            <p className={styles.processingDescription}>
              処理が完了するまで、このページを閉じないでください。
            </p>

            <div
              className={styles.processingFileList}
              aria-label="処理中のトランスクリプト"
            >
              {files.map((file, index) => (
                <div
                  className={styles.processingFileSummary}
                  key={`${file.name}-${index}`}
                >
                  <span className={styles.processingFileIcon} aria-hidden="true">
                    {file.name.toLocaleLowerCase('en-US').endsWith('.docx')
                      ? 'DOCX'
                      : 'TXT'}
                  </span>
                  <span className={styles.fileDetails}>
                    <strong>{file.name}</strong>
                    <small>{error ? 'エラー' : '解析中'}</small>
                  </span>
                  <span className={styles.processingStatus}>
                    <img src={processingStatusDot} alt="" />
                    {error ? '失敗' : '処理中'}
                  </span>
                </div>
              ))}
            </div>

            <div className={styles.processingStepper} aria-live="polite">
              <div className={styles.stepperHeading}>
                <p>Transcript processing</p>
                <strong>{batchName}</strong>
                <span>
                  {error ? '解析に失敗しました' : processingSteps[stage]?.title}
                </span>
              </div>
              <img className={styles.stepperDivider} src={processingDivider} alt="" />
              <ol className={styles.processSteps}>
                {processingSteps.map((step, index) => {
                  const state =
                    index < stage ? 'complete' : index === stage ? 'active' : 'pending'
                  const icon =
                    state === 'complete'
                      ? processingCompleteStep
                      : state === 'active'
                        ? processingActiveStep
                        : processingPendingStep

                  return (
                    <li className={styles[`${state}Step`]} key={step.title}>
                      <span className={styles.processStepIcon}>
                        <img src={icon} alt="" />
                        <b>{state === 'complete' ? '✓' : index + 1}</b>
                      </span>
                      <span className={styles.processStepCopy}>
                        <strong>{step.title}</strong>
                        <small>
                          {state === 'complete'
                            ? '完了'
                            : state === 'active'
                              ? '処理中'
                              : step.pendingDetail}
                        </small>
                      </span>
                    </li>
                  )
                })}
              </ol>
            </div>

            {error && (
              <div className={styles.processingError} role="alert">
                <strong>解析できませんでした</strong>
                <span>{error}</span>
                <button type="button" onClick={onRetry}>
                  再試行
                </button>
              </div>
            )}

            <button className={styles.cancelButton} type="button" onClick={onCancel}>
              {error ? 'アップロードに戻る' : 'キャンセル'}
            </button>
          </div>

          <aside
            className={styles.processingRail}
            aria-labelledby="processing-hints-title"
          >
            <div className={styles.processingContextHero}>
              <img src={mascotProcessingHelper} alt="処理状況を案内するキャラクター" />
              <div>
                <h2 id="processing-hints-title">処理中のヒント</h2>
                <p>完了までの流れを確認できます。</p>
              </div>
            </div>
            <div className={styles.contextDivider} />
            <ol className={styles.processingGuidance}>
              {processingGuidance.map((guidance, index) => (
                <li key={guidance}>
                  <img src={processingGuidanceBadge} alt="" />
                  <strong>{String(index + 1).padStart(2, '0')}</strong>
                  <span>{guidance}</span>
                </li>
              ))}
            </ol>
            <p className={styles.processingRailNote}>
              処理状況はこの画面で確認できます。
            </p>
          </aside>
        </section>
      </div>
    </main>
  )
}

const resultsGuidance = [
  '検出された用語を一覧で確認',
  '正式名称・意味を照合',
  '要確認バッジをレビュー',
]

function HighlightedContext({ text, term }: { text: string; term: string }) {
  if (!text || !term) return <>{text || '—'}</>

  const fragments: ReactNode[] = []
  let searchFrom = 0
  let matchIndex = text.indexOf(term, searchFrom)

  while (matchIndex !== -1) {
    if (matchIndex > searchFrom) fragments.push(text.slice(searchFrom, matchIndex))
    fragments.push(
      <mark className={styles.contextTermHighlight} key={`${matchIndex}-${term}`}>
        {term}
      </mark>,
    )
    searchFrom = matchIndex + term.length
    matchIndex = text.indexOf(term, searchFrom)
  }

  if (searchFrom < text.length) fragments.push(text.slice(searchFrom))
  return <>{fragments.length > 0 ? fragments : text}</>
}

type ResultsPageProps = ProtectedPageProps & {
  analysis: AnalyzeTranscriptResponse | null
  analyzedAt: Date | null
}

function ResultsPage({ analysis, analyzedAt, user, onLogout }: ResultsPageProps) {
  const resultCount = analysis?.results.length ?? 0
  const showTranscriptColumn = (analysis?.files.length ?? 0) > 1
  const [downloadError, setDownloadError] = useState('')
  const [resultsRailWidth, setResultsRailWidth] = useState(340)
  const resultsSurfaceRef = useRef<HTMLElement | null>(null)
  const resizeStart = useRef<{ clientX: number; railWidth: number } | null>(null)

  function clampRailWidth(width: number): number {
    const surfaceWidth =
      resultsSurfaceRef.current?.getBoundingClientRect().width ?? 1280
    const availableMaximum = surfaceWidth > 0 ? surfaceWidth - 700 : 520
    const maximum = Math.max(300, Math.min(520, availableMaximum))
    return Math.min(Math.max(width, 300), maximum)
  }

  function handleResizeStart(event: ReactPointerEvent<HTMLDivElement>) {
    resizeStart.current = { clientX: event.clientX, railWidth: resultsRailWidth }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function handleResizeMove(event: ReactPointerEvent<HTMLDivElement>) {
    if (!resizeStart.current) return
    const delta = event.clientX - resizeStart.current.clientX
    setResultsRailWidth(clampRailWidth(resizeStart.current.railWidth - delta))
  }

  function handleResizeEnd(event: ReactPointerEvent<HTMLDivElement>) {
    resizeStart.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  function handleResizeKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return
    event.preventDefault()
    if (event.key === 'Home') setResultsRailWidth(300)
    else if (event.key === 'End') setResultsRailWidth(clampRailWidth(520))
    else {
      const direction = event.key === 'ArrowLeft' ? 24 : -24
      setResultsRailWidth((width) => clampRailWidth(width + direction))
    }
  }

  async function handleDownload() {
    if (!analysis) return
    setDownloadError('')
    try {
      const file = await exportAnalysisResults(analysis, analyzedAt)
      const url = URL.createObjectURL(file)
      const link = document.createElement('a')
      link.href = url
      link.download = 'jr-term-analysis.xlsx'
      document.body.append(link)
      link.click()
      link.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      setDownloadError(
        error instanceof Error
          ? error.message
          : 'Excelファイルを出力できませんでした。',
      )
    }
  }

  return (
    <main className={styles.uploadPage} data-testid="results-page">
      <GlobalHeader user={user} onLogout={onLogout} />

      <div className={styles.resultsWorkspace}>
        <section
          ref={resultsSurfaceRef}
          className={styles.resultsSurface}
          style={
            {
              '--results-rail-width': `${resultsRailWidth}px`,
            } as CSSProperties
          }
          aria-labelledby="results-title"
        >
          <div className={styles.resultsMain}>
            <h1 id="results-title">解析結果</h1>
            <p className={styles.resultsMeta}>
              {analysis
                ? analysis.files.length === 1
                  ? analysis.files[0].name
                  : `${analysis.files.length}件のトランスクリプト`
                : '解析結果なし'}
              {analyzedAt &&
                ` · ${new Intl.DateTimeFormat('ja-JP', {
                  dateStyle: 'short',
                  timeStyle: 'short',
                }).format(analyzedAt)}`}
            </p>

            <div className={styles.resultsCard}>
              <div className={styles.resultsCardHeader}>
                <div>
                  <h2>検出結果</h2>
                  <p>{resultCount}件の社内用語を検出</p>
                </div>
                <button
                  className={styles.downloadButton}
                  type="button"
                  onClick={() => void handleDownload()}
                  disabled={!analysis}
                >
                  Excelをダウンロード
                </button>
              </div>
              {resultCount > 0 ? (
                <div className={styles.resultsTableScroll}>
                  <table
                    className={`${styles.resultsTable} ${
                      showTranscriptColumn ? styles.multiFileResultsTable : ''
                    }`}
                  >
                    <thead>
                      <tr>
                        <th className={styles.resultsTermColumn} scope="col">
                          検出された社内用語
                        </th>
                        {showTranscriptColumn && (
                          <th className={styles.resultsTranscriptColumn} scope="col">
                            トランスクリプト名
                          </th>
                        )}
                        <th className={styles.resultsContextColumn} scope="col">
                          出現した発話
                        </th>
                        <th scope="col">意味の推測</th>
                      </tr>
                    </thead>
                    <tbody>
                      {analysis?.results.map((item, index) => (
                        <tr key={`${item.transcriptName}-${item.termId}-${index}`}>
                          <th className={styles.resultsTermColumn} scope="row">
                            {item.displayTerm}
                            {item.displayTerm !== item.canonicalTerm && (
                              <small>正式名称：{item.canonicalTerm}</small>
                            )}
                          </th>
                          {showTranscriptColumn && (
                            <td className={styles.resultsTranscriptColumn}>
                              {item.transcriptName}
                            </td>
                          )}
                          <td
                            className={`${styles.resultsContextColumn} ${styles.resultsContextSentence}`}
                          >
                            <HighlightedContext
                              text={item.contextSentence}
                              term={item.displayTerm}
                            />
                          </td>
                          <td>
                            <span>{item.classification ?? '—'}</span>
                            <small>{item.occurrenceCount}回検出</small>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className={styles.emptyResults}>
                  社内用語辞書に登録されている用語は検出されませんでした。
                </p>
              )}
              {downloadError && (
                <p className={styles.downloadError} role="alert">
                  {downloadError}
                </p>
              )}
            </div>

            <p className={styles.resultsNote}>
              社内用語辞書と発話の前後文脈をもとに、会議内での意味を推測しています。
            </p>
          </div>

          <div
            className={styles.resultsResizeHandle}
            role="separator"
            aria-label="結果テーブルとガイドの幅を調整"
            aria-orientation="vertical"
            aria-valuemin={300}
            aria-valuemax={520}
            aria-valuenow={Math.round(resultsRailWidth)}
            tabIndex={0}
            onDoubleClick={() => setResultsRailWidth(340)}
            onKeyDown={handleResizeKeyDown}
            onPointerDown={handleResizeStart}
            onPointerMove={handleResizeMove}
            onPointerUp={handleResizeEnd}
            onPointerCancel={handleResizeEnd}
          >
            <span aria-hidden="true" />
          </div>

          <span className={styles.resultsStatus}>
            <img src={resultsStatus} alt="" />
            完了
          </span>

          <aside className={styles.resultsRail} aria-labelledby="results-hints-title">
            <div className={styles.resultsContextHero}>
              <img src={mascotResultsHelper} alt="検出結果を案内するキャラクター" />
              <div>
                <h2 id="results-hints-title">検出結果の見方</h2>
                <p>辞書と発話の文脈をもとに表示しています。</p>
              </div>
            </div>
            <div className={styles.contextDivider} />
            <ol className={styles.resultsGuidance}>
              {resultsGuidance.map((guidance, index) => (
                <li key={guidance}>
                  <img src={resultsGuidanceBadge} alt="" />
                  <strong>{String(index + 1).padStart(2, '0')}</strong>
                  <span>{guidance}</span>
                </li>
              ))}
            </ol>
            <p className={styles.resultsRailNote}>解析結果はこの画面で確認できます。</p>
          </aside>
        </section>
      </div>
    </main>
  )
}

function App() {
  const [showOpeningSplash, setShowOpeningSplash] = useState(
    import.meta.env.MODE !== 'test',
  )
  const [route, setRoute] = useState(window.location.hash)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [authLoading, setAuthLoading] = useState(true)
  const [loginLoading, setLoginLoading] = useState(false)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])
  const [analysis, setAnalysis] = useState<AnalyzeTranscriptResponse | null>(null)
  const [analyzedAt, setAnalyzedAt] = useState<Date | null>(null)
  const [processingStage, setProcessingStage] = useState(0)
  const [processingError, setProcessingError] = useState('')
  const [dictionaryExamples, setDictionaryExamples] = useState<DictionaryExample[]>([])
  const analysisAbortController = useRef<AbortController | null>(null)
  const analysisRunId = useRef(0)
  const loginLoadingTimer = useRef<number | null>(null)

  useEffect(() => {
    const handleHashChange = () => setRoute(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  useEffect(() => {
    if (!showOpeningSplash) return
    const timer = window.setTimeout(
      () => setShowOpeningSplash(false),
      OPENING_SPLASH_DURATION_MS,
    )
    return () => window.clearTimeout(timer)
  }, [showOpeningSplash])

  useEffect(
    () => () => {
      if (loginLoadingTimer.current !== null) {
        window.clearTimeout(loginLoadingTimer.current)
      }
    },
    [],
  )

  useEffect(() => {
    getDictionaryExamples()
      .then(setDictionaryExamples)
      .catch(() => setDictionaryExamples([]))
    getSession()
      .then((sessionUser) => {
        setUser(sessionUser)
        if (
          !sessionUser &&
          ['#upload', '#processing', '#results'].includes(window.location.hash)
        ) {
          window.location.hash = '#login'
        }
      })
      .finally(() => setAuthLoading(false))
  }, [])

  function handleLogin(userAccount: AuthUser) {
    setUser(userAccount)
    setLoginLoading(true)
    const loadingDuration =
      import.meta.env.MODE === 'test' ? 50 : LOGIN_LOADING_DURATION_MS
    loginLoadingTimer.current = window.setTimeout(() => {
      setLoginLoading(false)
      loginLoadingTimer.current = null
      window.location.hash = '#upload'
    }, loadingDuration)
  }

  async function handleLogout() {
    analysisRunId.current += 1
    analysisAbortController.current?.abort()
    analysisAbortController.current = null
    if (loginLoadingTimer.current !== null) {
      window.clearTimeout(loginLoadingTimer.current)
      loginLoadingTimer.current = null
    }
    setLoginLoading(false)
    await logout().catch(() => undefined)
    setUser(null)
    setSelectedFiles([])
    setAnalysis(null)
    window.location.hash = '#login'
  }

  async function runAnalysis() {
    if (selectedFiles.length === 0) return
    analysisAbortController.current?.abort()
    const controller = new AbortController()
    analysisAbortController.current = controller
    const currentRunId = analysisRunId.current + 1
    analysisRunId.current = currentRunId
    setProcessingError('')
    setProcessingStage(0)
    window.location.hash = '#processing'
    const stageDuration =
      import.meta.env.MODE === 'test' ? 10 : PROCESSING_STAGE_DURATION_MS
    const stageTimers = processingSteps.slice(1).map((_, index) =>
      window.setTimeout(
        () => {
          if (analysisRunId.current === currentRunId) setProcessingStage(index + 1)
        },
        stageDuration * (index + 1),
      ),
    )
    let minimumDurationTimer = 0
    const minimumDuration = new Promise<void>((resolve) => {
      minimumDurationTimer = window.setTimeout(
        resolve,
        stageDuration * processingSteps.length,
      )
    })

    try {
      const [result] = await Promise.all([
        analyzeTranscript(selectedFiles, controller.signal),
        minimumDuration,
      ])
      if (analysisRunId.current !== currentRunId) return
      setAnalysis(result)
      setAnalyzedAt(new Date())
      window.location.hash = '#results'
    } catch (analysisError) {
      if (controller.signal.aborted || analysisRunId.current !== currentRunId) return
      setProcessingStage(2)
      setProcessingError(
        analysisError instanceof ApiClientError
          ? analysisError.message
          : '解析中にエラーが発生しました。',
      )
    } finally {
      stageTimers.forEach((timer) => window.clearTimeout(timer))
      window.clearTimeout(minimumDurationTimer)
      if (analysisAbortController.current === controller) {
        analysisAbortController.current = null
      }
    }
  }

  let currentPage: ReactNode

  if (loginLoading) {
    currentPage = <LoginLoadingPage />
  } else if (route === '#login') {
    currentPage = <LoginPage onLogin={handleLogin} />
  } else if (landingRoutes.includes(route)) {
    currentPage = <LandingPage examples={dictionaryExamples} />
  } else if (authLoading) {
    currentPage = (
      <main className={styles.sessionLoading} aria-live="polite">
        アカウントを確認しています…
      </main>
    )
  } else if (!user) {
    currentPage = <LoginPage onLogin={handleLogin} />
  } else if (route === '#upload') {
    currentPage = (
      <UploadPage
        selectedFiles={selectedFiles}
        onFilesChange={setSelectedFiles}
        onAnalyze={runAnalysis}
        user={user}
        onLogout={handleLogout}
      />
    )
  } else if (route === '#processing') {
    currentPage = (
      <ProcessingPage
        files={selectedFiles}
        stage={processingStage}
        error={processingError}
        onCancel={() => {
          analysisRunId.current += 1
          analysisAbortController.current?.abort()
          analysisAbortController.current = null
          setProcessingError('')
          window.location.hash = '#upload'
        }}
        onRetry={runAnalysis}
        user={user}
        onLogout={handleLogout}
      />
    )
  } else if (route === '#results') {
    currentPage = (
      <ResultsPage
        analysis={analysis}
        analyzedAt={analyzedAt}
        user={user}
        onLogout={handleLogout}
      />
    )
  } else {
    currentPage = <LandingPage examples={dictionaryExamples} />
  }

  return (
    <>
      {currentPage}
      {showOpeningSplash && <OpeningSplash />}
    </>
  )
}

export default App
