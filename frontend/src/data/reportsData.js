// ============================================================
// بيانات صفحة «التقارير» + دوال الحساب المشتقة منها.
// كل الأرقام المعروضة (KPIs، الرسم البياني، جدول الموقف المالي،
// أداء العقارات...) تُشتق ديناميكياً من صفوف الحركات أدناه —
// لا أرقام معزولة مكرَّرة. الاستثناء الوحيد المُثبت هو رصيد
// الكاش الحالي (رقم تراكمي لا يمكن اشتقاقه من عيّنة الفترة)
// ونسبة تحصيل كل عقار (مؤشر عمل وليس مجموعاً حسابياً).
// (استبدلها لاحقاً بنداءات الباك-اند)
// ============================================================
import { toArabicDigits } from '../utils/format.js'

/* ---------------- تصنيفات + حالات + طرق الدفع ---------------- */
export const CAT_META = {
  'بيع': { color: 'var(--ok)', soft: 'var(--ok-soft)' },
  'دفعة حجز': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)' },
  'إيجار': { color: 'var(--brand)', soft: 'var(--brand-soft)' },
  'عمولة': { color: 'var(--brand)', soft: 'var(--brand-soft)' },
  'رسوم': { color: 'var(--slate)', soft: 'var(--canvas)' },
  'صيانة': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
  'مقاولات': { color: 'var(--danger)', soft: 'var(--danger-soft)' },
  'رواتب': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
}
export const catMeta = (c) => CAT_META[c] || { color: 'var(--slate)', soft: 'var(--canvas)' }

export const STATUS_META = {
  'محصل': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)' },
  'مدفوع': { color: 'var(--brand)', soft: 'var(--brand-soft)' },
  'غير محصل': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
  'مستحق قريباً': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
  'متأخر': { color: '#fff', soft: 'var(--ink)' },
  'مرتجع': { color: 'var(--danger)', soft: 'var(--danger-soft)' },
}
export const statusMeta = (s) => STATUS_META[s] || { color: 'var(--slate)', soft: 'var(--canvas)' }

export const METHOD_META = {
  'كاش': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)', icon: '💵' },
  'شيك': { color: 'var(--brand)', soft: 'var(--brand-soft)', icon: '📦' },
  'تحويل بنكي': { color: 'var(--navy)', soft: '#E8EEF6', icon: '🏦' },
}
export const methodMeta = (m) => METHOD_META[m] || { color: 'var(--slate)', soft: 'var(--canvas)', icon: '•' }

const SETTLED = ['محصل', 'مدفوع']
const isSettled = (status) => SETTLED.includes(status)

/* الحالات التي "لم تُحصَّل/تُصرف" بعد (تُستخدم لحساب الذمم المتأخرة والشيكات بالحيازة) */
const OUTSTANDING = ['غير محصل', 'مستحق قريباً', 'متأخر']

