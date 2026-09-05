// ============================================================
// بيانات تجريبية لصفحة «المالية» + دوال مساعدة للحسابات والعرض
// (استبدلها لاحقاً بنداءات الباك-اند)
// ============================================================

import { toArabicDigits, formatDateAr, formatMoney } from '../utils/format.js'

export { toArabicDigits, formatDateAr, formatMoney }

/** تاريخ مرجعي ثابت لضمان نتائج حسابات متّسقة في العرض التجريبي */
export const TODAY = new Date('2026-07-04')

export const daysUntil = (iso, today = TODAY) => Math.round((new Date(iso) - today) / 86400000)

export const daysText = (iso, today = TODAY) => {
  const d = daysUntil(iso, today)
  if (d > 0) return `يتبقى ${d} يوم`
  if (d === 0) return 'يُصرف اليوم'
  return `تأخر ${-d} يوم`
}

/* ---------------- أنواع الحركة (نموذج + جدول) ---------------- */
export const TYPE_META = {
  check_in: { label: 'شيك مستلم', color: 'var(--ok)', soft: 'var(--ok-soft)', dir: 'in', icon: '📥' },
  check_out: { label: 'شيك صادر', color: 'var(--danger)', soft: 'var(--danger-soft)', dir: 'out', icon: '📤' },
  cash_in: { label: 'كاش مستلم', color: 'var(--brand)', soft: 'var(--brand-soft)', dir: 'in', icon: '💵' },
  cash_out: { label: 'كاش صادر', color: 'var(--warn)', soft: 'var(--warn-soft)', dir: 'out', icon: '💸' },
}

/* ---------------- حالات العرض في الجدول والنافذة ---------------- */
export const STATUS_META = {
  'مقبوض': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)' },
  'مدفوع': { color: 'var(--brand)', soft: 'var(--brand-soft)' },
  'مستحق': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
  'قيد التحصيل': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
  'تم الصرف': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)' },
  'متأخر': { color: '#fff', soft: 'var(--ink)' },
  'مرتجع': { color: 'var(--danger)', soft: 'var(--danger-soft)' },
}

/** الحالة الفعلية للحركة، مع مراعاة تعديلات المستخدم (صرف / ارتجاع) والتاريخ */
export function effStatus(t, ckState, today = TODAY) {
  const ov = ckState[t.id]
  if (ov === 'bounced') return 'مرتجع'
  if (t.type === 'check_in') {
    if (ov === 'cashed') return 'تم الصرف'
    return daysUntil(t.g, today) < 0 ? 'متأخر' : 'قيد التحصيل'
  }
  // check_out
  return t.base === 'مدفوع' ? 'مدفوع' : 'مستحق'
}

const sumAmount = (arr) => arr.reduce((a, b) => a + b.amount, 0)

/** الشيكات المستحقة خلال الشهر الحالي (واردة + صادرة) — مصدر واحد للوحة والنافذة المنبثقة */
export function monthChecksBreakdown(tx, ckState, today = TODAY) {
  const withinMonth = (t) => daysUntil(t.g, today) <= 30
  const recvList = tx.filter(
    (t) => t.type === 'check_in' && withinMonth(t) && !['مرتجع', 'تم الصرف'].includes(effStatus(t, ckState, today))
  )
  const outList = tx.filter(
    (t) =>
      t.type === 'check_out' &&
      withinMonth(t) &&
      daysUntil(t.g, today) >= -40 &&
      !['مرتجع', 'مدفوع'].includes(effStatus(t, ckState, today))
  )
  return {
    recvList,
    outList,
    monthCount: recvList.length + outList.length,
    monthValue: sumAmount(recvList) + sumAmount(outList),
  }
}

/** كل الإحصائيات المشتقة للوحة المالية (بطاقات + ملخص) */
export function computeFinanceStats(tx, ckState, today = TODAY) {
  const owedChecks = tx.filter(
    (t) => t.type === 'check_out' && !['مدفوع', 'مرتجع'].includes(effStatus(t, ckState, today))
  )
  const remaining = sumAmount(owedChecks)
  const cashInN = sumAmount(tx.filter((t) => t.type === 'cash_in'))
  const cashOutN = sumAmount(tx.filter((t) => t.type === 'cash_out'))
  const checksPaidN = sumAmount(tx.filter((t) => t.type === 'check_out' && effStatus(t, ckState, today) === 'مدفوع'))
  const paidToPeople = cashOutN + checksPaidN

  const cashedReceived = tx.filter((t) => t.type === 'check_in' && ckState[t.id] === 'cashed')
  const cashOnHand = cashInN - cashOutN + sumAmount(cashedReceived)

  const heldChecks = tx.filter(
    (t) => t.type === 'check_in' && ['قيد التحصيل', 'متأخر'].includes(effStatus(t, ckState, today))
  )
  const heldChecksN = sumAmount(heldChecks)
  const totalHave = cashOnHand + heldChecksN

  const { monthCount, monthValue } = monthChecksBreakdown(tx, ckState, today)

  const in30 = owedChecks.filter((t) => {
    const d = daysUntil(t.g, today)
    return d >= 0 && d <= 30
  })
  const due30N = sumAmount(in30)

  const paidTotal = checksPaidN + cashOutN
  const pctCheck = paidTotal ? Math.round((checksPaidN / paidTotal) * 100) : 0
  const pctCash = paidTotal ? 100 - pctCheck : 0
  const netBase = paidToPeople + remaining
  const pctPaid = netBase ? Math.round((paidToPeople / netBase) * 100) : 0

  return {
    cashOnHand,
    heldChecksN,
    heldCount: heldChecks.length,
    totalHave,
    monthCount,
    monthValue,
    remaining,
    due30N,
    in30Count: in30.length,
    checksPaidN,
    cashOutN,
    cashInN,
    paidToPeople,
    pctCheck,
    pctCash,
    pctPaid,
    totalIn: sumAmount(tx.filter((t) => TYPE_META[t.type].dir === 'in')),
    totalOut: sumAmount(tx.filter((t) => TYPE_META[t.type].dir === 'out')),
  }
}

