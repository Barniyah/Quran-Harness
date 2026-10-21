# سجل متابعة وتطوير Quran Harness — مساحة عمل Antigravity

> **آخر تحديث:** 2026-10-21
> **المسار المعزول:** `d:\Projects\DeepSeek_Quran_Harness\antigravity`
> **فرع العمل المستقل (Git Worktree):** `quran-harness-agy` (الالتزام `88d902b5b7`) داخل `d:\Projects\DeepSeek_Quran_Harness\antigravity\deepseek-harness`

---

## 1. الحالة العامة للمشروع (عبر مراحل `PLAN.md`)

| المرحلة | الوصف | الحالة | التفاصيل |
|---|---|---|---|
| **0** | التأسيس: استنساخ، بناء، تشغيل، تحليل REA | ✅ مكتملة | تثبيت `dsh-v0.2.1-alpha.4` (`86a4022`) + تحليل REA (`ARCHITECTURE-MAP.md`) |
| **1** | نواة Evidence Governance + `quran-text` + `quran-metadata` | ✅ مكتملة | التحقق المتقاطع الإلزامي لـ 6236/6236 آية (Tanzil × Quran.com API v4) + الربط الحي |
| **2** | القدرات الأساسية (بحث، روايات، صوت، تزمين، مصحف، خطوط) | ✅ مكتملة | 7 حزم قدرات مبنية ومختبرة مع أصول مثبتة ببصمة `SHA-256` |
| **3** | القدرات الذكية والعلوم + جسر MCP + `quran-sdk` | ✅ مكتملة | تجويد، صرف، تفاسير، ترجمات، رسم صوتي، موضوعات، جسر MCP اختياري، وحزمة `@deepseek-ai/dsh-quran-sdk` (مع تأجيل `recitation-corrector` لحين توفر مفتاح سحابي) |
| **4** | Quran Preset + المهارات الافتراضية (`skill-quran`) + الثيم الإسلامي + بطاقة الحوكمة | ✅ مكتملة | Preset افتراضي + 4 مهارات مدمجة + ثيمان (`mushaf` / `mushaf-dark`) + بطاقة حوكمة لـ 15 أداة + إصلاح تفعيل الواجهة (`export const inject`) |
| **5** | التصليب والإطلاق v0.1 | 🟡 جاهزة للتجربة الحية | جاهزة للتجربة بمفتاح LLM عبر `run-quran-harness-agy.cmd` |

---

## 2. جرد الحزم المبنية والمختبرة في `packages/quran/` (19 حزمة)