/* ---------------- إعدادات كل فترة (نصوص العنوان + الرؤى التحليلية فقط) ---------------- */
export const PERIOD_META = {
  weekly: {
    title: 'هذا الأسبوع (٢٧ يونيو – ٠٢ يوليو)',
    chartTitle: 'مقبوضات مقابل مدفوعات — توزيع يومي',
    chartSub: 'حركة الأموال عبر أيام الأسبوع',
    insights: [
      { icon: '📉', tone: 'bad', text: 'صافي الأسبوع سالب — الصادر تجاوز الوارد بسبب دفعتي مقاولات كبيرتين. راجع تأجيل ما يمكن تأجيله من الشيكات المستحقة.' },
      { icon: '📌', tone: 'warn', text: 'أعلى صرف كان لدفعة مقاولات (٣٤,٠٠٠ ₪) يوم الثلاثاء — قد يضغط على السيولة هذا الأسبوع.' },
      { icon: '📈', tone: 'good', text: 'أعلى دخل جاء من دفعة حجز شقة ٢٠١ (٤٠,٠٠٠ ₪) — تابع باقي أقساط الحجز القادمة.' },
    ],
  },
  monthly: {
    title: 'يوليو ٢٠٢٦',
    chartTitle: 'مقبوضات مقابل مدفوعات — أسابيع الشهر',
    chartSub: 'تجميع الحركات لكل أسبوع من الشهر',
    insights: [
      { icon: '✅', tone: 'good', text: 'صافي الشهر إيجابي، والوضع المالي مستقر رغم عدد من الشيكات الواردة غير المحصّلة بعد.' },
      { icon: '⏳', tone: 'warn', text: 'شيكات صادرة بقيمة كبيرة مستحقة قريباً — جهّز السيولة لتفادي أي تأخير في الصرف.' },
      { icon: '⚠️', tone: 'bad', text: 'ذمم متأخرة على شقة ٢٠١ وشيك مرتجع لشقة ٣٠١ — يُنصح بمتابعة التحصيل مباشرة.' },
    ],
  },
  yearly: {
    title: 'سنة ٢٠٢٦',
    chartTitle: 'الإيرادات مقابل التكاليف — عبر أشهر السنة',
    chartSub: 'تجميع الإيرادات والتكاليف لكل شهر',
    // بيانات مجمّعة شهرياً (بيانات تراكمية واقعية لا يمكن اشتقاقها من عيّنة الحركات البارزة أدناه)
    bars: [
      { label: 'ينا', in: 150000, out: 130000 }, { label: 'فبر', in: 180000, out: 140000 }, { label: 'مار', in: 170000, out: 140000 },
      { label: 'أبر', in: 200000, out: 140000 }, { label: 'ماي', in: 220000, out: 145000 }, { label: 'يون', in: 220000, out: 145000 },
      { label: 'يول', in: 230000, out: 150000 }, { label: 'أغس', in: 240000, out: 155000 }, { label: 'سبت', in: 230000, out: 155000 },
      { label: 'أكت', in: 230000, out: 150000 }, { label: 'نوف', in: 230000, out: 155000 }, { label: 'ديس', in: 230000, out: 155000 },
    ],
    insights: [
      { icon: '📈', tone: 'good', text: 'ربح صافٍ تراكمي إيجابي طوال السنة مع اتجاه تصاعدي في هامش الربح ربعاً بعد ربع.' },
      { icon: '📊', tone: 'good', text: 'أعلى إيرادات جاءت من مبيعات الشقق في الربعين الثالث والرابع — حافظ على وتيرة التحصيل ذاتها.' },
      { icon: '⚠️', tone: 'warn', text: 'جزء من الشيكات الكبيرة يُصرف بعد إصداره بفترة طويلة — راقب فجوة السيولة بين الإصدار والصرف.' },
    ],
  },
}

export const TYPE_FILTER_OPTIONS = [{ v: 'all', t: 'الكل' }, { v: 'in', t: 'وارد' }, { v: 'out', t: 'صادر' }]
export const METHOD_FILTER_OPTIONS = [{ v: 'all', t: 'الكل' }, ...Object.keys(METHOD_META).map((m) => ({ v: m, t: m }))]
export const STATUS_FILTER_OPTIONS = [{ v: 'all', t: 'كل الحالات' }, ...Object.keys(STATUS_META).map((s) => ({ v: s, t: s }))]

export const PERIOD_LABELS = [
  { id: 'weekly', label: 'أسبوعي' },
  { id: 'monthly', label: 'شهري' },
  { id: 'yearly', label: 'سنوي' },
]

/** رصيد الكاش الحالي — رقم تراكمي (وارد − صادر منذ بداية المشروع)، لا يُشتق من عيّنة الفترة وحدها */
export const CASH_BALANCE = { weekly: 302000, monthly: 348000, yearly: 348000 }

