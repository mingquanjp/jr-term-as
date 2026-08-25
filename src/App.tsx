import styles from './App.module.css'

const workflow = [
  {
    number: '01',
    title: 'アップロード',
    description: '会議トランスクリプトを選択します。',
  },
  {
    number: '02',
    title: '検出',
    description: '登録済みの社内用語・略称を照合します。',
  },
  {
    number: '03',
    title: '意味を確認',
    description: '正式名称と意味を一覧で確認できます。',
  },
]

function App() {
  return (
    <div className={styles.app} data-testid="app-shell">
      <header className={styles.header}>
        <a className={styles.brand} href="/" aria-label="JR Term Assistant ホーム">
          <span className={styles.brandMark} aria-hidden="true">
            JR
          </span>
          <span>
            <span className={styles.brandName}>JR Term Assistant</span>
            <span className={styles.brandCaption}>Prototype</span>
          </span>
        </a>
        <span className={styles.headerNote}>社内用語検出プロトタイプ</span>
      </header>

      <main>
        <section className={styles.hero} aria-labelledby="hero-title">
          <div className={styles.heroCopy}>
            <p className={styles.eyebrow}>JR WEST · TRANSCRIPT SUPPORT</p>
            <h1 id="hero-title">社内用語を見つけ、意味を確認する。</h1>
            <p className={styles.heroDescription}>
              会議トランスクリプトに含まれるJR西日本の社内用語や略称を検出し、
              正式名称と意味を表示します。
            </p>
            <a className={styles.primaryAction} href="#prototype">
              デモを始める
              <span aria-hidden="true">→</span>
            </a>
          </div>

          <div className={styles.heroPanel} aria-label="検出結果の例">
            <div className={styles.panelHeader}>
              <span>検出結果</span>
              <span className={styles.panelStatus}>登録済み辞書を使用</span>
            </div>
            <div className={styles.resultRow}>
              <span>イノ本</span>
              <span>イノベーション本部</span>
            </div>
            <div className={styles.resultRow}>
              <span>シスマネ</span>
              <span>システムマネジメント部</span>
            </div>
            <div className={styles.resultRow}>
              <span>ライトブルー</span>
              <span>Lightblue</span>
            </div>
          </div>
        </section>

        <section
          className={styles.workflowSection}
          id="prototype"
          aria-labelledby="workflow-title"
        >
          <div className={styles.sectionHeading}>
            <p className={styles.eyebrow}>HOW IT WORKS</p>
            <h2 id="workflow-title">3つのステップで確認できます。</h2>
          </div>
          <div className={styles.workflowGrid}>
            {workflow.map((step) => (
              <article className={styles.workflowCard} key={step.number}>
                <span className={styles.stepNumber}>{step.number}</span>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </article>
            ))}
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>JR Term Assistant</span>
        <span>検出と意味表示に特化したプロトタイプ</span>
      </footer>
    </div>
  )
}

export default App
