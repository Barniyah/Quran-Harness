/**
 * Arabic (`ar`) language pack and RTL synchronization for DeepSeek Quran Harness.
 * Registers `ar` (`العربية`) into `@deepseek-ai/dsh-client-locale` and provides
 * Arabic translations for the core shell, settings, sidebar, workspace, and
 * conversation namespaces, plus automatic `dir="rtl"` document switching.
 */
import type { LocaleRuntime, LocaleSnapshot } from '@deepseek-ai/dsh-client-locale/client'

export const ARABIC_LOCALE_ID = 'ar'
export const ARABIC_LOCALE_LABEL = 'العربية'

/** Arabic dictionaries keyed by DSH client locale namespace. */
export const ARABIC_DICTIONARIES: Readonly<Record<string, Readonly<Record<string, string>>>> = Object.freeze({
  common: {
    'ok': 'موافق',
    'cancel': 'إلغاء',
    'close': 'إغلاق',
    'copy': 'نسخ',
    'copied': 'تم النسخ',
    'codeBlock.title': 'كتلة برمجية',
    'codeBlock.wrap': 'التفاف الأسطر',
    'codeBlock.unwrap': 'عدم التفاف الأسطر',
    'copy.failed': 'فشل النسخ',
    'copy.value': 'نسخ القيمة',
    'copy.json': 'نسخ JSON',
    'copy.path': 'نسخ مسار الخاصية',
    'copy.prettyJson': 'نسخ JSON منسّق',
    'copy.compactJson': 'نسخ JSON مضغوط',
    'copy.optionsHint': '{action}؛ انقر بزر الفأرة الأيمن لخيارات النسخ',
    'retry': 'إعادة المحاولة',
    'loading': 'جارٍ التحميل…',
    'load.failed': 'تعذّر التحميل',
    'submit': 'إرسال',
    'submitting': 'جارٍ الإرسال…',
    'next': 'التالي',
    'previous': 'السابق',
    'skip': 'تخطّي',
    'delete': 'حذف',
    'edit': 'تعديل',
    'save': 'حفظ',
    'search': 'بحث',
    'more': 'المزيد',
    'collapse': 'طيّ',
    'expand': 'توسيع',
    'back': 'رجوع',
    'brand.localBuild': 'منصة القرآن الكريم · Quran Harness',
    'workspace.defaultName': 'مساحة العمل الافتراضية',
    'unknown': 'غير معروف',
    'none': 'لا يوجد',
    'truncated': 'مقتطع',
    'json.label': 'JSON',
    'markdown.footnotes': 'الحواشي',
    'markdown.truncatedCharacters': '… تم الاقتطاع عند {total} حرفًا',
    'number.thousand': '{value} ألف',
    'number.million': '{value} مليون',
  },
  'settings.locale': {
    'language.title': 'اللغة · Language',
  },
  settings: {
    'trigger': 'الإعدادات',
    'shortcut.open': 'فتح الإعدادات',
    'desktop.update.available': 'تحديث متاح',
    'desktop.update.checking': 'جارٍ التحقق من التحديثات…',
    'desktop.update.progress': '{percent}%',
    'desktop.update.verifying': 'جارٍ التحقق من ملفات التحديث…',
    'desktop.update.installing': 'جارٍ التحضير لإعادة التشغيل…',
    'desktop.update.ready': 'تثبيت وإعادة التشغيل',
    'desktop.update.retry': 'إعادة محاولة التحديث',
    'desktop.update.versionDetail': '{label}: {version}',
    'desktop.update.downloadDetail': 'جارٍ تنزيل التحديث: {percent}%\nالإصدار المستهدف: {version}',
    'title': 'الإعدادات',
    'close': 'إغلاق',
    'openDocument': 'فتح ملف الإعدادات',
    'openDocument.error': 'تعذّر فتح ملف الإعدادات',
    'general.nav': 'الإعدادات العامة',
    'general.currentVersion': 'الإصدار الحالي: {version}',
    'developerTools.title': 'إظهار واجهة البرمجة والتطوير',
    'developerTools.error': 'تعذّر الحفظ، يرجى المحاولة مرة أخرى.',
    'developerTools.description': 'إظهار مسار التنفيذ (Trajectory) وفروق الكود وجميع أنماط الوكيل (Presets)',
    'connection.error': 'انقطع الاتصال',
    'connection.connecting': 'جارٍ إعادة الاتصال…',
    'connection.connected': 'متصل',
    'connection.reconnect': 'انقطع الاتصال، اضغط لإعادة الاتصال الآن',
    'connection.restart': 'جارٍ إعادة الاتصال، اضغط للاتصال الفوري',
    'hostRelease.title': 'تغيّر إصدار الخدمة',
    'hostRelease.description': 'تغيّر إصدار الخادم؛ أعيدوا تحميل الصفحة لتشغيل الإصدار الجديد.',
    'hostRelease.service': 'الخدمة',
    'hostRelease.page': 'الصفحة',
    'hostRelease.unknown': 'غير معروف',
    'hostRelease.reload': 'إعادة التحميل الآن',
    'hostRelease.later': 'لاحقًا',
  },
  'settings.theme': {
    'appearance.title': 'المظهر',
    'appearance.light': 'فاتح',
    'appearance.dark': 'داكن',
    'appearance.system': 'تلقائي (النظام)',
    'fontSize.text.title': 'حجم خط النص',
    'fontSize.text.description': 'يؤثر على حجم نصوص المحادثة والآيات المعروضة',
    'fontSize.text.increase': 'تكبير حجم الخط',
    'fontSize.text.decrease': 'تصغير حجم الخط',
    'fontSize.code.title': 'حجم خط الكود',
    'fontSize.code.description': 'يُستخدم للكتل البرمجية ومخرجات الأدوات',
    'fontSize.code.increase': 'تكبير خط الكود',
    'fontSize.code.decrease': 'تصغير خط الكود',
    'fontSize.terminal.title': 'حجم خط الطرفية',
    'fontSize.terminal.description': 'يُستخدم لطرفية الأوامر الجانبية',
    'fontSize.terminal.increase': 'تكبير خط الطرفية',
    'fontSize.terminal.decrease': 'تصغير خط الطرفية',
    'fontSize.unit': 'px',
    'fontFamily.text.title': 'خط النصوص والواجهة',
    'fontFamily.text.description': 'يُستخدم للواجهة ونصوص المحادثة (افصل بين الخطوط بفاصلة أو اتركه فارغًا للافتراضي)',
    'fontFamily.code.title': 'خط البرمجة (Code)',
    'fontFamily.code.description': 'يُستخدم للكتل البرمجية ومخرجات الأدوات',
    'fontFamily.terminal.title': 'خط الطرفية (Terminal)',
    'fontFamily.terminal.description': 'يُستخدم لطرفية الأوامر الجانبية',
    'fontFamily.placeholder': 'الافتراضي',
    'fontSize.more': 'إعدادات خطوط إضافية',
  },
  sidebar: {
    'session.new': 'جلسة جديدة',
    'session.new.label': 'بدء جلسة جديدة',
    'toggle.open': 'فتح الشريط الجانبي',
    'toggle.collapse': 'طيّ الشريط الجانبي',
    'panels.label': 'اللوحات العامة',
  },
  workspace: {
    'group.ungrouped': 'غير مصنّف',
    'session.new': 'جلسة جديدة',
    'session.untitled': 'جلسة بدون عنوان',
    'section.workspaces': 'مساحات العمل',
    'section.sessions': 'الجلسات',
    'viewOptions.label': 'خيارات العرض',
    'groupBy.label': 'تجميع حسب',
    'groupBy.workspace': 'مساحة العمل',
    'groupBy.workspaceTree': 'شجرة مساحات العمل',
    'groupBy.flat': 'قائمة مسطّحة',
    'orderBy.label': 'ترتيب حسب',
    'orderBy.manual': 'يدوي',
    'orderBy.updated': 'الأحدث تحديثًا',
    'filterBy.label': 'تصفية الجلسات',
    'viewOptions.hideArchived': 'إخفاء المؤرشفة',
    'viewOptions.showArchived': 'كل المحادثات (مع المؤرشفة)',
    'viewOptions.onlyArchived': 'المؤرشفة فقط',
    'sessions.expand': 'عرض {n} جلسات أخرى',
    'sessions.collapse': 'طيّ',
    'empty.none': 'لا توجد جلسات بعد',
    'empty.noneArchived': 'لا توجد جلسات مؤرشفة',
    'empty.viewOthers': 'عرض الجلسات الأخرى',
    'empty.noMatches': 'لا توجد نتائج مطابقة',
    'workspace.add': 'إضافة مساحة عمل',
    'search.sessions.aria': 'البحث في الجلسات',
    'search.placeholder': 'ابحث في عناوين الجلسات…',
    'search.clear': 'مسح البحث',
    'menu.addWorkspace': 'إضافة مساحة عمل…',
    'rename': 'إعادة تسمية',
    'rename.workspace.title': 'إعادة تسمية مساحة العمل',
    'rename.session.title': 'إعادة تسمية الجلسة',
    'delete.workspace': 'حذف مساحة العمل',
    'menu.fork': 'تفريع الجلسة (Fork)',
    'menu.archiveSession': 'أرشفة الجلسة',
    'menu.unarchiveSession': 'إلغاء الأرشفة',
    'menu.pinSession': 'تثبيت الجلسة',
    'menu.unpinSession': 'إلغاء التثبيت',
    'row.archived': 'مؤرشفة',
    'row.pinned': 'مثبّتة',
    'actions.newSession': 'جلسة جديدة',
    'status.running': 'قيد التنفيذ',
    'status.idle': 'خامل',
    'status.waitingApproval': 'بانتظار الموافقة',
    'status.planReview': 'بانتظار مراجعة الخطة',
    'status.waitingAnswer': 'بانتظار الإجابة',
    'status.completed': 'مكتمل',
  },
  conversation: {
    'shortcut.newline': 'سطر جديد',
    'shortcut.slash': 'فتح قائمة الأوامر / المهارات',
    'shortcut.mention': 'فتح قائمة الإشارات @',
    'hint.plan': 'صِف مهمتك القرآنية أو البحثية لإنشاء خطة عمل',
    'hint.goal': 'أدخل الهدف وسيواصل الوكيل التنفيذ حتى إتمامه',
    'placeholder.plan': 'صِف مهمتك لإنشاء خطة عمل…',
    'placeholder.default': 'اكتب سؤالك أو مهمتك القرآنية، استخدم / للمهارات والأوامر، و @ للملفات',
    'placeholder.unavailable': 'الجلسة غير متاحة حاليًا',
    'placeholder.hero': 'ابحث في القرآن الكريم، قارن الروايات، حلّل التجويد والصرف، أو ابنِ تطبيقك القرآني الموثّق…',
    'placeholder.workspace': 'اختر مساحة عمل للبدء',
    'input.commands': 'إضافة ملف أو استدعاء أمر / مهارة',
    'input.file': 'ملف',
    'input.stop': 'إيقاف التوليد',
    'input.send': 'إرسال الرسالة',
    'input.send.queue': 'إضافة لطابور الإرسال',
    'input.send.steer': 'توجيه فوري',
    'context.used': 'السياق المستهلك',
    'context.system': 'موجه النظام',
    'context.tools': 'تعريفات الأدوات',
    'context.messages': 'رسائل المحادثة',
    'settings.enter.title': 'سلوك مفتاح الإدخال أثناء انشغال الوكيل',
    'settings.enter.description': 'سلوك مفتاح Enter وزر الإرسال أثناء تشغيل الوكيل',
    'settings.enter.queue': 'إرسال في الطابور',
    'settings.enter.steer': 'توجيه فوري',
    'hero.headline': 'منصة القرآن الكريم البحثية والبرمجية الموثّقة',
    'hero.preview': 'إصدار المصحف الموثّق',
    'hero.chooseWorkspace': 'اختر مساحة العمل',
    'todo.title': 'قائمة المهام',
  },
  'settings.agentPreset': {
    'builtInGroup': 'مدمج',
    'customGroup': 'مخصّص',
    'sectionIntro': 'اختر أدوات الوكيل وطريقة عمله. نمط القرآن (quran) مفعّل افتراضيًا بالحوكمة الصارمة والأدوات القرآنية الـ17.',
    'seatHint': 'اختر نمط الوكيل للمهمة الجديدة',
    'headerHint': 'نمط الوكيل المحدد لهذه المهمة',
    'nav': 'أنماط الوكيل (Presets)',
    'setDefault': 'تعيين كافتراضي للمهام الجديدة',
    'view': 'عرض الإعدادات',
    'presetStandardName': 'النمط القياسي',
    'presetPtcName': 'نمط PTC',
    'presetMinimalName': 'النمط المبسّط',
    'presetCordisName': 'نمط المطور (Creator)',
    'inUse': 'الافتراضي للمهام الجديدة',
    'noDescription': 'لا يوجد وصف.',
    'brokenBadge': 'فشل التحميل',
    'close': 'إغلاق',
  },
  'settings.models': {
    'nav': 'النماذج (Models)',
    'deepSeekAccount': 'حساب DeepSeek',
    'title': 'النماذج ومزودو الذكاء الاصطناعي',
    'intro': 'أدخل مفاتيح API لاستخدام النماذج من المزودين التاليين.',
    'edit': 'تعديل',
    'remove': 'حذف',
    'add': 'إضافة مزود نماذج',
    'provider': 'المزود',
    'close': 'إغلاق',
    'cancel': 'إلغاء',
    'apply': 'تطبيق',
    'applying': 'جارٍ التطبيق…',
    'credentialConfigured': 'مفتاح API مُعدّ',
    'credentialMissing': 'مفتاح API غير مُعدّ',
    'retry': 'إعادة المحاولة',
    'keyInput': 'مفتاح API',
  },
  'settings.plugins': {
    'nav': 'الإضافات المدمجة',
    'title': 'الإضافات المدمجة',
    'intro': 'استعرض الإضافات والأدوات القرآنية المضمّنة في هذه المنصة.',
    'tabs': 'عروض الإضافات',
    'empty': 'لا توجد عروض إضافات متاحة.',
  },
  'settings.agentLoop': {
    'title': 'حلقة الوكيل (Agent Loop)',
    'description': 'التحكم في كيفية تنفيذ الوكيل لاستدعاءات الأدوات المتوازية.',
    'maxParallel': 'استدعاءات الأدوات المتوازية',
    'maxParallelHint': 'الحد الأقصى للاستدعاءات المتوازية في الخطوة الواحدة.',
    'overridden': 'معدّل',
    'reset': 'استعادة الافتراضي',
    'save': 'حفظ',
    'saving': 'جارٍ الحفظ…',
  },
  'settings.subagent': {
    'subagentTitle': 'الوكلاء الفرعيون (Subagents)',
    'subagentDescription': 'ضبط عمق التفرع والعدد الأقصى ونماذج الوكلاء الفرعيين.',
    'subagentLimitsTitle': 'الحدود',
    'subagentMaxDepth': 'أقصى عمق للتفرع',
    'subagentMaxActive': 'حد التوازي للوكلاء الفرعيين',
    'overridden': 'معدّل',
    'reset': 'استعادة الافتراضي',
    'save': 'حفظ',
    'saving': 'جارٍ الحفظ…',
  },
  'settings.webSearch': {
    'title': 'البحث في الويب',
    'description': 'إعداد مزود البحث في الويب.',
    'apiKey': 'مفتاح API',
    'baseUrl': 'نقطة النهاية (Endpoint)',
    'maxUses': 'أقصى عدد عمليات بحث لكل طلب',
    'overridden': 'معدّل',
    'reset': 'استعادة الافتراضي',
    'save': 'حفظ',
    'saving': 'جارٍ الحفظ…',
  },
  'settings.permission': {
    'title': 'الصلاحيات',
    'description': 'اختر نمط الصلاحيات الافتراضي للجلسات الجديدة',
    'loading': 'جارٍ التحميل',
    'unavailable': 'غير متاح',
    'preset.readOnly': 'للقراءة فقط',
    'preset.workspaceWrite': 'الكتابة داخل مساحة العمل',
    'preset.fullAccess': 'صلاحية كاملة',
    'confirm.title': 'تفعيل الصلاحية الكاملة؟',
    'confirm.cancel': 'إلغاء',
    'confirm.enable': 'تفعيل الصلاحية الكاملة',
  },
  'permission.access': {
    'mode': 'نمط الوصول الحالي: {name}',
    'close': 'إغلاق',
    'preset.readOnly': 'للقراءة فقط',
    'preset.workspaceWrite': 'الكتابة داخل مساحة العمل',
    'preset.fullAccess': 'صلاحية كاملة',
  },
})