/* ---------------- الحركات المالية لكل فترة ---------------- */
// dir: in | out — method: كاش | شيك | تحويل بنكي — no: رقم الشيك إن وُجد
export const MASTER = {
  weekly: [
    { no: null, dir: 'in', method: 'تحويل بنكي', cat: 'إيجار', unit: 'شقة 301', party: 'ليلى عبد الله', amount: 8000, g: '2026-06-27', status: 'محصل' },
    { no: null, dir: 'in', method: 'كاش', cat: 'بيع', unit: 'شقة 101', party: 'سامر الحاج', amount: 15000, g: '2026-06-28', status: 'محصل' },
    { no: '7813', dir: 'out', method: 'شيك', cat: 'مقاولات', unit: 'مرافق مشتركة', party: 'مؤسسة الحديد', amount: 22000, g: '2026-06-29', status: 'مدفوع' },
    { no: '7812', dir: 'out', method: 'شيك', cat: 'مقاولات', unit: 'مرافق مشتركة', party: 'شركة مقاولات النور', amount: 34000, g: '2026-06-30', status: 'مستحق قريباً' },
    { no: null, dir: 'in', method: 'كاش', cat: 'دفعة حجز', unit: 'شقة 201', party: 'أحمد ناصر', amount: 40000, g: '2026-07-01', status: 'محصل' },
    { no: null, dir: 'out', method: 'كاش', cat: 'رواتب', unit: 'مرافق مشتركة', party: 'أجور العمال', amount: 15000, g: '2026-07-02', status: 'مدفوع' },
  ],
  monthly: [
    { no: null, dir: 'in', method: 'كاش', cat: 'بيع', unit: 'شقة 101', party: 'سامر الحاج', amount: 50000, g: '2026-07-01', status: 'محصل' },
    { no: '4519', dir: 'in', method: 'شيك', cat: 'دفعة حجز', unit: 'شقة 201', party: 'أحمد ناصر', amount: 40000, g: '2026-06-28', status: 'متأخر' },
    { no: '4518', dir: 'in', method: 'شيك', cat: 'إيجار', unit: 'شقة 301', party: 'ليلى عبد الله', amount: 22000, g: '2026-06-20', status: 'مرتجع' },
    { no: null, dir: 'out', method: 'تحويل بنكي', cat: 'عمولة', unit: 'مرافق مشتركة', party: 'مكتب التسويق', amount: 9000, g: '2026-07-08', status: 'مدفوع' },
    { no: null, dir: 'in', method: 'تحويل بنكي', cat: 'إيجار', unit: 'شقة 301', party: 'ليلى عبد الله', amount: 15000, g: '2026-07-12', status: 'محصل' },
    { no: null, dir: 'out', method: 'كاش', cat: 'صيانة', unit: 'مرافق مشتركة', party: 'صيانة الواجهات', amount: 7000, g: '2026-07-11', status: 'مدفوع' },
    { no: '7814', dir: 'out', method: 'شيك', cat: 'رسوم', unit: 'مرافق مشتركة', party: 'كهرباء فلسطين', amount: 18000, g: '2026-07-15', status: 'مدفوع' },
    { no: null, dir: 'out', method: 'كاش', cat: 'رواتب', unit: 'مرافق مشتركة', party: 'أجور العمال', amount: 12000, g: '2026-07-20', status: 'مدفوع' },
    { no: '4521', dir: 'in', method: 'شيك', cat: 'دفعة حجز', unit: 'شقة 102', party: 'رنا خليل', amount: 60000, g: '2026-07-10', status: 'غير محصل' },
    { no: '80', dir: 'in', method: 'كاش', cat: 'بيع', unit: 'شقة 502', party: 'دانا زيد', amount: 80000, g: '2026-07-03', status: 'محصل' },
    { no: '4523', dir: 'in', method: 'شيك', cat: 'دفعة حجز', unit: 'شقة 402', party: 'يوسف مرار', amount: 48000, g: '2026-07-22', status: 'غير محصل' },
    { no: '7812', dir: 'out', method: 'شيك', cat: 'مقاولات', unit: 'مرافق مشتركة', party: 'شركة مقاولات النور', amount: 85000, g: '2026-07-25', status: 'مستحق قريباً' },
    { no: '4524', dir: 'in', method: 'شيك', cat: 'إيجار', unit: 'شقة 502', party: 'دانا زيد', amount: 35000, g: '2026-07-28', status: 'غير محصل' },
    { no: '7813', dir: 'out', method: 'شيك', cat: 'مقاولات', unit: 'مرافق مشتركة', party: 'مؤسسة الحديد', amount: 45000, g: '2026-07-30', status: 'مستحق قريباً' },
  ],
  yearly: [
    { no: '4510', dir: 'in', method: 'شيك', cat: 'بيع', unit: 'شقة 101', party: 'سامر الحاج', amount: 500000, g: '2026-02-10', status: 'محصل' },
    { no: '7805', dir: 'out', method: 'شيك', cat: 'مقاولات', unit: 'مرافق مشتركة', party: 'المقاول الرئيسي', amount: 410000, g: '2026-03-05', status: 'مدفوع' },
    { no: null, dir: 'in', method: 'تحويل بنكي', cat: 'بيع', unit: 'شقة 301', party: 'ليلى عبد الله', amount: 640000, g: '2026-05-20', status: 'محصل' },
    { no: null, dir: 'out', method: 'كاش', cat: 'مقاولات', unit: 'مرافق مشتركة', party: 'مواد بناء الشرق', amount: 430000, g: '2026-04-15', status: 'مدفوع' },
    { no: '4515', dir: 'in', method: 'شيك', cat: 'بيع', unit: 'شقة 402', party: 'يوسف مرار', amount: 700000, g: '2026-09-12', status: 'محصل' },
    { no: '7815', dir: 'out', method: 'شيك', cat: 'مقاولات', unit: 'مرافق مشتركة', party: 'مؤسسة الحديد', amount: 460000, g: '2026-08-05', status: 'مدفوع' },
    { no: '4520', dir: 'in', method: 'شيك', cat: 'دفعة حجز', unit: 'شقة 502', party: 'دانا زيد', amount: 690000, g: '2026-11-18', status: 'محصل' },
    { no: null, dir: 'out', method: 'تحويل بنكي', cat: 'عمولة', unit: 'مرافق مشتركة', party: 'مكتب التسويق', amount: 460000, g: '2026-10-01', status: 'مدفوع' },
  ],
}

