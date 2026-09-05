// ============================================================
// بيانات صفحة «الأطراف» — كل من تعاملنا معه مالياً (عملاء وارد +
// مقاولون/موردون صادر) في مكان واحد قابل للبحث والفرز والفلترة.
// أرقام المقاولين/الموردين نفس أرقام سجل المستفيدين في صفحة
// التقارير (reportsData.js) حتى لا تتكرر الحقيقة الواحدة برقمين
// مختلفين — فقط أضفنا هنا وصفاً وعنواناً ووحدة لكل حركة.
// (استبدلها لاحقاً بنداءات الباك-اند)
// ============================================================
export const AVATAR_PALETTE = ['#2563EB', '#0E2A4E', '#0E9268', '#B4780A', '#8b5cf6', '#EF4444', '#0891b2', '#c026d3', '#51637A', '#d97706']

export const METHOD_META = {
  cash: { label: 'نقد', color: 'var(--ok-ink)', soft: 'var(--ok-soft)', icon: '💵' },
  transfer: { label: 'تحويل بنكي', color: 'var(--navy)', soft: '#E8EEF6', icon: '🏦' },
  cheque: { label: 'شيك', color: 'var(--brand)', soft: 'var(--brand-soft)', icon: '🧾' },
}

export const VIEW_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'in', label: 'وارد (قبضت)' },
  { id: 'out', label: 'صادر (دفعت)' },
]

export const ROLE_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'customer', label: 'عملاء' },
  { id: 'contractor', label: 'مقاولون' },
  { id: 'vendor', label: 'موردون وخدمات' },
]

export const SORT_OPTIONS = [
  { value: 'total', label: 'الأعلى إجمالاً' },
  { value: 'name', label: 'حسب الاسم' },
  { value: 'count', label: 'الأكثر حركات' },
]

export const METHOD_FILTER_OPTIONS = [
  { value: 'all', label: 'كل الطرق' },
  { value: 'cash', label: 'نقد' },
  { value: 'transfer', label: 'تحويل بنكي' },
  { value: 'cheque', label: 'شيك' },
]

export const SORT_TXN_OPTIONS = [
  { value: 'newest', label: 'الأحدث أولاً' },
  { value: 'oldest', label: 'الأقدم أولاً' },
  { value: 'amount', label: 'الأعلى مبلغاً' },
]

