// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { StartedToolCall, ToolResultNode } from '@deepseek-ai/dsh-client-ui-chat/client'
import type { ToolCallOwnerProps } from '@deepseek-ai/dsh-client-ui-tool/client'
import { PartialArguments } from '@deepseek-ai/dsh-util-values'
import { GovernanceCard } from '../src/client/GovernanceCard.tsx'

type CardProps = Parameters<typeof GovernanceCard>[0]

afterEach(cleanup)

const GOVERNANCE_META = {
  reference: '2:255',
  status: 'ok',
  source: 'tanzil-uthmani',
  contentHash: 'a1b2c3d4e5f6071829304050aabbccddeeff00112233445566778899aabbccdd',
  retrievedAt: '2026-10-17T05:00:00.000Z',
  verdict: 'MATCH: tanzil-uthmani and quran-com-v4-uthmani agree (hash a1b2c3d4e5f6…)',
}

function settled(meta: unknown, over: Partial<ToolResultNode> = {}): ToolResultNode {
  return {
    kind: 'tool-result',
    seq: 3,
    time: 3_000,
    callId: 'call-quran',
    name: 'quran_get_verse',
    args: PartialArguments.fromText('{"surah":2,"ayah":255}'),
    call: { name: 'quran_get_verse', argsRaw: '{"surah":2,"ayah":255}' },
    callTime: 2_000,
    content: [{ type: 'text', text: '2:255: …' }],
    isError: false,
    subCalls: [],
    ...typeof meta === 'object' && meta !== null ? { meta } : {},
    ...over,
  } as ToolResultNode
}

function running(): StartedToolCall {
  return {
    phase: 'start' as const, args: PartialArguments.fromText('{"surah":2,"ayah":255}'),
    callId: 'call-quran', name: 'quran_get_verse', argsRaw: '{"surah":2,"ayah":255}',
    turn: 1, step: 1, time: 2_000, subCalls: [],
  }
}

function props(block: CardProps['block']): CardProps {
  const owner: ToolCallOwnerProps = {
    callId: block.callId,
    toolName: 'quran_get_verse',
    ...('kind' in block ? { phase: 'result' as const, block }
      : block.phase === 'preparing' ? { phase: 'preparing' as const, block } : { phase: 'start' as const, block }),
    useDisclosure: () => ({ expanded: false, setExpanded: vi.fn(), toggle: vi.fn() }),
    loadImage: vi.fn<ToolCallOwnerProps['loadImage']>(),
    openFile: vi.fn(),
  }
  return owner as CardProps
}

describe('GovernanceCard', () => {
  it('renders the preparing placeholder without any governance fields', () => {
    const view = render(<GovernanceCard {...props({
      phase: 'preparing', args: PartialArguments.EMPTY, callId: 'call-quran', name: 'quran_get_verse', turn: 1, step: 1, time: 1, subCalls: [],
    })} />)
    expect(view.container.querySelector('[data-state="preparing"]')).not.toBeNull()
    expect(view.container.textContent).toContain('بطاقة الحوكمة')
    expect(view.container.textContent).not.toContain('SHA-256')
  })

  it('shows the running state while the tool executes', () => {
    const view = render(<GovernanceCard {...props(running())} />)
    expect(view.container.querySelector('[data-state="running"]')).not.toBeNull()
  })

  it('renders the full governance card on a verified result', () => {
    const view = render(<GovernanceCard {...props(settled(GOVERNANCE_META))} />)
    const card = view.container.querySelector('[data-state="ok"]')
    expect(card).not.toBeNull()
    const text = view.container.textContent ?? ''
    expect(text).toContain('المصدران متطابقان')
    expect(text).toContain('tanzil-uthmani')
    expect(text).toContain('a1b2c3d4e5f6071829304050…'.replace('…', '')) // hash prefix rendered
    expect(text).toContain('2:255')
    expect(text).toContain('MATCH')
  })

  it('renders the mismatch state when sources disagree', () => {
    const view = render(<GovernanceCard {...props(settled({ ...GOVERNANCE_META, status: 'mismatch', verdict: 'MISMATCH: … — do NOT present silently' }))} />)
    expect(view.container.querySelector('[data-state="mismatch"]')).not.toBeNull()
    expect(view.container.textContent).toContain('النص محجوب')
  })

  it('renders the unsettled state on an error result', () => {
    const view = render(<GovernanceCard {...props(settled(GOVERNANCE_META, { isError: true, error: { name: 'Error', code: 'network' } }))} />)
    expect(view.container.querySelector('[data-state="error"]')).not.toBeNull()
    expect(view.container.textContent).toContain('فشل')
  })

  it('falls back to a bare card when metadata is malformed', () => {
    const view = render(<GovernanceCard {...props(settled('garbage'))} />)
    expect(view.container.querySelector('[data-state="ok"]')).not.toBeNull()
    expect(view.container.textContent).not.toContain('a1b2c3d4')
  })
})