/* ---------------- متابعة شيكات الأسبوع (مواعيد استحقاق، بصرف النظر عن ظهورها في دفتر الأسبوع) ---------------- */
export const WEEK_CHEQUES = {
  incoming: [
    { no: '4521', party: 'رنا خليل', unit: 'شقة 102', amount: 60000, g: '2026-07-10', status: 'غير محصل' },
    { no: '4519', party: 'أحمد ناصر', unit: 'شقة 201', amount: 40000, g: '2026-06-28', status: 'متأخر' },
    { no: '4525', party: 'ليلى عبد الله', unit: 'شقة 301', amount: 8000, g: '2026-06-27', status: 'محصل' },
  ],
  outgoing: [
    { no: '7813', party: 'مؤسسة الحديد', unit: 'مرافق مشتركة', amount: 22000, g: '2026-06-29', status: 'مدفوع' },
    { no: '7812', party: 'شركة مقاولات النور', unit: 'مرافق مشتركة', amount: 34000, g: '2026-06-30', status: 'مستحق قريباً' },
  ],
}

/* ---------------- دفعات مستحقة قادمة (أسبوعي + شهري) ---------------- */
export const DUE_PAYMENTS = [
  { party: 'شركة مقاولات النور', unit: 'مرافق مشتركة', note: 'دفعة أعمال الطابق الأرضي', cat: 'مقاولات', method: 'شيك #7812', amount: 34000, day: 'الثلاثاء', date: '٣٠/٠٦', attach: true },
  { party: 'مؤسسة الحديد', unit: 'مرافق مشتركة', note: 'فاتورة حديد تسليح', cat: 'مقاولات', method: 'شيك #7813', amount: 22000, day: 'الاثنين', date: '٢٩/٠٦', attach: true },
  { party: 'أجور العمال', unit: 'مرافق مشتركة', note: 'أجور أسبوعية — 6 عمال', cat: 'رواتب', method: 'كاش', amount: 15000, day: 'الخميس', date: '٠٢/٠٧', attach: false },
  { party: 'بلدية رام الله', unit: 'مرافق مشتركة', note: 'رسوم ترخيص وإشغال', cat: 'رسوم', method: 'تحويل بنكي', amount: 5000, day: 'الأربعاء', date: '٠١/٠٧', attach: true },
]

