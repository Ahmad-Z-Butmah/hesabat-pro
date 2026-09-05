// ============================================================
// دوال تنسيق مشتركة (أرقام عربية، تواريخ، مبالغ) — تُستخدم عبر
// كل صفحات القسم المالي (المالية / التقارير) لضمان اتساق العرض
// ============================================================

const AR_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩']

export const toArabicDigits = (input) => String(input).replace(/[0-9]/g, (d) => AR_DIGITS[+d])

/** "2026-07-15" -> "٢٠٢٦/٠٧/١٥" */
export const formatDateAr = (iso) => toArabicDigits(iso.replaceAll('-', '/'))

/** 60000 -> "60,000 ₪" */
export const formatMoney = (n) => `${Math.round(n).toLocaleString('en-US')} ₪`

/** 60000 -> "+ 60,000 ₪" / -12000 -> "− 12,000 ₪" */
export const formatSignedMoney = (n) => `${n < 0 ? '− ' : '+ '}${formatMoney(Math.abs(n))}`

/**
 * دالة موحدة لتنسيق المبالغ مع معالجة الإشارات
 *
 * @param {number|string|Decimal} value - القيمة المطلوب تنسيقها
 * @param {object} options
 * @param {boolean} options.signed - يعرض + أو − قبل الرقم (افتراضي false)
 * @param {boolean} options.abs - يعرض القيمة المطلقة فقط بدون إشارة (افتراضي false)
 * @returns {string} مثال: "1,000 ₪" أو "+ 1,000 ₪" أو "− 1,000 ₪"
 */
export function formatCurrency(value, { signed = false, abs = false } = {}) {
  const num = Number(value) || 0
  if (abs) {
    return `${Math.round(Math.abs(num)).toLocaleString('en-US')} ₪`
  }
  if (signed) {
    return `${num < 0 ? '− ' : '+ '}${Math.round(Math.abs(num)).toLocaleString('en-US')} ₪`
  }
  return `${Math.round(Math.abs(num)).toLocaleString('en-US')} ₪`
}
