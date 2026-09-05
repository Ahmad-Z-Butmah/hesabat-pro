import { useEffect, useState } from 'react'
import { formatMoney, formatDateAr, toArabicDigits } from '../../../utils/format.js'
import {
  getCustomer,
  getCustomerTransactions,
  createCustomerTransaction,
  getTransactionAttachmentBlob,
} from '../../../utils/api.js'
import Button from '../../ui/Button/Button.jsx'
import Field from '../../ui/Field/Field.jsx'
import { Input, Select } from '../../ui/Input/Input.jsx'
import './CustomerDetailModal.css'

const TYPE_META = {
  check_in: { label: 'شيك مستلم', color: '#10b981', soft: '#e8f5ee', icon: '📥' },
  cash_in: { label: 'كاش مستلم', color: '#2563eb', soft: '#e8f0fe', icon: '💵' },
}

function getStatusMeta(t) {
  if (t.status === 'cleared') {
    return { label: 'مقبوض', color: '#10b981', soft: '#e8f5ee' }
  }
  if (t.status === 'bounced') return { label: 'مرتجع', color: '#ef4444', soft: '#fde8e8' }
  return { label: 'قيد التحصيل', color: '#f59e0b', soft: '#fef3c7' }
}

function getTypeLabel(t) {
  if (t.type === 'cash_in') return t.method === 'transfer' ? 'تحويل مستلم' : 'كاش مستلم'
  return 'شيك مستلم'
}

async function downloadAttachment(transactionId, attachment) {
  try {
    const blob = await getTransactionAttachmentBlob(transactionId, attachment.id)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = attachment.original_name || 'attachment'
    document.body.appendChild(a)
    a.click()
    a.remove()
    URL.revokeObjectURL(url)
  } catch {
    // تجاهل فشل التنزيل
  }
}

const RECEIVE_TYPES = [
  { value: 'cash_in', label: 'كاش مستلم', method: 'cash' },
  { value: 'transfer', label: 'تحويل مستلم', method: 'transfer' },
  { value: 'check_in', label: 'شيك مستلم', method: null },
]

const EMPTY_FORM = {
  receiveType: 'cash_in',
  amount: '',
  transaction_date: new Date().toISOString().slice(0, 10),
  note: '',
  check_no: '',
  bank: '',
  branch: '',
  due_date: '',
  file: null,
}

const unitLabel = (no) => `شقة ${toArabicDigits(no)}`