/* ---------------- شيكات صُرفت خلال الفترة (وقد صدرت في فترة سابقة) ---------------- */
export const PERIOD_CHEQUES = {
  monthly: [
    { dir: 'in', no: '4522', party: 'سامر الحاج', unit: 'شقة 101', cat: 'بيع', reason: 'قسط بيع شقة 101', amount: 50000, issued: '2026-06-25', cashed: '2026-07-03' },
    { dir: 'in', no: '4524', party: 'دانا زيد', unit: 'شقة 502', cat: 'إيجار', reason: 'إيجار ربع سنوي', amount: 35000, issued: '2026-07-05', cashed: '2026-07-20' },
    { dir: 'out', no: '7809', party: 'شركة مقاولات النور', unit: 'مرافق مشتركة', cat: 'مقاولات', reason: 'دفعة أعمال إنشائية — شيك آجل', amount: 40000, issued: '2026-05-18', cashed: '2026-07-06' },
    { dir: 'out', no: '7807', party: 'مؤسسة الحديد', unit: 'مرافق مشتركة', cat: 'مقاولات', reason: 'توريد حديد تسليح', amount: 30000, issued: '2026-06-02', cashed: '2026-07-12' },
    { dir: 'out', no: '7814', party: 'كهرباء فلسطين', unit: 'مرافق مشتركة', cat: 'رسوم', reason: 'فاتورة كهرباء الموقع', amount: 18000, issued: '2026-07-01', cashed: '2026-07-15' },
  ],
  yearly: [
    { dir: 'in', no: '4510', party: 'سامر الحاج', unit: 'شقة 101', cat: 'بيع', reason: 'قسط بيع شقة 101', amount: 500000, issued: '2025-12-10', cashed: '2026-02-15' },
    { dir: 'in', no: '4515', party: 'يوسف مرار', unit: 'شقة 402', cat: 'بيع', reason: 'قسط بيع شقة 402', amount: 700000, issued: '2026-07-01', cashed: '2026-09-10' },
    { dir: 'out', no: '7805', party: 'المقاول الرئيسي', unit: 'مرافق مشتركة', cat: 'مقاولات', reason: 'دفعة عقد الإنشاءات الرئيسي', amount: 410000, issued: '2026-01-20', cashed: '2026-03-05' },
    { dir: 'out', no: '7815', party: 'مؤسسة الحديد', unit: 'مرافق مشتركة', cat: 'مقاولات', reason: 'توريد حديد تسليح', amount: 460000, issued: '2026-06-10', cashed: '2026-08-05' },
    { dir: 'in', no: '4520', party: 'دانا زيد', unit: 'شقة 502', cat: 'دفعة حجز', reason: 'قسط حجز شقة 502', amount: 690000, issued: '2026-09-15', cashed: '2026-11-18' },
  ],
}
const isDeferred = (c) => c.issued.slice(0, 7) !== c.cashed.slice(0, 7)

/* ---------------- سجل المستفيدين (تراكمي، بصرف النظر عن الفترة المختارة) ---------------- */
export const PARTIES = [
  { id: 'p1', name: 'شركة مقاولات النور', role: 'مقاول رئيسي', txns: [
    { method: 'cheque', no: '7812', amount: 85000, g: '2026-07-25', cashed: false },
    { method: 'cheque', no: '7809', amount: 40000, g: '2026-06-15', cashed: true },
    { method: 'cheque', no: '7806', amount: 60000, g: '2026-05-10', cashed: true },
    { method: 'cash', amount: 25000, g: '2026-06-20' },
    { method: 'transfer', amount: 15000, g: '2026-07-02' },
  ] },
  { id: 'p2', name: 'مؤسسة الحديد', role: 'مورد حديد تسليح', txns: [
    { method: 'cheque', no: '7813', amount: 45000, g: '2026-07-30', cashed: false },
    { method: 'cheque', no: '7807', amount: 30000, g: '2026-06-28', cashed: true },
    { method: 'cash', amount: 22000, g: '2026-06-29' },
  ] },
  { id: 'p3', name: 'مواد بناء الشرق', role: 'مورد مواد بناء', txns: [
    { method: 'cheque', no: '7818', amount: 58000, g: '2026-08-02', cashed: false },
    { method: 'cash', amount: 20000, g: '2026-06-10' },
  ] },
  { id: 'p4', name: 'أجور العمال', role: 'رواتب وأجور', txns: [
    { method: 'cash', amount: 12000, g: '2026-07-20' },
    { method: 'cash', amount: 15000, g: '2026-07-02' },
  ] },
  { id: 'p5', name: 'كهرباء فلسطين', role: 'رسوم وخدمات', txns: [
    { method: 'cheque', no: '7814', amount: 18000, g: '2026-07-15', cashed: true },
  ] },
  { id: 'p6', name: 'مكتب التسويق', role: 'عمولة تسويق', txns: [
    { method: 'transfer', amount: 9000, g: '2026-07-08' },
  ] },
  { id: 'p7', name: 'صيانة الواجهات', role: 'صيانة دورية', txns: [
    { method: 'cash', amount: 7000, g: '2026-07-11' },
  ] },
]