/**
 * Synchronize `<html dir>` and `<body dir>` with the active locale snapshot.
 * When Arabic (`ar`) is active, enables full RTL layout (`dir="rtl"` and
 * `data-rtl="true"`); otherwise restores `dir="ltr"`.
 */
export function syncDocumentDirection(snapshot: LocaleSnapshot): void {
  if (typeof document === 'undefined') return
  const isRtl = snapshot.active.toLowerCase().startsWith('ar')
  const dir = isRtl ? 'rtl' : 'ltr'
  if (document.documentElement.dir !== dir) {
    document.documentElement.dir = dir
  }
  if (isRtl) {
    document.documentElement.dataset.rtl = 'true'
  } else {
    delete document.documentElement.dataset.rtl
  }
  if (document.body !== null) {
    if (document.body.dir !== dir) {
      document.body.dir = dir
    }
    if (isRtl) {
      document.body.dataset.rtl = 'true'
    } else {
      delete document.body.dataset.rtl
    }
  }
}

/**
 * Install the Arabic language (`ar` — `العربية`), its dictionaries across all
 * core DSH namespaces, and automatic RTL document synchronization.
 * @returns disposer that removes the language, dictionaries, and resets direction.
 */
export function installArabicLocale(locale: LocaleRuntime): () => void {
  const disposers: Array<() => void> = []

  // Register Arabic in the selectable language catalog if not already present.
  const alreadyHasAr = locale.getSnapshot().locales.some(l => l.id.toLowerCase() === ARABIC_LOCALE_ID)
  if (!alreadyHasAr) {
    try {
      disposers.push(
        locale.addLanguage({
          id: ARABIC_LOCALE_ID,
          label: ARABIC_LOCALE_LABEL,
          fallback: 'en',
        }),
      )
    } catch {
      // Ignore if registered concurrently.
    }
  }

  // Register Arabic dictionaries for each namespace.
  for (const [ns, dict] of Object.entries(ARABIC_DICTIONARIES)) {
    try {
      disposers.push(locale.register(ns, ARABIC_LOCALE_ID, { ...dict }))
    } catch {
      // Ignore if namespace already has 'ar' registered.
    }
  }

  // Sync document direction immediately and on every locale change.
  syncDocumentDirection(locale.getSnapshot())
  disposers.push(
    locale.subscribe(() => {
      syncDocumentDirection(locale.getSnapshot())
    }),
  )

  return () => {
    for (const dispose of disposers.reverse()) {
      try {
        dispose()
      } catch {
        // Ignore teardown errors.
      }
    }
    if (typeof document !== 'undefined') {
      document.documentElement.dir = 'ltr'
      delete document.documentElement.dataset.rtl
      if (document.body !== null) {
        document.body.dir = 'ltr'
        delete document.body.dataset.rtl
      }
    }
  }
}
