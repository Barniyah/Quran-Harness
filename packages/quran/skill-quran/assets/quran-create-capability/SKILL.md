---
name: quran-create-capability
description: إنشاء قدرة قرآنية جديدة وربطها تلقائيًا بطبقة الحوكمة · Scaffold a new evidence-governed Quran capability (tool or skill) and automatically wire it into EvidenceEnvelope, GovernanceCard, and the Quran Harness preset.
---

# إنشاء قدرة قرآنية جديدة وربطها بطبقة الحوكمة · Create & Wire an Evidence-Governed Quran Capability

Use this skill whenever the user asks in conversation to create a new Quranic capability (tool plugin) or a new Quranic skill, and ensure it is **automatically bound to the 3-layer Governance Pipeline**:
1. **Cryptographic Evidence Envelope (`@deepseek-ai/dsh-quran-evidence`)**: `createEnvelope` (SHA-256 `contentHash` + `SourceDescriptor` trust level `L1-official` / `L2-verified-open` / `L3-community`) + `appendAuditLog`.
2. **Browser UI Governance Card (`@deepseek-ai/dsh-client-ui-quran-governance`)**: Register the tool name in `packages/quran/client-governance-card/src/client/index.ts` alongside `presentationMeta` so the Web UI renders the Islamic provenance badge automatically.
3. **Preset Composition (`@deepseek-ai/dsh-quran-bundle`)**: Register the plugin in `packages/quran/quran-bundle/cordis.patch.yml` using a portable `baseUrl`-relative URL.

---

## 1. Automated One-Command Scaffolding & Governance Wiring (الطريقة الآلية السريعة)

Run the repository's built-in capability generator script to scaffold the package AND wire it into `GovernanceCard` and `cordis.patch.yml` automatically:

```bash
node scripts/create-quran-capability.mjs \
  --pkg tool-quran-<slug> \
  --tool quran_<tool_name> \
  --source-id <source-id> \
  --source-name "<Human Readable Source Name>" \
  --source-url "https://example.org" \
  --trust L2-verified-open \
  --description "Brief description of the capability"
```

After running the generator:
1. Implement the domain logic inside `packages/quran/tool-quran-<slug>/src/index.ts`.
2. Build the host & client bundles and run tests:
   ```bash
   pnpm --filter @deepseek-ai/dsh-tool-quran-<slug> exec tsc -b
   pnpm --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle
   pnpm exec vitest run packages/quran/tool-quran-<slug>
   ```

---

## 2. Manual Step-by-Step Governance Contract (العقد الهندسي التفصيلي للحوكمة)

If creating or customizing a capability manually, every Quran tool plugin **MUST** enforce all four governance gates:

### Gate A — Coordinate & Input Verification (`@deepseek-ai/dsh-quran-data`)
Never accept unvalidated Surah/Ayah numbers or LLM-supplied Quranic text. Always verify coordinates against the pinned Tanzil Uthmani artifact first:

```typescript
import { getVerse } from '@deepseek-ai/dsh-quran-data'

const row = await getVerse(surah, ayah)
if (row === undefined) {
  throw new Error(`verse ${surah}:${ayah} not found (Hafs numbering, 6236 verses)`)
}
```

### Gate B — Cryptographic Evidence Envelope & Audit Log (`@deepseek-ai/dsh-quran-evidence`)
Wrap every response in `createEnvelope(payload, SOURCE_DESCRIPTOR, transforms)` and append to the tamper-evident JSONL audit log (`appendAuditLog`). If the tool returns Quranic verse text directly, you **MUST** also call `crossVerify(primaryEnvelope, secondaryEnvelope)` and withhold the verse if `verification.match !== true`.

```typescript
import type { SourceDescriptor } from '@deepseek-ai/dsh-quran-evidence'
import { appendAuditLog, createEnvelope } from '@deepseek-ai/dsh-quran-evidence'

const SOURCE: SourceDescriptor = {
  id: 'my-verified-source',
  name: 'Verified Scholarly Dataset',
  url: 'https://tanzil.net',
  trust: 'L2-verified-open', // 'L1-official' | 'L2-verified-open' | 'L3-community'
}

const evidence = createEnvelope(payload, SOURCE)
await appendAuditLog(auditLogPath, {
  at: new Date().toISOString(),
  operation: 'quran_my_tool',
  envelopes: [{ source: evidence.source.id, contentHash: evidence.contentHash }],
})
```

### Gate C — Mandatory `presentationMeta` & Browser `GovernanceCard` Registration
1. Include `presentationMeta` in `defineTool({ output: { ... } })`:
   ```typescript
   presentationMeta: (_args, value) => ({
     reference: value.reference,
     status: 'ok',
     source: SOURCE.id,
     contentHash: (value.evidence as { contentHash?: string })?.contentHash,
     retrievedAt: (value.evidence as { retrievedAt?: string })?.retrievedAt,
     verdict: `VERIFIED (${SOURCE.trust})`,
   }),
   ```
2. Add `'quran_my_tool'` to the registered tool keys in `packages/quran/client-governance-card/src/client/index.ts` and rebuild the client bundle (`pnpm --filter @deepseek-ai/dsh-client-ui-quran-governance run bundle`).

### Gate D — Portable Registration in `packages/quran/quran-bundle/cordis.patch.yml`
Never use hardcoded machine paths (`D:/...`). Always register the plugin inside `preset-quran.config.plugins` using `baseUrl`:

```yaml
          - id: tool-quran-<slug>
            name: '../tool-quran-<slug>/lib/index.js'
```

---

## 3. Creating a New Bundled Skill (`@deepseek-ai/dsh-skill-quran`)

When the user asks to create a new reusable **Skill** (rather than a tool):
1. Create `packages/quran/skill-quran/assets/quran-<skill-slug>/SKILL.md` with YAML frontmatter (`name` and `description`) and explicit instructions that enforce calling the verified `quran_*` tools.
2. Add `'quran-<skill-slug>'` to `QURAN_SKILL_NAMES` in `packages/quran/skill-quran/src/index.ts`.
3. Rebuild `@deepseek-ai/dsh-skill-quran` (`pnpm --filter @deepseek-ai/dsh-skill-quran exec tsc -b`) and run `pnpm exec vitest run packages/quran/skill-quran`.