/* ---------------- الأطراف وحركاتها ---------------- */
// dir: in = قبضت منه (عميل/مستأجر) — out = دفعت له (مقاول/مورد/رسوم)
export const PARTIES = [
  { id: 'v1', name: 'شركة مقاولات النور', role: 'مقاول رئيسي', dir: 'out', txns: [
    { method: 'cheque', no: '7812', amount: 85000, g: '2026-07-25', cashed: false, title: 'شيك #7812', desc: 'دفعة أعمال الطابق الأرضي', unit: 'مرافق مشتركة' },
    { method: 'cash', amount: 25000, g: '2026-06-20', title: 'دفعة نقدية', desc: 'أجرة صبّة الأساسات', unit: 'مرافق مشتركة' },
    { method: 'cheque', no: '7809', amount: 40000, g: '2026-06-15', cashed: true, title: 'شيك #7809', desc: 'دفعة أعمال إنشائية', unit: 'مرافق مشتركة' },
    { method: 'transfer', amount: 15000, g: '2026-07-02', title: 'تحويل بنكي', desc: 'مستخلص أعمال', unit: 'مرافق مشتركة' },
    { method: 'cheque', no: '7806', amount: 60000, g: '2026-05-10', cashed: true, title: 'شيك #7806', desc: 'دفعة مقدّمة العقد', unit: 'مرافق مشتركة' },
  ] },
  { id: 'v2', name: 'مؤسسة الحديد', role: 'مورد حديد تسليح', dir: 'out', txns: [
    { method: 'cheque', no: '7813', amount: 45000, g: '2026-07-30', cashed: false, title: 'شيك #7813', desc: 'فاتورة حديد تسليح', unit: 'مرافق مشتركة' },
    { method: 'cash', amount: 22000, g: '2026-06-29', title: 'دفعة نقدية', desc: 'شحنة حديد إضافية', unit: 'مرافق مشتركة' },
    { method: 'cheque', no: '7807', amount: 30000, g: '2026-05-28', cashed: true, title: 'شيك #7807', desc: 'توريد حديد للأساسات', unit: 'مرافق مشتركة' },
  ] },
  { id: 'v3', name: 'أجور العمال', role: 'رواتب وأجور', dir: 'out', txns: [
    { method: 'cash', amount: 12000, g: '2026-07-20', title: 'أجور أسبوعية', desc: 'أجور 6 عمال', unit: 'مرافق مشتركة' },
    { method: 'cash', amount: 15000, g: '2026-07-02', title: 'أجور أسبوعية', desc: 'أجور 7 عمال', unit: 'مرافق مشتركة' },
  ] },
  { id: 'v4', name: 'كهرباء فلسطين', role: 'رسوم وخدمات', dir: 'out', txns: [
    { method: 'cheque', no: '7814', amount: 18000, g: '2026-07-15', cashed: true, title: 'شيك #7814', desc: 'فاتورة كهرباء الموقع', unit: 'مرافق مشتركة' },
  ] },
  { id: 'v5', name: 'مكتب التسويق', role: 'عمولة تسويق', dir: 'out', txns: [
    { method: 'transfer', amount: 9000, g: '2026-07-08', title: 'عمولة تسويق', desc: 'عمولة بيع شقة 502', unit: 'شقة 502' },
  ] },

  { id: 'c1', name: 'سامر الحاج', role: 'عميل — شقة 101', dir: 'in', txns: [
    { method: 'cash', amount: 50000, g: '2026-07-01', title: 'دفعة بيع', desc: 'قسط بيع شقة 101', unit: 'شقة 101' },
    { method: 'cheque', no: '4522', amount: 50000, g: '2026-07-03', cashed: true, title: 'شيك #4522', desc: 'قسط بيع ثانٍ', unit: 'شقة 101' },
    { method: 'cash', amount: 30000, g: '2026-05-15', title: 'دفعة حجز', desc: 'حجز مبدئي للشقة', unit: 'شقة 101' },
  ] },
  { id: 'c2', name: 'رنا خليل', role: 'عميلة — شقة 102', dir: 'in', txns: [
    { method: 'cheque', no: '4521', amount: 60000, g: '2026-07-10', cashed: false, title: 'شيك #4521', desc: 'دفعة حجز شقة 102', unit: 'شقة 102' },
    { method: 'transfer', amount: 20000, g: '2026-06-12', title: 'تحويل بنكي', desc: 'دفعة أولى', unit: 'شقة 102' },
  ] },
  { id: 'c3', name: 'دانا زيد', role: 'مشترية — شقة 502', dir: 'in', txns: [
    { method: 'cash', amount: 80000, g: '2026-07-03', title: 'دفعة بيع', desc: 'بيع شقة 502', unit: 'شقة 502' },
    { method: 'cheque', no: '4524', amount: 35000, g: '2026-07-20', cashed: true, title: 'شيك #4524', desc: 'إيجار ربع سنوي', unit: 'شقة 502' },
  ] },
  { id: 'c4', name: 'يوسف مرار', role: 'عميل — شقة 402', dir: 'in', txns: [
    { method: 'cheque', no: '4523', amount: 48000, g: '2026-07-22', cashed: false, title: 'شيك #4523', desc: 'دفعة حجز شقة 402', unit: 'شقة 402' },
  ] },
  { id: 'c5', name: 'كريم داود', role: 'عميل (حجز) — شقة 401', dir: 'in', txns: [
    { method: 'transfer', amount: 15000, g: '2026-07-12', title: 'تحويل بنكي', desc: 'دفعة حجز مبدئية', unit: 'شقة 401' },
    { method: 'cheque', no: '4519', amount: 40000, g: '2026-06-28', cashed: false, title: 'شيك #4519', desc: 'دفعة حجز إضافية', unit: 'شقة 401' },
  ] },
]

