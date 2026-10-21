# 🕌 دليل مطوّر الإضافات والتطبيقات القرآنية — Quran Harness Developer Guide

> **الإصدار:** `v0.1.0`
> **الفرع المعتمد:** `quran-harness-agy` (`d:\Projects\DeepSeek_Quran_Harness\antigravity\deepseek-harness`)
> **الزخرفة الرسمية:** `۞  ━━━━━━━  ۞  ━━━━━━━  ۞  QURAN HARNESS  ۞  ━━━━━━━  ۞  ━━━━━━━  ۞`

---

## 1. المبادئ الهندسية الصارمة (The Golden Rules)

1. **العزل التام عن نواة DSH (Zero Core Modification):**
   جميع الإضافات القرآنية تعيش حصريًا داخل `packages/quran/*` وتُربط عبر `packages/quran/quran-bundle/cordis.patch.yml`. لا يُعدَّل أي ملف في `packages/core` أو `packages/client`.
2. **لا نص قرآني من ذاكرة النموذج اللغوي (Zero LLM Memory Policy):**
   كل نص قرآني يجب أن يمر عبر أداة رسمية موقّعة بـ `EvidenceEnvelope` مع بصمة `SHA-256` ومستوى ثقة (`L1` / `L2` / `L3`).
3. **التحقق المتقاطع الإلزامي (Mandatory Dual-Source Cross-Verification):**
   استرجاع الآيات (`quran_get_verse`) يقارن أصل Tanzil المثبّت (`L1`) مع واجهة `Quran.com API v4` (`L2`)، ويحجب العرض فورًا إذا ظهر أي اختلاف حرفي بعد التطبيع القياسي.
4. **بطاقة الحوكمة الإلزامية في الواجهة (`GovernanceCard`):**
   كل أداة قرآنية تُرجع كائن `meta` يتضمن (`reference`, `status`, `source`, `contentHash`, `retrievedAt`, `verdict`) لتعرضه واجهة المتصفح تلقائيًا.

---

## 2. كيفية بناء إضافة أداة قرآنية جديدة (How to Build a Quran Tool Plugin)

### الخطوة 1: هيكل المجلد
أنشئ مجلدًا جديدًا في `packages/quran/tool-quran-example/`:
```text
packages/quran/tool-quran-example/
├── package.json
├── tsconfig.json
├── src/
│   └── index.ts
└── tests/
    └── example.spec.ts
```

### الخطوة 2: كتابة الأداة في `src/index.ts` مع مظروف الأدلة (`EvidenceEnvelope`)
```typescript
import type { Context } from '@deepseek-ai/cordis'
import z from '@deepseek-ai/schemastery'
import { defineTool } from '@deepseek-ai/dsh-core-tools'
import {
  appendAuditLog,
  buildEvidenceEnvelope,
  type EvidenceEnvelope,
} from '@deepseek-ai/dsh-quran-evidence-core'

export const QuranExampleInput = z.object({
  surah: z.number().min(1).max(114).description('Surah number (1..114)'),
  ayah: z.number().min(1).max(286).description('Ayah number'),
})

export function createQuranExampleTool(auditLogPath = 'evidence-audit.jsonl') {
  return defineTool({
    name: 'quran_example_tool',
    description: 'Description of the verified Quranic capability.',
    parameters: QuranExampleInput,
    async execute({ surah, ayah }) {
      const payload = { surah, ayah, result: '...' }
      const envelope: EvidenceEnvelope<typeof payload> = buildEvidenceEnvelope({
        data: payload,
        sourceId: 'tanzil-uthmani',
        sourceUrl: 'https://tanzil.net',
        trustLevel: 'L1',
        license: 'CC-BY-3.0',
        verificationStatus: 'VERIFIED',
      })
      appendAuditLog(auditLogPath, envelope)

      return {
        content: JSON.stringify(envelope, null, 2),
        meta: {
          reference: `${surah}:${ayah}`,
          surah,
          status: 'ok',
          source: `${envelope.source} (${envelope.trust_level})`,
          contentHash: envelope.content_hash,
          retrievedAt: envelope.retrieved_at,
          verdict: `VERIFIED — ${envelope.evidence_id}`,
        },
      }
    },
  })
}

export const name = 'tool-quran-example'
export const inject = ['tools']

export function apply(ctx: Context): void {
  ctx.tools.register(createQuranExampleTool())
}
```

### الخطوة 3: تسجيل الأداة في `GovernanceCard` و `cordis.patch.yml`
1. أضف اسم الأداة `quran_example_tool` إلى قائمة الأدوات في `packages/quran/client-governance-card/src/client/index.ts`.
2. أضف الحزمة `@deepseek-ai/dsh-tool-quran-example: {}` إلى `packages/quran/quran-bundle/cordis.patch.yml`.

---

## 3. كيفية بناء إضافة واجهة رسومية للمتصفح (Browser UI Plugin Contract)

