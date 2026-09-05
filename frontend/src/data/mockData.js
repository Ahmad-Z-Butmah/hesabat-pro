// ============================================================
// بيانات تجريبية موحّدة + دوال مساعدة — حسابات برو
// (استبدلها لاحقاً بنداءات الباك-اند)
// ============================================================
import { Fork, Home, Bag, Coffee } from '../components/icons/Icons.jsx'

/* ---------------- المشاريع (لوحة المشاريع) ---------------- */
export const projects = [
  { id: 'infinity', name: 'انفينتي', location: 'بتير', type: 'مطعم', Icon: Fork, gradient: ['#fb923c', '#ea580c'], mono: 'إن', revenue: '48,200', trend: '12.4', up: true },
  { id: 'waha', name: 'الواحة العقارية', location: 'رام الله', type: 'عقارات', Icon: Home, gradient: ['#38bdf8', '#0284c7'], mono: 'وا', revenue: '132,000', trend: '8.1', up: true },
  { id: 'citymall', name: 'سيتي مول', location: 'نابلس', type: 'محل تجاري', Icon: Bag, gradient: ['#818cf8', '#4f46e5'], mono: 'سي', revenue: '76,500', trend: '5.3', up: true },
  { id: 'plaza', name: 'بيت لحم بلازا', location: 'بيت لحم', type: 'عقارات', Icon: Home, gradient: ['#2dd4bf', '#0d9488'], mono: 'بل', revenue: '54,900', trend: '2.4', up: false },
  { id: 'coffee', name: 'كوفي تايم', location: 'رام الله', type: 'مقهى', Icon: Coffee, gradient: ['#f472b6', '#db2777'], mono: 'كو', revenue: '33,700', trend: '18.2', up: true },
  { id: 'nokhba', name: 'النخبة', location: 'الخليل', type: 'محل تجاري', Icon: Bag, gradient: ['#a78bfa', '#7c3aed'], mono: 'ال', revenue: '61,300', trend: '6.7', up: true },
]

export const projectTypes = [
  { key: 'restaurant', label: 'مطعم', Icon: Fork },
  { key: 'shop', label: 'محل تجاري', Icon: Bag },
  { key: 'realestate', label: 'عقارات', Icon: Home },
  { key: 'cafe', label: 'مقهى', Icon: Coffee },
]

/* المشروع النشط (يظهر في الهيدر) */
export const activeProject = {
  id: 'waha',
  name: 'الواحة العقارية',
  location: 'رام الله',
  type: 'عقارات',
  mono: 'وا',
  gradient: ['#38bdf8', '#0284c7'],
}

/* ---------------- نظرة عامة / المالية ---------------- */
export const overviewKpis = [
  { key: 'checks_in', label: 'شيكات مستلمة', value: '210,000 ₪', sub: '18 شيك مستلم', tone: 'green', icon: 'doc' },
  { key: 'checks_out', label: 'شيكات صادرة', value: '95,000 ₪', sub: '7 شيكات صادرة', tone: 'amber', icon: 'doc' },
  { key: 'cash_in', label: 'كاش مستلم', value: '64,000 ₪', sub: 'مقبوضات هذا الشهر', tone: 'blue', icon: 'cash' },
  { key: 'cash_out', label: 'كاش صادر', value: '38,000 ₪', sub: 'مدفوعات هذا الشهر', tone: 'red', icon: 'cash' },
]

export const cashFlow = {
  max: 90,
  months: [
    { label: 'فبراير', received: 52, paid: 30 },
    { label: 'مارس', received: 61, paid: 28 },
    { label: 'أبريل', received: 58, paid: 35 },
    { label: 'مايو', received: 72, paid: 40 },
    { label: 'يونيو', received: 80, paid: 38 },
    { label: 'يوليو', received: 64, paid: 33 },
  ],
}

export const financialSummary = {
  net: '+141,000 ₪',
  received: { label: 'إجمالي المقبوضات', value: '274,000 ₪', pct: 0.67 },
  paid: { label: 'إجمالي المدفوعات', value: '133,000 ₪', pct: 0.33 },
  dueSoon: { count: 3, value: '42,000 ₪' },
}

export const recentMovements = [
  { type: 'شيك مستلم', tone: 'green', party: 'شركة البناء الحديث', amount: '+45,000 ₪', positive: true, method: 'شيك #4021', due: '2026-08-15', status: 'مستحق', statusTone: 'amber' },
  { type: 'كاش مستلم', tone: 'blue', party: 'خالد أحمد', amount: '+12,000 ₪', positive: true, method: 'نقداً', due: '—', status: 'مقبوض', statusTone: 'green' },
  { type: 'شيك صادر', tone: 'amber', party: 'مقاول الكهرباء', amount: '-18,000 ₪', positive: false, method: 'شيك #229', due: '2026-07-30', status: 'مدفوع', statusTone: 'gray' },
  { type: 'كاش صادر', tone: 'red', party: 'مصاريف صيانة', amount: '-6,500 ₪', positive: false, method: 'نقداً', due: '—', status: 'مدفوع', statusTone: 'gray' },
]