/** نسبة تحصيل كل عقار — مؤشر عمل (خطة أقساط) لا يُشتق من دفتر حركة شهر واحد */
const RATE_BY_UNIT = { 'شقة 101': 95, 'شقة 102': 80, 'شقة 402': 88, 'شقة 301': 60, 'شقة 201': 50, 'شقة 502': 96, 'مرافق مشتركة': 100 }

/* ============================================================
   دوال الحساب — كل القيم المعروضة تُشتق من MASTER هنا
   ============================================================ */
const sum = (rows) => rows.reduce((a, r) => a + r.amount, 0)
const uniq = (arr) => arr.filter((v, i) => arr.indexOf(v) === i)
const WEEKDAY_AR = ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

export const getRowsForPeriod = (period) => MASTER[period]

export function getFilterOptions(period) {
  const rows = MASTER[period]
  return {
    catOptions: [{ v: 'all', t: 'كل التصنيفات' }, ...uniq(rows.map((r) => r.cat)).map((c) => ({ v: c, t: c }))],
    unitOptions: [{ v: 'all', t: 'كل الوحدات' }, ...uniq(rows.map((r) => r.unit)).map((u) => ({ v: u, t: u }))],
  }
}

export function filterRows(rows, filters) {
  let out = rows
  if (filters.fType !== 'all') out = out.filter((r) => r.dir === filters.fType)
  if (filters.fMethod !== 'all') out = out.filter((r) => r.method === filters.fMethod)
  if (filters.fCat !== 'all') out = out.filter((r) => r.cat === filters.fCat)
  if (filters.fUnit !== 'all') out = out.filter((r) => r.unit === filters.fUnit)
  if (filters.fStatus !== 'all') out = out.filter((r) => r.status === filters.fStatus)
  return out
}

/** بطاقات ملخص الفترة (شهري/سنوي) — نقد مقابل شيكات، وارداً وصادراً */
export function computePeriodStats(period) {
  const rows = MASTER[period]
  const inRows = rows.filter((r) => r.dir === 'in')
  const outRows = rows.filter((r) => r.dir === 'out')
  const inCash = inRows.filter((r) => r.method !== 'شيك')
  const outCash = outRows.filter((r) => r.method !== 'شيك')
  const inChq = inRows.filter((r) => r.method === 'شيك')
  const outChq = outRows.filter((r) => r.method === 'شيك')
  return [
    { icon: '📥', color: 'var(--ok-ink)', soft: 'var(--ok-soft)', label: 'استلمت نقداً / تحويلاً', value: sum(inCash), count: inCash.length },
    { icon: '📤', color: 'var(--danger)', soft: 'var(--danger-soft)', label: 'صرفت نقداً / تحويلاً', value: sum(outCash), count: outCash.length },
    { icon: '📦', color: 'var(--brand)', soft: 'var(--brand-soft)', label: 'استلمت شيكات', value: sum(inChq), count: inChq.length },
    { icon: '🧾', color: 'var(--warn-ink)', soft: 'var(--warn-soft)', label: 'صدرت شيكات', value: sum(outChq), count: outChq.length },
  ]
}

