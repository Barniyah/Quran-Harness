# دليل حزمة المطورين (`quran-sdk`) والمهارات الافتراضية (`skill-quran`)

> **المسار المعزول:** `d:\Projects\DeepSeek_Quran_Harness\antigravity\deepseek-harness` (فرع `quran-harness-agy`)

---

## 1. حزمة `@deepseek-ai/dsh-quran-sdk` (`packages/quran/quran-sdk`)

توفّر واجهة برمجية موحدة (TypeScript SDK) للمطورين والباحثين لبناء تطبيقات قرآنية أو سكربتات بحثية تلتزم تلقائيًا بطبقة حوكمة الأدلة (`EvidenceEnvelope` + `CrossVerification` + `AuditLog`).

### الاستخدام السريع

```typescript
import { createQuranSdk, verifyEnvelopeIntegrity } from '@deepseek-ai/dsh-quran-sdk'

const sdk = createQuranSdk({
  auditLogPath: './evidence-audit.jsonl',
})

// 1. جلب آية مع التحقق المتقاطع الإلزامي (Tanzil Uthmani × Quran.com API v4)
const verse = await sdk.getVerse(2, 255)
if (verse.status === 'ok') {
  console.log(verse.text)
  console.log(verse.verification.verdict)
}

// 2. البيانات الهيكلية للسورة والآية (الصفحة، الجزء، الربع، مكي/مدني)
const { metadata, evidence: metaEnv } = await sdk.getMetadata(2, 255)

// 3. البحث الهيكلي (الإملائي الحديث ← النص العثماني الأصيل) أو المطابق (exact)
const { result: searchHits } = await sdk.search('الحمد لله رب العالمين', { mode: 'skeleton', limit: 10 })

// 4. مقارنة الروايات الثمانية وتحويل عدّ الآيات
const { rows, differFromHafs } = await sdk.compareRiwayat(2, 255)
const converted = await sdk.convertAyah(2, 255, 'Hafs', 'Warsh') // -> 2:253

// 5. تخطيط صفحات المصحف (604 صفحة)
const pageLayout = await sdk.getPageLayout(604)

// 6. التزمين الصوتي بتلاوة الحصري (بداية/نهاية/مدة بالمللي ثانية + رابط MP3)
const timing = await sdk.getAyahTiming(1, 2)

// 7. التحليل الصرفي والنحوي كلمة-بكلمة (Quranic Arabic Corpus v0.4)
const morphology = await sdk.getAyahMorphology(112, 1)

// 8. البحث الموضوعي (كتالوج Quranpedia — 6100 موضوع)
const topics = await sdk.searchTopics('الصلاة', 10)

// 9. التحقق التشفيري من سلامة أي مظروف أدلة ومستوى الثقة
const integrity = sdk.verifyEnvelope(metaEnv, 'L2-verified-open')
console.assert(integrity.valid === true)
```

---

## 2. حزمة المهارات القرآنية الافتراضية `@deepseek-ai/dsh-skill-quran` (`packages/quran/skill-quran`)

تسجّل مزود مهارات مدمج (`dsh-quran`) في `ctx.skills` بترتيب `BUNDLED_SKILL_RANK` ويُربط تلقائيًا بـ `preset-quran` في `cordis.patch.yml`:

| اسم المهارة (`/skill`) | الوظيفة | المسار |
|---|---|---|
| `quran-mushaf-app` | بناء تطبيق مصحف موثق بالأدلة (SDK + التحقق المتقاطع + بطاقة الحوكمة + خطوط KFGQPC) | [SKILL.md](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/skill-quran/assets/quran-mushaf-app/SKILL.md) |
| `quran-recitation-feature` | بناء ميزة تلاوة وتزمين (الحصري) وتجويد خوارزمي (`tajweed-embeddings`) ورسم صوتي (`quran-transcript`) | [SKILL.md](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/skill-quran/assets/quran-recitation-feature/SKILL.md) |
| `quran-verified-research` | إعداد بحث قرآني موثق بالأدلة (بحث هيكلي + صرفيات وجذور + فهرس موضوعي + تفاسير وترجمات مسماة) | [SKILL.md](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/skill-quran/assets/quran-verified-research/SKILL.md) |
| `quran-compare-riwayat` | مقارنة الروايات الثمانية وتحويل عدّ الآيات من البيانات المعتمدة (`quran-meta`) | [SKILL.md](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/skill-quran/assets/quran-compare-riwayat/SKILL.md) |

---