/* ---------------- الشقق: 5 طوابق × شقتان ---------------- */
/* status: available | reserved | sold */
export const UNITS = [
  { no: '101', floor: 1, status: 'sold', buyer: 'سامر الحاج' },
  { no: '102', floor: 1, status: 'sold', buyer: 'رنا خليل' },
  { no: '201', floor: 2, status: 'reserved', buyer: 'حجز — أحمد ناصر' },
  { no: '202', floor: 2, status: 'available', buyer: '' },
  { no: '301', floor: 3, status: 'sold', buyer: 'ليلى عبد الله' },
  { no: '302', floor: 3, status: 'available', buyer: '' },
  { no: '401', floor: 4, status: 'reserved', buyer: 'حجز — كريم داود' },
  { no: '402', floor: 4, status: 'sold', buyer: 'يوسف مرار' },
  { no: '501', floor: 5, status: 'available', buyer: '' },
  { no: '502', floor: 5, status: 'sold', buyer: 'دانا زيد' },
]

/* تسمية الحالة (الألوان تُدار عبر CSS بالاعتماد على status) */
export const STATUS_LABEL = { sold: 'مبيوعة', reserved: 'محجوزة', available: 'متاحة' }

export const unitCounts = () => ({
  available: UNITS.filter((u) => u.status === 'available').length,
  reserved: UNITS.filter((u) => u.status === 'reserved').length,
  sold: UNITS.filter((u) => u.status === 'sold').length,
})

export const unitOptions = () =>
  UNITS.map((u) => ({ value: 'A' + u.no, label: `شقة ${u.no} — ${STATUS_LABEL[u.status]}` }))

export const floorsTopFirst = () => {
  const floors = []
  for (let f = 5; f >= 1; f--) floors.push({ num: f, units: UNITS.filter((u) => u.floor === f) })
  return floors
}

/* ---------------- المواقف: 24 موقفاً (موقفان لكل شقة) ---------------- */
export const buildParking = () => {
  const parks = []
  UNITS.forEach((u, i) => {
    const sold = u.status === 'sold'
    for (let j = 1; j <= 2; j++) parks.push({ code: 'P' + (i * 2 + j), tag: 'شقة ' + u.no, sold })
  })
  for (let k = parks.length; k < 24; k++) parks.push({ code: 'V' + (k - 19), tag: 'زوّار', sold: false, visitor: true })
  return parks
}

/* ---------------- العملاء ---------------- */
export const CUSTOMERS = [
  { name: 'سامر الحاج', phone: '0599 123 456', unit: '101', checks: 6, total: '٣٦٠,٠٠٠', cash: '٤٠,٠٠٠', due: '٢٠٢٦/٠٨/١٥', status: 'منتظم', ok: true },
  { name: 'رنا خليل', phone: '0568 771 220', unit: '102', checks: 4, total: '٢٨٠,٠٠٠', cash: '٦٠,٠٠٠', due: '٢٠٢٦/٠٧/٣٠', status: 'منتظم', ok: true },
  { name: 'ليلى عبد الله', phone: '0597 004 918', unit: '301', checks: 8, total: '٤٢٠,٠٠٠', cash: '٢٥,٠٠٠', due: '٢٠٢٦/٠٧/١٠', status: 'متأخر', ok: false },
  { name: 'يوسف مرار', phone: '0569 330 145', unit: '402', checks: 5, total: '٣١٠,٠٠٠', cash: '٥٠,٠٠٠', due: '٢٠٢٦/٠٩/٠١', status: 'منتظم', ok: true },
  { name: 'دانا زيد', phone: '0598 442 706', unit: '502', checks: 3, total: '١٩٥,٠٠٠', cash: '٨٠,٠٠٠', due: '٢٠٢٦/٠٨/٢٢', status: 'منتظم', ok: true },
]

export const AVATAR_PALETTE = ['#2563EB', '#10B981', '#F59E0B', '#8b5cf6', '#EF4444', '#0E9268']

/* ---------------- أنواع الحركة المالية ---------------- */
export const TXN_TYPES = [
  { id: 'check_in', label: 'شيك مستلم', sub: 'واردة', icon: '📥', color: '#10B981' },
  { id: 'check_out', label: 'شيك صادر', sub: 'صادرة', icon: '📤', color: '#EF4444' },
  { id: 'cash_in', label: 'كاش مستلم', sub: 'واردة', icon: '💵', color: '#2563EB' },
  { id: 'cash_out', label: 'كاش صادر', sub: 'صادرة', icon: '💸', color: '#F59E0B' },
]