| # | الحزمة | اسم الحزمة في npm | الأدوات / المخرجات المسجلة | الاختبارات |
|---|---|---|---|---|
| 1 | `evidence-core` | `@deepseek-ai/dsh-quran-evidence-core` | مظروف الحوكمة، بوابة التحقق المتقاطع، سجل التدقيق (`evidence-audit.jsonl`) | ✅ |
| 2 | `quran-data` | `@deepseek-ai/dsh-quran-data` | الأصول المثبتة ببصمات SHA-256 (العثماني، الإملائي، تزمين الحصري، صرف QAC، موضوعات Quranpedia) | ✅ |
| 3 | `tool-quran-text` | `@deepseek-ai/dsh-tool-quran-text` | `quran_get_verse` (تحقق متقاطع إلزامي Tanzil × Quran.com) | ✅ 4/4 |
| 4 | `tool-quran-metadata` | `@deepseek-ai/dsh-tool-quran-metadata` | `quran_get_metadata` (السور، الآيات، الأجزاء، الصفحات، السجدات) | ✅ |
| 5 | `tool-quran-search` | `@deepseek-ai/dsh-tool-quran-search` | `quran_search` (بحث هيكلي بدون تشكيل + بحث مطابق مع استرجاع عثماني) | ✅ 6/6 |
| 6 | `tool-quran-audio` | `@deepseek-ai/dsh-tool-quran-audio` | `quran_get_audio` (تلاوات EveryAyah مع فحص HEAD حي) | ✅ 3/3 |
| 7 | `tool-mushaf-images` | `@deepseek-ai/dsh-tool-mushaf-images` | `quran_get_page_image` + `quran_get_ayah_image` (مع فحص HEAD حي) | ✅ 4/4 |
| 8 | `tool-quran-timing` | `@deepseek-ai/dsh-tool-quran-timing` | `quran_get_ayah_timing` (توقيت الحصري بالمللي ثانية دون اتصال) | ✅ 6/6 |
| 9 | `tool-quran-riwayat` | `@deepseek-ai/dsh-tool-quran-riwayat` | `quran_compare_riwayat` + `quran_convert_ayah` (الروايات الـ8 وتحويل العد) | ✅ 8/8 |
| 10 | `tool-mushaf-layout` | `@deepseek-ai/dsh-tool-mushaf-layout` | `quran_get_page_layout` (تركيب الـ604 صفحات وتغطية 6236 آية) | ✅ 5/5 |
| 11 | `tool-quran-fonts` | `@deepseek-ai/dsh-tool-quran-fonts` | `quran_get_fonts` (كتالوج خطوط مجمع الملك فهد الـ15 مع فحص حي) | ✅ 3/3 |
| 12 | `tool-tajweed` | `@deepseek-ai/dsh-tool-tajweed` | `quran_analyze_tajweed` (تحليل خوارزمي لكل حرف عبر `tajweed-embeddings`) | ✅ 3/3 |
| 13 | `tool-quran-tafsir` | `@deepseek-ai/dsh-tool-quran-tafsir` | `quran_get_tafsir` (ابن كثير، الطبري، القرطبي، الميسر + ابن كثير إنجليزي) | ✅ 4/4 |
| 14 | `tool-quran-translations` | `@deepseek-ai/dsh-tool-quran-translations` | `quran_get_translation` (ترجمات معتمدة منسوبة لمترجميها عبر Quran.com v4) | ✅ 4/4 |
| 15 | `tool-quran-linguistics` | `@deepseek-ai/dsh-tool-quran-linguistics` | `quran_get_ayah_morphology` (تحليل صرفي كلمة-بكلمة من QAC v0.4) | ✅ 4/4 |
| 16 | `tool-quran-phonetic` | `@deepseek-ai/dsh-tool-quran-phonetic` | `quran_phonetize` (رسم صوتي بحفص عبر `quran-transcript`) | ✅ 3/3 |
| 17 | `tool-quran-sciences` | `@deepseek-ai/dsh-tool-quran-sciences` | `quran_search_topics` (فهرس موضوعات Quranpedia، 6100 موضوع) | ✅ 4/4 |
| 18 | `client-governance-card` | `@deepseek-ai/dsh-client-ui-quran-governance` | بطاقة الحوكمة ثنائية اللغة في الواجهة لـ 15 أداة قرآنية (`export const inject = ['slots']`) | ✅ 7/7 |
| 19 | `client-theme-islamic` | `@deepseek-ai/dsh-client-ui-quran-theme` | ثيما `mushaf` و`mushaf-dark` + خطوط المصحف وزخارف girih (`export const inject = ['theme']`) | ✅ 6/6 |
| 20 | `skill-quran` *(جديد)* | `@deepseek-ai/dsh-skill-quran` | 4 مهارات قرآنية افتراضية (`quran-mushaf-app`, `quran-recitation-feature`, `quran-verified-research`, `quran-compare-riwayat`) | ✅ 3/3 |
| 21 | `quran-sdk` *(جديد)* | `@deepseek-ai/dsh-quran-sdk` | TypeScript SDK موحد للمطورين والباحثين فوق طبقة الحوكمة والأدوات | ✅ 5/5 |
| 22 | `quran-bundle` | `@deepseek-ai/dsh-quran-bundle` | حزمة التجميع والـ Preset الافتراضي `quran` + اختبارات الربط الحي والإقلاع | ✅ 2/2 |

> **المجموع الكلي للاختبارات:** **83 / 83 اختبارًا ناجحًا** عبر **20 ملف اختبار** في `packages/quran`.

---

## 3. ما تم إنجازه في جلسة Antigravity (2026-10-21)

