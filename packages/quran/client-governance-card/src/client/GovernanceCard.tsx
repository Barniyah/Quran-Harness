import { IconShieldOutlineRegular, TextShimmer } from '@deepseek-ai/dsh-client-ui-primitives'
import type { StartedToolCallViewProps, ToolCallViewProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import css from './GovernanceCard.module.css'

/** The governance card is bilingual by design: Arabic primary, English secondary. */
const STRINGS = {
  title: 'بطاقة الحوكمة · Governance Card',
  running: 'جارٍ الجلب والتحقق… · Fetching and verifying…',
  preparing: 'يُجهَّز جلب الآية · Preparing to fetch a verse',
  reference: 'المرجع · Reference',
  source: 'المصدر · Source',
  hash: 'بصمة SHA-256 · Digest',
  fetched: 'وقت الجلب · Fetched at',
  verified: 'المصدران متطابقان · Sources agree',
  mismatch: 'المصدران مختلفان — النص محجوب · Sources disagree — withheld',
  unsettled: 'الاستدعاء فشل أو أُوقف · Call failed or stopped',
} as const

/** Card lifecycle derived solely from the durable call slice. */
type CardState = 'running' | 'ok' | 'mismatch' | 'error'

/** Replayable governance metadata projected host-side by the Quran tools. */
interface GovernanceMeta {
  readonly reference?: string
  readonly surah?: number
  readonly status?: string
  readonly source?: string
  readonly contentHash?: string
  readonly retrievedAt?: string
  readonly verdict?: string
}

/** Narrow opaque result metadata to the governance shape; null when malformed. */
function governanceMeta(meta: unknown): GovernanceMeta | null {
  if (typeof meta !== 'object' || meta === null || Array.isArray(meta)) return null
  const m = meta as Record<string, unknown>
  return {
    ...typeof m.reference === 'string' ? { reference: m.reference } : {},
    ...typeof m.surah === 'number' ? { surah: m.surah } : {},
    ...typeof m.status === 'string' ? { status: m.status } : {},
    ...typeof m.source === 'string' ? { source: m.source } : {},
    ...typeof m.contentHash === 'string' ? { contentHash: m.contentHash } : {},
    ...typeof m.retrievedAt === 'string' ? { retrievedAt: m.retrievedAt } : {},
    ...typeof m.verdict === 'string' ? { verdict: m.verdict } : {},
  }
}

/** Derive display state from the durable block only — no live subscriptions. */
function cardState(block: StartedToolCallViewProps['block']): { state: CardState; meta: GovernanceMeta | null } {
  if (!('kind' in block)) return { state: 'running', meta: null }
  if (block.error !== undefined) return { state: 'error', meta: governanceMeta(block.meta) }
  const meta = governanceMeta(block.meta)
  return { state: meta?.status === 'mismatch' ? 'mismatch' : 'ok', meta }
}

/**
 * Render a Quran tool call as the mandatory governance card: source, content
 * digest, retrieval time and the cross-verification verdict.
 * @param props - keyed toolview payload.
 * @returns the governance card.
 */
export function GovernanceCard(props: ToolCallViewProps) {
  if (props.phase === 'preparing') return <div className={css.card} data-tool="quran-governance" data-state="preparing">
    <div className={css.row}>
      <span className={css.leading}><IconShieldOutlineRegular size={14} /></span>
      <span className={css.visuallyHidden}>{STRINGS.preparing}</span>
      <TextShimmer active className={css.title}>{STRINGS.title}</TextShimmer>
    </div>
  </div>
  return <StartedGovernanceCard {...props} />
}

function StartedGovernanceCard({ block }: Exclude<ToolCallViewProps, { phase: 'preparing' }>) {
  const { state, meta } = cardState(block)
  const running = state === 'running'
  const badge = state === 'ok' ? STRINGS.verified
    : state === 'mismatch' ? STRINGS.mismatch
      : state === 'error' ? STRINGS.unsettled
        : null
  return (
    <div className={css.card} data-tool="quran-governance" data-state={state}>
      <div className={css.row}>
        <span className={css.leading}><IconShieldOutlineRegular size={14} /></span>
        {running ? <span className={css.visuallyHidden}>{STRINGS.running}</span> : null}
        <TextShimmer active={running} className={css.title}><span dir="auto">{STRINGS.title}</span></TextShimmer>
        {badge !== null ? <span className={css.badge} dir="auto">{badge}</span> : null}
      </div>
      {meta !== null ? (
        <div className={css.grid}>
          {meta.reference !== undefined ? (<>
            <span className={css.label}>{STRINGS.reference}</span>
            <span className={css.value} dir="ltr">{meta.reference}</span>
          </>) : null}
          {meta.source !== undefined ? (<>
            <span className={css.label}>{STRINGS.source}</span>
            <span className={css.value} dir="ltr">{meta.source}</span>
          </>) : null}
          {meta.contentHash !== undefined ? (<>
            <span className={css.label}>{STRINGS.hash}</span>
            <span className={css.value} dir="ltr">{meta.contentHash.slice(0, 24)}…</span>
          </>) : null}
          {meta.retrievedAt !== undefined ? (<>
            <span className={css.label}>{STRINGS.fetched}</span>
            <span className={css.value} dir="ltr">{meta.retrievedAt}</span>
          </>) : null}
        </div>
      ) : null}
      {meta?.verdict !== undefined ? <div className={css.verdict} dir="auto">{meta.verdict}</div> : null}
    </div>
  )
}