## 3. إصلاح تفعيل إضافتي الواجهة (`ui-quran-theme` و `ui-quran-governance`)

تم تشخيص وإصلاح سبب ظهور `2 entries did not activate` عند إقلاع المتصفح:
- كان ينقص تصدير `export const inject = ['theme']` في [client-theme-islamic/src/client/index.ts](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/client-theme-islamic/src/client/index.ts).
- وكان ينقص تصدير `export const inject = ['slots']` في [client-governance-card/src/client/index.ts](file:///d:/Projects/DeepSeek_Quran_Harness/antigravity/deepseek-harness/packages/quran/client-governance-card/src/client/index.ts).
- بدون تصدير `inject`، كان إطار Cordis في المتصفح يستدعي `apply(ctx)` فورًا قبل جهوزية خدمتي `ctx.theme` و`ctx.slots`. بعد إضافة التصريحين وإعادة بناء حزمتي العميل (`lib/client.js`)، ينتظر Cordis الخدمتين ويفعّل الإضافتين بنجاح.

---

## 4. دليل تجربة القدرات الـ 15 والمهارات الـ 4 في الواجهة الرسومية لـ DSH

### خطوة التشغيل:
```powershell
set DEEPSEEK_API_KEY=sk-xxxxxxxx
d:\Projects\DeepSeek_Quran_Harness\antigravity\run-quran-harness-agy.cmd
```
- ستفتح الواجهة على `http://127.0.0.1:3080` مع Preset **«Quran Harness — الباحث والمطور القرآني المحكوم بالأدلة»** كخيار افتراضي.
- لتفعيل الثيم الإسلامي: افتح **الإعدادات (Settings) ← المظهر (Appearance)** واختر `mushaf` (نهاري عاجي/أخضر/ذهبي) أو `mushaf-dark` (ليلي أخضر-أسود/ذهبي).

### أ. أمثلة لتجربة القدرات القرآنية الـ 15 في المحادثة:

| الفئة | الأداة المستدعاة | مثال مطالبة (Prompt) للنسخ والتجربة | ما يظهر في الواجهة وبطاقة الحوكمة |
|---|---|---|---|
| **1. النص والتحقق المتقاطع** | `quran_get_verse` | `اعرض لي آية الكرسي (البقرة: 255) بالرسم العثماني مع التحقق المتقاطع` | النص العثماني + بطاقة الحوكمة خضراء (`VERIFIED / متحقق`) تعرض تطابق Tanzil × Quran.com وبصمة SHA-256 |
| **2. البيانات الهيكلية** | `quran_get_metadata` | `أعطني البيانات الهيكلية الكاملة لسورة الكهف والآية 255 من سورة البقرة` | عدد الآيات، الجزء، الحزب، الصفحة، مكي/مدني + بطاقة حوكمة `quran-meta` |
| **3. البحث الهيكلي والمطابق** | `quran_search` | `ابحث في القرآن عن عبارة "الحمد لله رب العالمين" واذكر السور والآيات` | يطابق الإملاء الحديث مع الفهرس الإملائي ويعيد الآيات بالرسم العثماني الأصيل + بطاقة حوكمة |
| **4. مقارنة الروايات** | `quran_compare_riwayat` | `قارن عدد آيات سورة البقرة وموضع آية الكرسي عبر الروايات الثمانية` | جدول يقارن حفص وورش وقالون والدوري وغيرها (286 مقابل 285 آية) |
| **5. تحويل عدّ الآيات** | `quran_convert_ayah` | `حوّل رقم الآية 255 من سورة البقرة من رواية حفص إلى رواية ورش` | يُظهر التحويل الموثق (`حفص 2:255 = ورش 2:253`) مع مظروف الأدلة |
| **6. التلاوة الصوتية** | `quran_get_audio` | `أعطني رابط التلاوة الصوتية للآية الأولى من سورة الرحمن بصوت العفاسي` | رابط MP3 مباشر من EveryAyah بعد نجاح فحص `HEAD` الحي (HTTP 200) |
| **7. التزمين الصوتي** | `quran_get_ayah_timing` | `ما هو التوقيت الزمني بالمللي ثانية للآية الثانية من سورة الفاتحة بتلاوة الحصري؟` | زمن البداية والنهاية والمدة بالمللي ثانية (`startMs`, `endMs`, `durationMs`) + رابط صوت الحصري |
| **8. صور صفحات المصحف** | `quran_get_page_image` | `أعطني صورة الصفحة 1 والصفحة 604 من مصحف المدينة` | رابط صورة الصفحة عالية الدقة بعد فحص `HEAD` الحي + بطاقة الحوكمة |
| **9. صور الآيات** | `quran_get_ayah_image` | `أعطني صورة PNG للآية 1 من سورة الإخلاص` | رابط صورة الآية الشفافة من EveryAyah مع فحص `HEAD` الحي |
| **10. تخطيط الصفحات** | `quran_get_page_layout` | `ما هي السور والآيات الموجودة في الصفحة 604 من المصحف وبأي ترتيب؟` | قائمة السور ونطاقات الآيات في الصفحة 604 (الإخلاص، الفلق، الناس) |
| **11. الخطوط القرآنية** | `quran_get_fonts` | `اعرض لي قائمة خطوط مجمع الملك فهد الرسمية المتاحة للتحميل مع التحقق من روابطها` | كتالوج الـ 15 خطًا رسميًا (حفص، ورش، قالون، إلخ) مع فحص حي للروابط |
| **12. تحليل التجويد** | `quran_analyze_tajweed` | `حلّل أحكام التجويد حرفًا بحرف للآية الأولى من سورة الفاتحة` | مخرجات المحرك الخوارزمي `tajweed-embeddings` لكل حرف مع مواضع الأحكام |
| **13. الرسم الصوتي** | `quran_phonetize` | `حوّل الآية الأولى من سورة الإخلاص إلى رسم صوتي منطوق برواية حفص` | الرسم الصوتي المنطوق عبر `quran-transcript` مع توثيق سلسلة التحويل |
| **14. التحليل الصرفي** | `quran_get_ayah_morphology` | `حلّل الآية 1 من سورة الإخلاص صرفيًا ونحويًا كلمة بكلمة مع الجذور` | أقسام الكلم، الجذور اللغوية، والخصائص الصرفية من Quranic Arabic Corpus v0.4 |
| **15. التفاسير المعتمدة** | `quran_get_tafsir` | `ما تفسير ابن كثير وتفسير الطبري للآية الأولى من سورة الإخلاص؟` | نص التفسير منسوبًا بالاسم الصريح لكتاب التفسير دون اجتهاد من النموذج |
| **16. الترجمات المعتمدة** | `quran_get_translation` | `اعرض ترجمة Abdel Haleem وترجمة Saheeh International لآية الكرسي (2:255)` | نص كل ترجمة مع اسم المترجم ورقم المعرف (`85` و`20`) في بطاقة الحوكمة |
| **17. الموضوعات القرآنية** | `quran_search_topics` | `ابحث في الفهرس الموضوعي للقرآن عن موضوع "الصبر" والآيات المرتبطة به` | الموضوعات المصنفة من كتالوج Quranpedia مع مراجع الآيات المرتبطة |

### ب. أمثلة لتجربة المهارات القرآنية الـ 4 (`skill-quran`) في الواجهة:

يمكنك استدعاء المهارات مباشرة عبر كتابة اسم المهارة أو طلب المهمة الهندسية/البحثية ليقوم الوكيل بتحميل ملف `SKILL.md` الخاص بها:

1. **مهارة بناء تطبيق مصحف (`quran-mushaf-app`)**:
   - **المطالبة:** `استخدم مهارة quran-mushaf-app لتصميم وبناء مكوّن React يعرض صفحة مصحف موثقة باستخدام @deepseek-ai/dsh-quran-sdk مع بطاقة الحوكمة وخط مجمع الملك فهد`
2. **مهارة بناء ميزة تلاوة وتجويد (`quran-recitation-feature`)**:
   - **المطالبة:** `استخدم مهارة quran-recitation-feature لبناء مشغل تلاوة متزامن يعتمد على تزمين الحصري بالمللي ثانية ويلوّن أحكام التجويد خوارزميًا`
3. **مهارة البحث القرآني الموثق (`quran-verified-research`)**:
   - **المطالبة:** `استخدم مهارة quran-verified-research لإعداد بطاقة بحثية موثقة بالكامل حول مفهوم "التقوى" تشمل الإحصاء، الجذر الصرفي، البحث الموضوعي، وتفسير ابن كثير والطبري لآية البقرة 197`
4. **مهارة مقارنة الروايات (`quran-compare-riwayat`)**:
   - **المطالبة:** `استخدم مهارة quran-compare-riwayat لإعداد مقارنة منهجية لعدّ آيات سورة الفاتحة وسورة البقرة بين رواية حفص ورواية ورش مع جدول تحويل الآيات`
