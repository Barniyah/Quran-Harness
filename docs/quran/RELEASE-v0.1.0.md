# 🕌 بيان الإصدار `v0.1.0` — Quran Harness

```text
۞  ━━━━━━━  ۞  ━━━━━━━  ۞  QURAN HARNESS  ۞  ━━━━━━━  ۞  ━━━━━━━  ۞
───⊱✿⊰─── ۞ ───⊱✿⊰─── ۞ ───⊱✿⊰─── ۞ ───⊱✿⊰─── ۞ ───⊱✿⊰─── ۞ ───⊱✿⊰───
```

- **رقم الإصدار:** `v0.1.0`
- **تاريخ الإصدار:** `2026-10-21`
- **نواة DSH المرجعية المثبتة:** `dsh-v0.2.1-alpha.4` (`86a402200d95fecef4529d969836f1fe13c6cb0d`)
- **فرع الإطلاق المعزول:** `quran-harness-agy` (`d:\Projects\DeepSeek_Quran_Harness\antigravity\deepseek-harness`)
- **التعديلات على نواة DSH الأصلية:** **0 ملفات** (عزل كامل 100% كإضافات قياسية)

---

## 1. ملخص القدرات والحزم المنجزة (22 حزمة في `packages/quran/*`)

| الفئة | الحزمة | الوظيفة | الاختبارات |
|---|---|---|---|
| **نواة الحوكمة** | `@deepseek-ai/dsh-quran-evidence-core` | مظروف الأدلة `EvidenceEnvelope` + بصمات `SHA-256` + مصفوفة الثقة (`L1`/`L2`/`L3`) + سجل التدقيق `append-only` | ✅ |
| **النص والبيانات** | `@deepseek-ai/dsh-tool-quran-text` | `quran_get_verse` بتحقق متقاطع إلزامي حي (Tanzil L1 × Quran.com L2) | ✅ |
| **الفهرسة الوصفية** | `@deepseek-ai/dsh-tool-quran-metadata` | `quran_get_metadata` (بيانات 114 سورة، 6236 آية، 30 جزءًا، 60 حزبًا، 604 صفحات) | ✅ |
| **البحث الهيكلي** | `@deepseek-ai/dsh-tool-quran-search` | `quran_search` (بحث هيكلي مطابق للإملاء الحديث مع إرجاع الرسم العثماني) | ✅ |
| **القراءات والروايات** | `@deepseek-ai/dsh-tool-quran-riwayat` | `quran_compare_riwayat` + `quran_convert_ayah` بين 8 روايات معتمدة | ✅ |
| **الصوتيات والتلاوة** | `@deepseek-ai/dsh-tool-quran-audio` | `quran_get_audio` لـ5 قرّاء معتمدين من EveryAyah مع فحص `HEAD` حي | ✅ |
| **التزمين الصوتي** | `@deepseek-ai/dsh-tool-quran-timing` | `quran_get_ayah_timing` بالميلي ثانية لتلاوة الشيخ محمود خليل الحصري (`L1`) | ✅ |
| **صور المصحف** | `@deepseek-ai/dsh-tool-mushaf-images` | `quran_get_page_image` (604 صفحات KFGQPC) + `quran_get_ayah_image` | ✅ |
| **تخطيط الصفحات** | `@deepseek-ai/dsh-tool-mushaf-layout` | `quran_get_page_layout` لـ604 صفحات مصحف المدينة (تغطية 6236 آية) | ✅ |
| **خطوط المصحف** | `@deepseek-ai/dsh-tool-quran-fonts` | `quran_get_fonts` (خطوط مجمع الملك فهد KFGQPC الرسمية) | ✅ |
| **محرك التجويد** | `@deepseek-ai/dsh-tool-tajweed` | `quran_analyze_tajweed` (تحليل خوارزمي حتمي حرفًا بحرف عبر `quran-tajweed`) | ✅ |
| **النطق الصوتي** | `@deepseek-ai/dsh-tool-quran-phonetic` | `quran_phonetize` (تحويل إلى IPA + مخارج الحروف وصفاتها) | ✅ |
| **الصرف والإعراب** | `@deepseek-ai/dsh-tool-quran-linguistics` | `quran_get_ayah_morphology` (128,219 مقطعًا صرفيًا من QUL/Corpus) | ✅ |
| **التفاسير المعتمدة** | `@deepseek-ai/dsh-tool-quran-tafsir` | `quran_get_tafsir` (ابن كثير، الطبري، القرطبي، السعدي، الميسر) | ✅ |
| **الترجمات المعتمدة** | `@deepseek-ai/dsh-tool-quran-translations` | `quran_get_translation` مع نسبة إلزامية للمترجم وتنبيه أنها ليست قرآنًا | ✅ |
| **علوم القرآن** | `@deepseek-ai/dsh-tool-quran-sciences` | `quran_search_topics` (6100 موضوع قرآني مصنف من Quranpedia) | ✅ |
| **المهارات القرآنية** | `@deepseek-ai/dsh-skill-quran` | 5 مهارات افتراضية (`quran-mushaf-app`, `quran-recitation-feature`, `quran-verified-research`, `quran-compare-riwayat`, `quran-create-capability`) + مولد القدرات الآلي `scripts/create-quran-capability.mjs` | ✅ |
| **SDK المطورين** | `@deepseek-ai/dsh-quran-sdk` | واجهة TypeScript موحدة لبناء التطبيقات القرآنية الموثّقة | ✅ |
| **بطاقة الحوكمة** | `@deepseek-ai/dsh-client-ui-quran-governance` | عرض بصري إلزامي للمصدر والبصمة وحكم التطابق لكل أداة قرآنية | ✅ |
| **الثيم الإسلامي والعربية** | `@deepseek-ai/dsh-client-ui-quran-theme` | ثيما `mushaf` و `mushaf-dark` + خلفية نقوش إسلامية + شعار المصحف على الرحل + الزخارف النصية + اللغة العربية (`ar`) مع دعم RTL الكامل | ✅ |
| **النمط الافتراضي** | `@deepseek-ai/dsh-preset-quran` | شخصية وموجه حوكمة الوكيل القرآني الافتراضي (`quran`) | ✅ |
| **حزمة التجميع** | `@deepseek-ai/dsh-quran-bundle` | ربط كامل المنظومة + بوابات التحقق والانحدار (`phase5-release-verification`) | ✅ |

---

## 2. نتائج اختبارات التصليب والإطلاق (Phase 5 Verification Gates)

- **إجمالي ملفات الاختبار في `packages/quran`:** `21 ملف اختبار`
- **إجمالي الاختبارات الناجحة:** `93 / 93 اختبارًا أخضر`
- **بوابة عزل النواة (`Gate 1`):** `0` تعديلات على نواة DSH الأصلية (`git diff 86a4022..HEAD -- packages/core packages/client packages/preset apps` فارغ تمامًا).
- **بوابة Red-Team للحوكمة (`Gate 2`):**
  - رفض الإحداثيات المختلقة (`112:5`, `115:1`, `2:287`).
  - كشف التلاعب بحركة واحدة أو حقل واحد في مظروف الأدلة (`verifyEnvelopeIntegrity === false`).
  - حجب عرض النص القرآني فورًا عند تعارض المصدرين (`crossVerify.verified === false`).
- **بوابة اكتمال الحزم (`Gate 3`):** التحقق الآلي من بناء وتصدير جميع الحزم الـ22 وحزم الواجهة.

```text
───♦─── ۞ ───♦─── ۞ ───♦─── ۞ ───♦─── ۞ ───♦─── ۞ ───♦─── ۞ ───♦───
```