/** الرسم البياني — تجميع فعلي حسب اليوم (أسبوعي) أو الأسبوع (شهري) أو شهر جاهز (سنوي) */
export function computeBars(period) {
  const rows = MASTER[period]
  let bars
  if (period === 'weekly') {
    bars = WEEKDAY_AR.map((label, idx) => {
      const dayRows = rows.filter((r) => new Date(r.g).getUTCDay() === idx)
      return { label, in: sum(dayRows.filter((r) => r.dir === 'in')), out: sum(dayRows.filter((r) => r.dir === 'out')) }
    })
  } else if (period === 'monthly') {
    const weekOf = (g) => Math.ceil(new Date(g).getUTCDate() / 7)
    const weeks = uniq(rows.map((r) => weekOf(r.g))).sort((a, b) => a - b)
    bars = weeks.map((w) => {
      const weekRows = rows.filter((r) => weekOf(r.g) === w)
      return { label: `أسبوع ${toArabicDigits(w)}`, in: sum(weekRows.filter((r) => r.dir === 'in')), out: sum(weekRows.filter((r) => r.dir === 'out')) }
    })
  } else {
    bars = PERIOD_META.yearly.bars
  }
  const many = bars.length > 8
  return {
    bars,
    barW: many ? '15px' : bars.length > 5 ? '22px' : '30px',
    barGroupGap: many ? '6px' : '14px',
    showLabels: bars.length <= 7,
  }
}

/** توزيع طرق الدفع — حجم كل طريقة كنسبة من إجمالي حركات الفترة */
export function computeMethodBreakdown(period) {
  const rows = MASTER[period]
  const total = sum(rows)
  const methods = Object.keys(METHOD_META).map((label) => {
    const amt = sum(rows.filter((r) => r.method === label))
    return { label, ...methodMeta(label), amount: amt, pct: total ? Math.round((amt / total) * 100) : 0 }
  })
  return { methods, total }
}

/** الموقف المالي — 5 مؤشرات، كل واحد مربوط بقائمة الحركات التي تُكوّنه */
export function computePositionMetrics(period) {
  const rows = MASTER[period]
  const inRows = rows.filter((r) => r.dir === 'in')
  const outRows = rows.filter((r) => r.dir === 'out')
  const collected = inRows.filter((r) => r.status === 'محصل')
  const paid = outRows.filter((r) => isSettled(r.status))
  const cashRows = rows.filter((r) => r.method !== 'شيك')
  const held = inRows.filter((r) => r.method === 'شيك' && OUTSTANDING.includes(r.status))
  const owed = outRows.filter((r) => r.method === 'شيك' && !isSettled(r.status))

  return [
    { id: 'in', icon: '📥', color: 'var(--ok-ink)', soft: 'var(--ok-soft)', label: 'قبضت (المحصَّل فعلاً)', desc: 'نقد وتحويلات وشيكات محصَّلة', items: collected, value: sum(collected) },
    { id: 'out', icon: '📤', color: 'var(--danger)', soft: 'var(--danger-soft)', label: 'دفعت (المصروف فعلاً)', desc: 'ما خرج فعلاً من الصندوق', items: paid, value: sum(paid) },
    { id: 'cash', icon: '💵', color: 'var(--navy)', soft: 'var(--brand-soft)', label: 'الكاش المتوفر فعلاً', desc: 'الرصيد المتاح نقداً وبنكياً الآن', items: cashRows, value: CASH_BALANCE[period] },
    { id: 'held', icon: '📦', color: 'var(--brand)', soft: 'var(--brand-soft)', label: 'شيكات بحوزتك (لم تُصرف بعد)', desc: 'شيكات واردة أحلتها بانتظار التحصيل', items: held, value: sum(held) },
    { id: 'owed', icon: '⏳', color: 'var(--warn-ink)', soft: 'var(--warn-soft)', label: 'شيكات صدرتها ولم تُصرف بعد', desc: 'الباقي المستحق عليك', items: owed, value: sum(owed) },
  ]
}

/** متابعة شيكات الأسبوع — حسب موعد الاستحقاق بصرف النظر عن ظهورها في دفتر الحركات */
export function computeWeekTracker() {
  const rows = [
    ...WEEK_CHEQUES.incoming.map((r) => ({ ...r, dir: 'in' })),
    ...WEEK_CHEQUES.outgoing.map((r) => ({ ...r, dir: 'out' })),
  ]
  const cashedOut = WEEK_CHEQUES.outgoing.filter((r) => isSettled(r.status))
  const pendingIn = WEEK_CHEQUES.incoming.filter((r) => !isSettled(r.status))
  return {
    rows,
    cashedCount: cashedOut.length, cashedValue: sum(cashedOut),
    pendingCount: pendingIn.length, pendingValue: sum(pendingIn),
  }
}

export function computeDuePayments() {
  return { list: DUE_PAYMENTS, total: sum(DUE_PAYMENTS), count: DUE_PAYMENTS.length }
}