/** سجل عميل (مشتري وحدة): وحداته، سعر البيع، خطة الدفع، المدفوع/المتبقي، المقبوضات فقط */
export default function CustomerDetailModal({ customer, projectId, onClose, onChanged }) {
  const [detail, setDetail] = useState(null)
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const reload = () => {
    let active = true
    setLoading(true)
    setError('')
    Promise.all([
      getCustomer(projectId, customer.id),
      getCustomerTransactions(projectId, customer.id),
    ])
      .then(([d, rows]) => {
        if (!active) return
        setDetail(d || null)
        setTxns(rows || [])
      })
      .catch((err) => { if (active) setError(err?.message || 'تعذّر تحميل سجل العميل') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }

  useEffect(() => reload(), [projectId, customer.id])

  const n = (v) => Number(v) || 0
  const d = detail || customer
  const saleTotal = n(d.sale_price_total)
  const paidTotal = n(d.paid_total)
  const remainingTotal = n(d.remaining_total)
  const checkTotal = n(d.check_received)
  const units = detail?.units && detail.units.length > 0 ? detail.units : []
  const unitLine = (units.length ? units.map((u) => unitLabel(u.unit_no)) : (customer.unit_nos || [])).join(' • ')

  const tiles = [
    { label: 'سعر البيع', v: saleTotal, c: 'var(--navy)', bg: '#E8EEF6' },
    { label: 'إجمالي المدفوع', v: paidTotal, c: 'var(--ok-ink)', bg: 'var(--ok-soft)' },
    { label: 'المتبقي', v: remainingTotal, c: 'var(--warn-ink)', bg: 'var(--warn-soft)' },
    { label: 'شيكات مستلمة', v: checkTotal, c: 'var(--brand)', bg: 'var(--brand-soft)' },
  ]

  const isCheckForm = form.receiveType === 'check_in'

  const handleSubmit = async () => {
    setFormError('')
    const amount = Number(form.amount)
    if (!amount || amount <= 0) {
      setFormError('يرجى إدخال مبلغ أكبر من صفر')
      return
    }
    if (!form.transaction_date) {
      setFormError('يرجى اختيار تاريخ الاستلام')
      return
    }
    if (isCheckForm && !form.check_no) {
      setFormError('يرجى إدخال رقم الشيك')
      return
    }
    if (isCheckForm && !form.due_date) {
      setFormError('يرجى اختيار تاريخ استحقاق الشيك')
      return
    }

    const payload = new FormData()
    payload.append('type', isCheckForm ? 'check_in' : 'cash_in')
    payload.append('amount', String(amount))
    payload.append('transaction_date', form.transaction_date)
    payload.append('method', isCheckForm ? 'cash' : form.receiveType === 'transfer' ? 'transfer' : 'cash')
    if (form.note.trim()) payload.append('note', form.note.trim())
    if (isCheckForm) {
      payload.append('check_no', form.check_no.trim())
      if (form.bank.trim()) payload.append('bank', form.bank.trim())
      if (form.branch.trim()) payload.append('branch', form.branch.trim())
      payload.append('due_date', form.due_date)
    }
    if (form.file) payload.append('files', form.file)

    setSaving(true)
    try {
      await createCustomerTransaction(projectId, customer.id, payload)
      setForm(EMPTY_FORM)
      setShowForm(false)
      onChanged?.()
      reload()
    } catch (err) {
      setFormError(err?.message || 'تعذّر تسجيل المقبوض')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="cdm" onClick={onClose}>
      <div className="cdm__card" onClick={(e) => e.stopPropagation()}>
        <div className="cdm__head">
          <div className="cdm__head-left">
            <div className="cdm__avatar">{(customer.name || '?').trim()[0]}</div>
            <div>
              <h2 className="cdm__title">{customer.name}</h2>
              <p className="cdm__subtitle">
                {unitLine}{unitLine && customer.phone ? ' · ' : ''}{customer.phone || ''}
              </p>
            </div>
          </div>
          <div className="cdm__head-right">
            <div className="cdm__total">
              <span>المتبقي</span>
              <b>{formatMoney(remainingTotal)}</b>
            </div>
            <button className="cdm__close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="cdm__body">
          <div className="cdm__tiles">
            {tiles.map((t, i) => (
              <div key={i} className="cdm__tile" style={{ background: t.bg }}>
                <div className="cdm__tile-val" style={{ color: t.c }}>{formatMoney(t.v)}</div>
                <div className="cdm__tile-lab">{t.label}</div>
              </div>
            ))}
          </div>

          {units.length > 0 && (
            <div className="cdm__units">
              <div className="cdm__units-head"><h3>الوحدات المشتراة</h3></div>
              <div className="cdm__units-grid">
                {units.map((u) => (
                  <div key={u.unit_id} className="cdm__unit">
                    <div className="cdm__unit-no">{unitLabel(u.unit_no)}</div>
                    <div className="cdm__unit-rows">
                      <div><span>سعر البيع</span><b>{formatMoney(n(u.sale_price))}</b></div>
                      <div><span>الدفعة الأولى</span><b>{formatMoney(n(u.down_payment))}</b></div>
                      <div><span>تاريخ البيع</span><b>{u.sale_date ? formatDateAr(u.sale_date) : '—'}</b></div>
                      <div><span>الشيكات</span><b>{toArabicDigits(u.cheque_count || 0)}</b></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cdm__actions">
            <Button variant="primary" size="md" onClick={() => { setForm(EMPTY_FORM); setFormError(''); setShowForm((s) => !s) }}>
              {showForm ? 'إغلاق النموذج' : '＋ تسجيل مقبوض'}
            </Button>
          </div>

          {showForm && (
            <div className="cdm__form">
              {formError && <div className="cdm__form-error">{formError}</div>}
              <div className="cdm__form-grid">
                <Field label="نوع المقبوض">
                  <Select
                    value={form.receiveType}
                    onChange={(e) => setForm((f) => ({ ...f, receiveType: e.target.value }))}
                    options={RECEIVE_TYPES.map((t) => ({ value: t.value, label: t.label }))}
                  />
                </Field>
                <Field label="المبلغ (₪)">
                  <Input value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0" type="number" />
                </Field>
                <Field label="تاريخ الاستلام">
                  <Input type="date" value={form.transaction_date} onChange={(e) => setForm((f) => ({ ...f, transaction_date: e.target.value }))} />
                </Field>

                {isCheckForm && (
                  <>
                    <Field label="رقم الشيك">
                      <Input value={form.check_no} onChange={(e) => setForm((f) => ({ ...f, check_no: e.target.value }))} placeholder="رقم الشيك" />
                    </Field>
                    <Field label="البنك">
                      <Input value={form.bank} onChange={(e) => setForm((f) => ({ ...f, bank: e.target.value }))} placeholder="اسم البنك" />
                    </Field>
                    <Field label="الفرع">
                      <Input value={form.branch} onChange={(e) => setForm((f) => ({ ...f, branch: e.target.value }))} placeholder="الفرع" />
                    </Field>
                    <Field label="تاريخ الاستحقاق">
                      <Input type="date" value={form.due_date} onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))} />
                    </Field>
                  </>
                )}

                <Field label="ملاحظة (اختياري)" className="cdm__form-full">
                  <Input value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} placeholder="ملاحظة" />
                </Field>

                <div className="cdm__form-file cdm__form-full">
                  <label className="cdm__file-label">مرفق (صورة الشيك مثلًا) — اختياري</label>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,application/pdf"
                    onChange={(e) => setForm((f) => ({ ...f, file: e.target.files?.[0] || null }))}
                  />
                  {form.file && <div className="cdm__file-name">📎 {form.file.name}</div>}
                </div>
              </div>
              <div className="cdm__form-submit">
                <Button variant="secondary" onClick={() => setShowForm(false)}>إلغاء</Button>
                <Button variant="primary" onClick={handleSubmit} disabled={saving}>
                  {saving ? 'جارٍ الحفظ...' : 'تسجيل المقبوض'}
                </Button>
              </div>
            </div>
          )}

          <div className="cdm__ledger">
            <div className="cdm__ledger-head">
              <h3>سجل المقبوضات</h3>
              <span>{toArabicDigits(txns.length)} حركة</span>
            </div>

            {loading && <div className="cdm__empty">جارٍ تحميل سجل العميل…</div>}
            {!loading && error && <div className="cdm__empty cdm__empty--error">{error}</div>}
            {!loading && !error && txns.length === 0 && (
              <div className="cdm__empty">لا مقبوضات مسجلة لهذا العميل بعد</div>
            )}

            {!loading && !error && txns.length > 0 && (
              <div className="cdm__txn-list">
                {txns.map((t) => {
                  const tm = TYPE_META[t.type] || TYPE_META.cash_in
                  const st = getStatusMeta(t)
                  const label = getTypeLabel(t)
                  const icon = t.type === 'cash_in'
                    ? (t.method === 'transfer' ? '🏦' : tm.icon)
                    : tm.icon
                  return (
                    <div key={t.id} className="cdm__txn">
                      <div className="cdm__txn-icon" style={{ background: tm.soft }}>{icon}</div>
                      <div className="cdm__txn-main">
                        <div className="cdm__txn-row1">
                          <span className="cdm__txn-title">{label}</span>
                          <span className="cdm__txn-amount" style={{ color: 'var(--ok-ink)' }}>+ {formatMoney(n(t.amount))}</span>
                        </div>
                        <div className="cdm__txn-tags">
                          <span className="cdm__txn-tag" style={{ color: st.color, background: st.soft }}>{st.label}</span>
                          {t.check_no && <span className="cdm__txn-tag">شيك #{t.check_no}</span>}
                          {t.bank && <span className="cdm__txn-tag">{t.bank}</span>}
                          {t.due_date && <span className="cdm__txn-tag">استحقاق {formatDateAr(t.due_date)}</span>}
                          <span className="cdm__txn-tag">📅 {formatDateAr(t.transaction_date)}</span>
                        </div>
                        {t.note && <div className="cdm__txn-note">{t.note}</div>}
                        {t.attachments && t.attachments.length > 0 && (
                          <div className="cdm__txn-att">
                            {t.attachments.map((a) => (
                              <button key={a.id} type="button" className="cdm__txn-att-btn" onClick={() => downloadAttachment(t.id, a)}>
                                📎 {a.original_name}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
