---
name: quran-mushaf-app
description: بناء تطبيق مصحف موثق بالأدلة · Build an evidence-governed Mushaf reader application using @deepseek-ai/dsh-quran-sdk and verified Quran Harness tools.
---

# بناء تطبيق مصحف موثق بالأدلة · Evidence-Governed Mushaf Application

Use this skill when a developer asks to build a Quran reader, Mushaf page viewer, verse display component, or full-stack Quran application.

## 1. Iron Governance Rules (قواعد الحوكمة الصارمة)

1. **Zero Memory Recall**: Never embed hardcoded or LLM-recalled Quranic verses in application code or fixtures. Every verse must be fetched through `@deepseek-ai/dsh-quran-sdk` (`sdk.getVerse(surah, ayah)`) or the `quran_get_verse` tool.
2. **Mandatory Two-Source Cross-Verification**: Only render `result.text` when `result.status === 'ok'` and `result.verification.match === true` (Tanzil Uthmani × Quran.com API v4). If `result.status === 'mismatch'`, withhold the verse text and display an explicit governance alert.
3. **Always Render the Governance Card**: Every Quranic view must display the provenance envelope (`source.name`, `source.trust`, `contentHash` SHA-256 prefix, `retrievedAt`, and `verification.verdict`).
4. **Explicit Riwaya Attribution**: State clearly that the active riwaya is **Hafs 'an 'Asim (حفص عن عاصم)** unless another riwaya is explicitly selected via `quran-riwayat`.

## 2. Architecture & SDK Workflow

```typescript
import { createQuranSdk } from '@deepseek-ai/dsh-quran-sdk'

const sdk = createQuranSdk({
  auditLogPath: './evidence-audit.jsonl',
})

// 1. Structural Surah & Page Metadata
const { metadata, evidence: metaEnv } = await sdk.getMetadata(1, 1)
const { spans, evidence: pageEnv } = await sdk.getPageLayout(1)

// 2. Cross-Verified Verse Retrieval
const verse = await sdk.getVerse(1, 1)
if (verse.status !== 'ok') {
  throw new Error(`Governance Gate Blocked Display: ${verse.verification.verdict}`)
}
```

## 3. Typography & Visual Mushaf Guidelines

- **Uthmani Script Container**: Mark every Quran text element with `dir="rtl"` and `data-quran-text="true"` so the Islamic Mushaf theme applies the KFGQPC Uthmani Hafs / Amiri Quran font stack with generous line height (`2.1`).
- **Official Fonts & Page Images**:
  - Use `quran_get_fonts` to retrieve pinned King Fahd Complex (KFGQPC) TTF/OTF font URLs.
  - Use `quran_get_page_image` (604 Medina Mushaf pages) or `quran_get_ayah_image` for verified visual page rendering.
