// ============================================================
// بيانات صفحة «الشيكات بحوزتك» — شيكات واردة استلمتها ولم تُصرف
// بعد، مع دوال فرز/فلترة/تصنيف ديناميكية (لا حالة محسوبة يدوياً).
// (استبدلها لاحقاً بنداءات الباك-اند)
// ============================================================
import { toArabicDigits } from '../utils/format.js'

export const TODAY = '2026-07-05'

const MONTHS_AR = [
  'كانون الثاني', 'شباط', 'آذار', 'نيسان', 'أيار', 'حزيران',
  'تموز', 'آب', 'أيلول', 'تشرين الأول', 'تشرين الثاني', 'كانون الأول',
]

export const AVATAR_PALETTE = ['#2563EB', '#0E9268', '#B4780A', '#8b5cf6', '#0891b2', '#c026d3']

/* ---------------- الشيكات الواردة المحتفَظ بها (لم تُصرف بعد) ---------------- */
export const HELD_CHEQUES = [
  { id: 'q1', no: '45245', party: 'دانا زيد', role: 'عميلة — شقة 502', unit: 'شقة 502', bank: 'بنك فلسطين', branch: 'فرع رام الله', amount: 25000, due: '2026-06-28', received: '2026-05-20', words: 'خمسة وعشرون ألف شيكل فقط لا غير', note: 'قسط ثانٍ من بيع الشقة' },
  { id: 'q2', no: '45209', party: 'رنا خليل', role: 'عميلة — شقة 102', unit: 'شقة 102', bank: 'البنك العربي', branch: 'فرع البيرة', amount: 30000, due: '2026-07-05', received: '2026-06-01', words: 'ثلاثون ألف شيكل فقط لا غير', note: 'دفعة أولى متفق عليها' },
  { id: 'q3', no: '45201', party: 'رنا خليل', role: 'عميلة — شقة 102', unit: 'شقة 102', bank: 'البنك العربي', branch: 'فرع البيرة', amount: 60000, due: '2026-07-10', received: '2026-06-15', words: 'ستون ألف شيكل فقط لا غير', note: 'دفعة حجز شقة 102' },
  { id: 'q4', no: '45203', party: 'يوسف مرار', role: 'عميل — شقة 402', unit: 'شقة 402', bank: 'بنك القدس', branch: 'فرع الناصرية', amount: 48000, due: '2026-07-22', received: '2026-06-30', words: 'ثمانية وأربعون ألف شيكل فقط لا غير', note: 'دفعة حجز شقة 402' },
  { id: 'q5', no: '45230', party: 'سامر الحاج', role: 'عميل — شقة 101', unit: 'شقة 101', bank: 'بنك فلسطين', branch: 'فرع الإرسال', amount: 40000, due: '2026-08-15', received: '2026-07-01', words: 'أربعون ألف شيكل فقط لا غير', note: 'قسط بيع مؤجل' },
  { id: 'q6', no: '45255', party: 'ليلى عبد الله', role: 'مستأجرة — شقة 301', unit: 'شقة 301', bank: 'البنك الإسلامي الفلسطيني', branch: 'فرع رام الله', amount: 12000, due: '2026-09-01', received: '2026-07-03', words: 'اثنا عشر ألف شيكل فقط لا غير', note: 'إيجار نقدي — ربع سنوي' },
]

const daysDiff = (a, b) => Math.round((new Date(a) - new Date(b)) / 86400000)

/** الحالة الفعلية للشيك: ready = جاهز للصرف (استُحق)، soon = يستحق قريباً، later = آجل */
export function withStatus(cheques, soonDays, today = TODAY) {
  return cheques.map((c, i) => {
    const d = daysDiff(c.due, today)
    const status = d <= 0 ? 'ready' : d <= soonDays ? 'soon' : 'later'
    return { ...c, d, status, color: AVATAR_PALETTE[i % AVATAR_PALETTE.length] }
  })
}

const sum = (arr) => arr.reduce((a, c) => a + c.amount, 0)

/** بطاقات الملخص الأربع — كلها مجاميع فعلية للشيكات المحتفَظ بها حالياً */
export function computeSummary(held, soonDays) {
  const ready = held.filter((c) => c.status === 'ready')
  const soon = held.filter((c) => c.status === 'soon')
  const later = held.filter((c) => c.status === 'later')
  const tile = (icon, ibg, label, arr, color, bg, border) => ({
    icon, label, value: sum(arr), color, count: arr.length,
    note: `${toArabicDigits(arr.length)} ${arr.length === 1 ? 'شيك' : 'شيكات'}`,
    bg: bg || '#fff', border: border || 'var(--line)',
    iconStyle: { background: ibg },
  })
  return [
    tile('📋', '#E8EEF6', 'إجمالي بحوزتك', held, 'var(--navy)'),
    tile('🔴', 'var(--danger-soft)', 'جاهزة للصرف الآن', ready, 'var(--danger)', '#FFFBFA', '#f6d5d5'),
    tile('⏳', 'var(--warn-soft)', `تستحق خلال ${toArabicDigits(soonDays)} يوم`, soon, 'var(--warn-ink)'),
    tile('📅', 'var(--brand-soft)', 'آجلة', later, 'var(--brand)'),
  ]
}

/**
 * فلترة حسب الحالة/البنك/البحث، ثم مطابقة المبلغ و/أو تاريخ الاستحقاق:
 * تطابق تام إن وُجد، وإلا أقرب 3 شيكات (فرزاً حسب قرب المبلغ/التاريخ المُدخل).
 */
export function filterCheques(held, { status, bank, q, amt, due }) {
  const base = held.filter((c) => {
    if (status !== 'all' && c.status !== status) return false
    if (bank !== 'all' && c.bank !== bank) return false
    if (q && !`${c.party}${c.no}${c.bank}${c.branch}${c.note}${c.unit}`.includes(q)) return false
    return true
  })

  const hasAmt = amt !== '' && amt != null
  const hasDue = !!due
  if (!hasAmt && !hasDue) return { list: base, approx: false }

  const exact = base.filter((c) => (!hasAmt || c.amount === +amt) && (!hasDue || c.due === due))
  if (exact.length) return { list: exact, approx: false }

  const dist = (c) => {
    let s = 0
    if (hasAmt) s += Math.abs(c.amount - +amt) / Math.max(+amt, 1)
    if (hasDue) s += Math.abs(daysDiff(c.due, due)) / 30
    return s
  }
  const nearest = base.slice().sort((a, b) => dist(a) - dist(b)).slice(0, 3)
  return { list: nearest, approx: true }
}

export function sortCheques(list, sortVal) {
  const out = list.slice()
  if (sortVal === 'due') out.sort((a, b) => a.due.localeCompare(b.due))
  else if (sortVal === 'amount') out.sort((a, b) => b.amount - a.amount)
  else if (sortVal === 'received') out.sort((a, b) => b.received.localeCompare(a.received))
  else if (sortVal === 'name') out.sort((a, b) => a.party.localeCompare(b.party, 'ar'))
  return out
}

export function dueParts(iso) {
  const [y, m, d] = iso.split('-')
  return { day: toArabicDigits(+d), month: MONTHS_AR[+m - 1], year: toArabicDigits(y) }
}

export function overdueText(d) {
  const n = -d
  return `تأخر ${toArabicDigits(n)} ${n === 1 ? 'يوم' : 'أيام'}`
}