/** شيكات صُرفت خلال الفترة — قد تكون صدرت في فترة سابقة (مؤجَّلة) */
export function computeCashedDuring(period) {
  const rows = PERIOD_CHEQUES[period] || []
  return {
    rows: rows.map((c) => ({ ...c, deferred: isDeferred(c) })),
    count: rows.length,
    total: sum(rows),
  }
}

/** سجل المستفيدين — مجاميع الشيكات/الكاش لكل طرف، مُشتقة من حركاته الفعلية */
export function computePartiesLedger() {
  return PARTIES.map((p) => {
    const cheques = p.txns.filter((t) => t.method === 'cheque')
    const cashTxns = p.txns.filter((t) => t.method !== 'cheque')
    const chTotal = sum(cheques)
    const chCashed = sum(cheques.filter((t) => t.cashed))
    return {
      ...p,
      cheques, cashTxns,
      chTotal, chCashed, chUncashed: chTotal - chCashed,
      cashTotal: sum(cashTxns),
      grand: chTotal + sum(cashTxns),
      count: p.txns.length,
    }
  }).sort((a, b) => b.grand - a.grand)
}

/** أداء العقارات (شهري فقط) — بالوحدة، مشتقة من MASTER.monthly */
export function computePropertyPerformance() {
  const rows = MASTER.monthly
  const units = uniq(rows.map((r) => r.unit))
  const props = units.map((unit) => {
    const unitRows = rows.filter((r) => r.unit === unit)
    const inN = sum(unitRows.filter((r) => r.dir === 'in'))
    const outN = sum(unitRows.filter((r) => r.dir === 'out'))
    const lateN = sum(unitRows.filter((r) => r.status === 'متأخر' || r.status === 'مرتجع'))
    const owner = unitRows.find((r) => r.dir === 'in')?.party || 'مصاريف تشغيلية'
    return { name: unit, owner, in: inN, out: outN, net: inN - outN, rate: RATE_BY_UNIT[unit] ?? 100, late: lateN }
  })

  const withIncome = props.filter((p) => p.in > 0)
  const mostProfitable = withIncome.reduce((a, b) => (b.net > a.net ? b : a), withIncome[0])
  const mostExpensive = props.reduce((a, b) => (b.out > a.out ? b : a), props[0])
  const mostLate = props.reduce((a, b) => (b.late > a.late ? b : a), props[0])

  return {
    props,
    highlights: [
      { icon: '🏆', title: 'أكثر عقار ربحاً', name: `${mostProfitable.name} — ${mostProfitable.owner}`, value: mostProfitable.net, color: 'var(--ok-ink)' },
      { icon: '💸', title: 'أكثر عقار عليه مصاريف', name: mostExpensive.name, value: mostExpensive.out, color: 'var(--warn-ink)' },
      { icon: '⏰', title: 'أكثر عميل تأخراً بالدفع', name: `${mostLate.name} — ${mostLate.owner}`, value: mostLate.late, color: 'var(--danger)' },
    ],
  }
}

/** ربحية المشروع (سنوي فقط) — مشتقة من MASTER.yearly، مجمّعة حسب الربع الفعلي لتاريخ كل حركة */
export function computeYearlyProfit() {
  const rows = MASTER.yearly
  const rev = sum(rows.filter((r) => r.dir === 'in'))
  const cost = sum(rows.filter((r) => r.dir === 'out'))
  const net = rev - cost
  const pct = cost ? Math.round((net / cost) * 100) : 0

  const qLabel = (g) => Math.floor(new Date(g).getUTCMonth() / 3) // 0..3
  const quarters = [0, 1, 2, 3].map((qi) => {
    const qRows = rows.filter((r) => qLabel(r.g) === qi)
    const qRev = sum(qRows.filter((r) => r.dir === 'in'))
    const qCost = sum(qRows.filter((r) => r.dir === 'out'))
    return { label: ['الربع الأول', 'الربع الثاني', 'الربع الثالث', 'الربع الرابع'][qi], rev: qRev, cost: qCost, net: qRev - qCost, pct: qCost ? Math.round(((qRev - qCost) / qCost) * 100) : 0 }
  })

  return { cost, rev, net, pct, quarters }
}