const sum = (rows) => rows.reduce((a, r) => a + r.amount, 0)
const total = (nums) => nums.reduce((a, n) => a + n, 0)
const isCustomer = (role) => role.includes('عميل') || role.includes('مشتري') || role.includes('مستأجر')
const isContractor = (role) => role.includes('مقاول')
const isVendor = (role) => role.includes('مورد') || role.includes('رسوم') || role.includes('عمولة') || role.includes('رواتب') || role.includes('صيانة')

export function matchesRoleGroup(role, groupId) {
  if (groupId === 'all') return true
  if (groupId === 'customer') return isCustomer(role)
  if (groupId === 'contractor') return isContractor(role)
  if (groupId === 'vendor') return isVendor(role)
  return true
}

/** مجاميع كل طرف (شيكات/نقد/إجمالي/عدد) + لون ثابت له */
export function computePartiesAgg() {
  return PARTIES.map((p, i) => {
    const cheque = sum(p.txns.filter((t) => t.method === 'cheque'))
    const cash = sum(p.txns.filter((t) => t.method !== 'cheque'))
    return { ...p, cheque, cash, grand: cheque + cash, count: p.txns.length, color: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }
  })
}

/** شريط الملخص العلوي — 4 مؤشرات، مشتقة من مجاميع كل الأطراف */
export function computeSummary(agg) {
  const received = agg.filter((p) => p.dir === 'in')
  const paid = agg.filter((p) => p.dir === 'out')
  return [
    { icon: '📥', soft: 'var(--ok-soft)', color: 'var(--ok-ink)', label: 'قبضت من العملاء', value: total(received.map((p) => p.grand)), note: `${received.length} طرف` },
    { icon: '📤', soft: 'var(--danger-soft)', color: 'var(--danger)', label: 'دفعت للمقاولين والموردين', value: total(paid.map((p) => p.grand)), note: `${paid.length} طرف` },
    { icon: '📦', soft: 'var(--brand-soft)', color: 'var(--brand)', label: 'إجمالي عبر الشيكات', value: total(agg.map((p) => p.cheque)), note: 'واردة وصادرة' },
    { icon: '💵', soft: '#E8EEF6', color: 'var(--navy)', label: 'إجمالي نقداً وتحويلاً', value: total(agg.map((p) => p.cash)), note: 'نقد + تحويل بنكي' },
  ]
}

/** تصفية وفرز جدول الأطراف حسب الاتجاه/الفئة/البحث/الترتيب المختار */
export function filterAndSortParties(agg, { view, role, q, sortVal }) {
  let list = agg.filter((p) => {
    if (view !== 'all' && p.dir !== view) return false
    if (!matchesRoleGroup(p.role, role)) return false
    if (q && !(p.name.includes(q) || p.role.includes(q))) return false
    return true
  })
  list = [...list]
  if (sortVal === 'total') list.sort((a, b) => b.grand - a.grand)
  else if (sortVal === 'count') list.sort((a, b) => b.count - a.count)
  else if (sortVal === 'name') list.sort((a, b) => a.name.localeCompare(b.name, 'ar'))
  return list
}

/** حركات طرف واحد بعد تصفية السجل الزمني (بحث/طريقة/مدى تاريخي) وفرزه */
export function filterAndSortTxns(party, { dq, dMethod, dFrom, dTo, dSort }) {
  let tx = party.txns.slice()
  if (dMethod !== 'all') tx = tx.filter((t) => t.method === dMethod)
  if (dq) tx = tx.filter((t) => `${t.title}${t.desc}${t.no || ''}${t.unit}`.includes(dq))
  if (dFrom) tx = tx.filter((t) => t.g >= dFrom)
  if (dTo) tx = tx.filter((t) => t.g <= dTo)
  if (dSort === 'newest') tx.sort((a, b) => b.g.localeCompare(a.g))
  else if (dSort === 'oldest') tx.sort((a, b) => a.g.localeCompare(b.g))
  else if (dSort === 'amount') tx.sort((a, b) => b.amount - a.amount)
  return { txns: tx, shownTotal: sum(tx) }
}