> **[!IMPORTANT] قاعدة Cordis الحاسمة في المتصفح:**
> لا يكفي وضع `dsh.client.inject` في `package.json`؛ يجب تصدير `export const inject = [...]` برمجيًا داخل `src/client/index.ts` بأسماء خدمات Cordis (`'theme'`, `'slots'`, `'locale'`) حتى ينتظر المتصفح جهوزية تلك الخدمات قبل استدعاء `apply(ctx)`.

```typescript
import type { Context as ClientContext } from '@deepseek-ai/cordis'
import type {} from '@deepseek-ai/dsh-client-ui-renderer/client'
import type {} from '@deepseek-ai/dsh-client-ui-theme/client'
import type {} from '@deepseek-ai/dsh-client-locale/client'

export const inject = ['theme', 'slots', 'locale']

export function apply(ctx: ClientContext): void {
  // تسجيل ثيم أو منفذ (Slot) أو لغة
}
```

---

## 4. أمثلة تطبيقات متكاملة باستخدام `@deepseek-ai/dsh-quran-sdk`

### المثال الأول: تطبيق المصحف الإلكتروني الموثّق (Verified Mushaf Page Reader)
يبني صفحة مصحف كاملة (تخطيط الصفحة + النص العثماني المتقاطع + صورة الصفحة من مجمع الملك فهد + الخطوط الرسمية):

```typescript
import { createQuranSDK } from '@deepseek-ai/dsh-quran-sdk'

async function renderVerifiedMushafPage(pageNumber: number) {
  const quran = createQuranSDK()

  // 1. جلب تخطيط الصفحة الموثق (نطاق السور والآيات في الصفحة)
  const layoutEnv = quran.getPageLayout(pageNumber)
  if (!quran.verifyEnvelopeIntegrity(layoutEnv)) {
    throw new Error('فشل التحقق من سلامة مظروف تخطيط الصفحة!')
  }

  const { first, last } = layoutEnv.data
  console.log(`📖 الصفحة ${pageNumber} — من ${first.surah}:${first.ayah} إلى ${last.surah}:${last.ayah}`)

  // 2. جلب الآية الأولى بتحقق متقاطع حي (Tanzil L1 × Quran.com L2)
  const verseEnv = await quran.getVerse(first.surah, first.ayah)
  console.log(`✅ النص العثماني المحقق: ${verseEnv.data.text}`)
  console.log(`🔒 بصمة الدليل: ${verseEnv.content_hash}`)

  // 3. جلب بيانات السورة والجزء والحزب
  const metaEnv = quran.getMetadata(first.surah, first.ayah)
  console.log(`📌 السورة: ${metaEnv.data.surahNameArabic} | الجزء: ${metaEnv.data.juz} | الحزب: ${metaEnv.data.hizb}`)
}
```

---

### المثال الثاني: تطبيق المقرئ الرقمي ومحلل التجويد والتزمين (Recitation & Tajweed Coach)
يجلب التزمين الدقيق لآية معينة لتظليلها أثناء التلاوة مع التحليل الصرفي والموضوعي:

```typescript
import { createQuranSDK } from '@deepseek-ai/dsh-quran-sdk'

async function buildRecitationLesson(surah: number, ayah: number) {
  const quran = createQuranSDK()

  // 1. النص العثماني المحقق
  const verse = await quran.getVerse(surah, ayah)

  // 2. التزمين الصوتي بالميلي ثانية (تلاوة الشيخ محمود خليل الحصري L1)
  const timing = quran.getAyahTiming(surah, ayah)

  // 3. التحليل الصرفي والنحوي للكلمات (Morphology)
  const morphology = quran.getAyahMorphology(surah, ayah)

  return {
    uthmaniText: verse.data.text,
    evidenceId: verse.evidence_id,
    audioWindowMs: {
      startMs: timing.data.startMs,
      endMs: timing.data.endMs,
      durationMs: timing.data.durationMs,
    },
    words: morphology.data.words,
  }
}
```

---

### المثال الثالث: أداة البحث المقارن في القراءات والعلوم القرآنية (Comparative Riwayat & Sciences CLI)
تقارن بين رواية حفص عن عاصم ورواية ورش عن نافع في الترقيم والبيانات الهيكلية مع البحث الموضوعي:

```typescript
import { createQuranSDK } from '@deepseek-ai/dsh-quran-sdk'

function compareHafsAndWarsh(surah: number, hafsAyah: number) {
  const quran = createQuranSDK()

  // 1. تحويل رقم الآية من حفص إلى ورش
  const conversion = quran.convertAyah(surah, hafsAyah, 'Hafs', 'Warsh')

  // 2. مقارنة شاملة بين الروايتين
  const comparison = quran.compareRiwayat(surah, hafsAyah, ['Hafs', 'Warsh', 'Qalun'])

  // 3. البحث الموضوعي في كتالوج علوم القرآن (Quranpedia L2)
  const topics = quran.searchTopics('التوحيد', 5)

  return {
    hafsToWarsh: conversion.data,
    multiRiwayatComparison: comparison.data,
    relatedTopics: topics.data.results,
  }
}
```