| الخطوة | الحالة | التفاصيل |
|---|---|---|
| 1. إنشاء مساحة عمل معزولة (`antigravity/`) | ✅ | إنشاء Git Worktree مستقل على فرع `quran-harness-agy` لضمان عدم أي تداخل مع عمل Kimi K3 في المجلد الرئيسي |
| 2. بناء حزمة المطورين `@deepseek-ai/dsh-quran-sdk` (`packages/quran/quran-sdk`) | ✅ | SDK متكامل بـ TypeScript يوفّر (`getVerse`, `getMetadata`, `search`, `compareRiwayat`, `convertAyah`, `getPageLayout`, `getAyahTiming`, `getAyahMorphology`, `searchTopics`, `verifyEnvelopeIntegrity`) مع مظروف الأدلة الإلزامي وسجل التدقيق |
| 3. بناء حزمة المهارات القرآنية الافتراضية `@deepseek-ai/dsh-skill-quran` (`packages/quran/skill-quran`) | ✅ | مزود مهارات مدمج (`dsh-quran`) يسجّل 4 مهارات افتراضية (`quran-mushaf-app`, `quran-recitation-feature`, `quran-verified-research`, `quran-compare-riwayat`) ويربطها بـ `preset-quran` |
| 4. تشخيص وإصلاح مشكلة عدم تفعيل إضافتي الواجهة (`2 entries did not activate`) | ✅ | إضافة `export const inject = ['theme', 'slots']` في `client-theme-islamic/src/client/index.ts` و `export const inject = ['slots']` في `client-governance-card/src/client/index.ts` وإعادة بناء حزمتي المتصفح |
| 5. إظهار الثيم الإسلامي في الإعدادات (`settings.general.item`) | ✅ | إنشاء [`QuranAppearanceRow.tsx`](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/client-theme-islamic/src/client/QuranAppearanceRow.tsx) وتسجيلها بـ `priority: -10` على `id: 'appearance'` لإظهار الثيمات الخمسة (`mushaf`، `mushaf-dark`، `light`، `dark`، `system`) مع حفظ التفضيل في `localStorage` وتفعيل `mushaf` افتراضيًا |
| 6. سكربت التشغيل المعزول وأدلة الاستخدام والاختبار التفاعلي | ✅ | إنشاء [run-quran-harness-agy.cmd](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/run-quran-harness-agy.cmd) و [SDK-AND-SKILLS-GUIDE.md](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/SDK-AND-SKILLS-GUIDE.md) و [QURAN-HARNESS-GUI-TESTS.html](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/QURAN-HARNESS-GUI-TESTS.html) |
| 7. إثراء الهوية البصرية الإسلامية للثيم (`QuranMushafOverlay.tsx`) | ✅ | دمج صورة النقش الإسلامي وصورة المصحف الشريف على الرحل والزخارف النصية الثلاث في خلفية وواجهة التطبيق (`shell.overlay` + `QuranAppearanceRow`) (`e76bba841d`) |
| 8. إدراج اللغة العربية (`ar` — `العربية`) ودعم RTL الشامل (`arabic-locale.ts`) | ✅ | تسجيل اللغة العربية في إعدادات النظام مع تعريب 13 نطاقًا أساسيًا وتفعيل اتجاه `dir="rtl"` تلقائيًا عند اختيارها (`e76bba841d`) |
| 9. استكمال المرحلة 5 — التصليب والإطلاق `v0.1.0` | ✅ | بناء حزمة اختبارات الإطلاق [`phase5-release-verification.spec.ts`](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/quran-bundle/tests/phase5-release-verification.spec.ts) (عزل النواة + اختبارات Red-Team + فحص 22 حزمة) وتوثيق [DEVELOPER-PLUGIN-GUIDE.md](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/DEVELOPER-PLUGIN-GUIDE.md) و [RELEASE-v0.1.0.md](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/RELEASE-v0.1.0.md) |
| 10. الاختبارات الشاملة والالتزام والوسم على فرع `quran-harness-agy` | ✅ | **94/94 اختبارًا أخضر** عبر **21 ملف اختبار**، والتزام التعديلات في `716145ae0f` مع وسم الإصدار `quran-harness-v0.1.0` |