/* ---------------- الحركات المالية ---------------- */
export const FINANCE_TX = [
  { id: 1, type: 'check_in', party: 'سامر الحاج', owner: 'سامر الحاج', amount: 60000, checkNo: '4520', bank: 'بنك فلسطين', g: '2026-06-28', attach: true },
  { id: 2, type: 'cash_in', party: 'دانا زيد', owner: '', amount: 40000, g: '2026-06-15', base: 'مقبوض', attach: true },
  { id: 3, type: 'check_out', party: 'شركة مقاولات النور', owner: 'الواحة العقارية', amount: 85000, checkNo: '7801', bank: 'البنك العربي', g: '2026-07-25', base: 'مستحق', attach: true },
  { id: 4, type: 'cash_out', party: 'محمد (عامل)', owner: '', amount: 12000, g: '2026-06-20', base: 'مدفوع', attach: false },
  { id: 5, type: 'check_out', party: 'مؤسسة الحديد', owner: 'الواحة العقارية', amount: 45000, checkNo: '7802', bank: 'بنك القدس', g: '2026-09-01', base: 'مستحق', attach: true },
  { id: 6, type: 'check_in', party: 'يوسف مرار', owner: 'شركة يوسف للإنشاءات', amount: 52500, checkNo: '4521', bank: 'بنك الاستثمار', g: '2026-07-10', attach: false },
  { id: 7, type: 'cash_out', party: 'بلاط السرايا', owner: '', amount: 28000, g: '2026-06-28', base: 'مدفوع', attach: true },
  { id: 8, type: 'check_out', party: 'كهرباء فلسطين', owner: 'الواحة العقارية', amount: 18000, checkNo: '7803', bank: 'بنك فلسطين', g: '2026-07-15', base: 'مدفوع', attach: true },
  { id: 9, type: 'cash_in', party: 'يونس مرار', owner: '', amount: 50000, g: '2026-07-01', base: 'مقبوض', attach: false },
  { id: 10, type: 'check_in', party: 'كريم داود', owner: 'مؤسسة كريم داود للمقاولات', amount: 48000, checkNo: '4522', bank: 'بنك القاهرة عمّان', g: '2026-07-22', attach: true },
  { id: 11, type: 'check_in', party: 'ليلى عبد الله', owner: 'ليلى عبد الله', amount: 35000, checkNo: '4523', bank: 'البنك الإسلامي', g: '2026-07-28', attach: true },
]

/* ---------------- مخزون الشيكات الجاهزة (لاختيارها عند إصدار شيك صادر) ---------------- */
export const CHECKS_POOL = [
  { id: 'ac1', no: '7815', bank: 'بنك فلسطين', amount: 70000, g: '2026-08-20' },
  { id: 'ac2', no: '7816', bank: 'البنك العربي', amount: 45000, g: '2026-09-10' },
  { id: 'ac3', no: '7817', bank: 'بنك القدس', amount: 32000, g: '2026-07-28' },
  { id: 'ac4', no: '7818', bank: 'بنك القاهرة عمّان', amount: 58000, g: '2026-08-02' },
  { id: 'ac5', no: '7819', bank: 'البنك الإسلامي', amount: 26000, g: '2026-07-15' },
  { id: 'ac6', no: '7820', bank: 'بنك الاستثمار', amount: 90000, g: '2026-09-25' },
  { id: 'ac7', no: '7821', bank: 'بنك فلسطين', amount: 41000, g: '2026-07-05' },
  { id: 'ac8', no: '7822', bank: 'البنك العربي', amount: 63000, g: '2026-08-14' },
]

/* ---------------- شرائح فلترة الجدول ---------------- */
export const FINANCE_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'check_in', label: 'شيك مستلم' },
  { id: 'check_out', label: 'شيك صادر' },
  { id: 'cash_in', label: 'كاش مستلم' },
  { id: 'cash_out', label: 'كاش صادر' },
]

/* ---------------- أنواع نموذج إضافة حركة ---------------- */
export const FINANCE_TXN_TYPES = [
  { id: 'check_in', label: 'شيك مستلم', sub: 'واردة', icon: '📥', color: '#10B981' },
  { id: 'check_out', label: 'شيك صادر', sub: 'صادرة', icon: '📤', color: '#EF4444' },
  { id: 'cash_in', label: 'كاش مستلم', sub: 'واردة', icon: '💵', color: '#2563EB' },
  { id: 'cash_out', label: 'كاش صادر', sub: 'صادرة', icon: '💸', color: '#F59E0B' },
]

export const CHECK_SEARCH_BY = [
  { id: 'number', label: 'رقم الشيك', icon: '#' },
  { id: 'date', label: 'التاريخ', icon: '📅' },
  { id: 'value', label: 'القيمة', icon: '💰' },
]
