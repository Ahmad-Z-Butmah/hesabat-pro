import { useEffect, useMemo, useState } from 'react'
import { getPartyTransactions } from '../../../utils/api.js'
import { formatMoney, formatDateAr, toArabicDigits } from '../../../utils/format.js'
import { Select } from '../../ui/Input/Input.jsx'
import './PartyTimelineDrawer.css'

const METHOD_FILTER_OPTIONS = [
  { value: 'all', label: 'كل الطرق' },
  { value: 'cash', label: 'نقد' },
  { value: 'cheque', label: 'شيك' },
]

const SORT_TXN_OPTIONS = [
  { value: 'newest', label: 'الأحدث أولاً' },
  { value: 'oldest', label: 'الأقدم أولاً' },
  { value: 'amount', label: 'الأعلى مبلغاً' },
]

const TYPE_META = {
  check_in: { label: 'شيك مستلم', method: 'cheque', dir: 'in', icon: '🧾' },
  check_out: { label: 'شيك صادر', method: 'cheque', dir: 'out', icon: '🧾' },
  cash_in: { label: 'كاش مستلم', method: 'cash', dir: 'in', icon: '💵' },
  cash_out: { label: 'كاش صادر', method: 'cash', dir: 'out', icon: '💵' },
}

const METHOD_META = {
  cash: { label: 'نقد', color: 'var(--ok-ink)', soft: 'var(--ok-soft)', icon: '💵' },
  cheque: { label: 'شيك', color: 'var(--brand)', soft: 'var(--brand-soft)', icon: '🧾' },
}

function getStatusMeta(t) {
  if (t.status === 'cleared') {
    if (t.type === 'cash_in') return { label: 'مقبوض', color: '#10b981', soft: '#e8f5ee' }
    if (t.type === 'check_in') return { label: 'تم الصرف', color: '#10b981', soft: '#e8f5ee' }
    return { label: 'مدفوع', color: '#2563eb', soft: '#e8f0fe' }
  }
  if (t.status === 'bounced') return { label: 'مرتجع', color: '#ef4444', soft: '#fde8e8' }
  if (t.type === 'check_in') return { label: 'قيد التحصيل', color: '#f59e0b', soft: '#fef3c7' }
  return { label: 'مستحق', color: '#f59e0b', soft: '#fef3c7' }
}

/** درج جانبي: السجل المالي الحقيقي لطرف واحد من الباك-اند، قابل للبحث والتصفية والفرز */
export default function PartyTimelineDrawer({ party, projectId, onClose }) {
  const [dq, setDq] = useState('')
  const [dMethod, setDMethod] = useState('all')
  const [dFrom, setDFrom] = useState('')
  const [dTo, setDTo] = useState('')
  const [dSort, setDSort] = useState('newest')
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isIn = party.dir === 'in'

  useEffect(() => {
    if (!projectId || !party?.id) return
    setLoading(true)
    setError('')
    getPartyTransactions(projectId, party.id)
      .then((data) => setTxns(Array.isArray(data) ? data : []))
      .catch((err) => setError(err?.message || 'تعذّر تحميل سجل الطرف'))
      .finally(() => setLoading(false))
  }, [projectId, party?.id])

  const filtered = useMemo(() => {
    let rows = txns.filter((t) => {
      const tm = TYPE_META[t.type] || { method: 'cash' }
      if (dMethod !== 'all' && tm.method !== dMethod) return false
      if (dFrom && t.transaction_date < dFrom) return false
      if (dTo && t.transaction_date > dTo) return false
      if (dq) {
        const haystack = `${tm.label}${t.note || ''}${t.check_no || ''}${t.bank || ''}`
        if (!haystack.includes(dq)) return false
      }
      return true
    })
    if (dSort === 'newest') rows.sort((a, b) => b.transaction_date.localeCompare(a.transaction_date))
    else if (dSort === 'oldest') rows.sort((a, b) => a.transaction_date.localeCompare(b.transaction_date))
    else if (dSort === 'amount') rows.sort((a, b) => Number(b.amount) - Number(a.amount))
    return rows
  }, [txns, dq, dMethod, dFrom, dTo, dSort])

  const shownTotal = useMemo(() => filtered.reduce((a, t) => a + Number(t.amount || 0), 0), [filtered])

  return (
    <div className="ptd" onClick={onClose}>
      <div className="ptd__panel" onClick={(e) => e.stopPropagation()}>
        <div className="ptd__head">
          <div className="ptd__head-row">
            <div className="ptd__head-left">
              <div className="ptd__avatar" style={{ background: party.color }}>{party.name.trim()[0]}</div>
              <div>
                <h2 className="ptd__title">{party.name}</h2>
                <p className="ptd__subtitle">{party.role || 'طرف'} · {isIn ? 'قبضت منه' : party.dir === 'balanced' ? 'متوازن الحساب' : 'دفعت له'}</p>
              </div>
            </div>
            <button className="ptd__close" onClick={onClose}>×</button>
          </div>
          <div className="ptd__tiles">
            <div className="ptd__tile"><div className="ptd__tile-lab">نقد / تحويل</div><div className="ptd__tile-val">{formatMoney(party.cash)}</div></div>
            <div className="ptd__tile"><div className="ptd__tile-lab">شيكات</div><div className="ptd__tile-val">{formatMoney(party.cheque)}</div></div>
            <div className="ptd__tile ptd__tile--gold"><div className="ptd__tile-lab">الإجمالي</div><div className="ptd__tile-val">{formatMoney(party.grand)}</div></div>
          </div>
        </div>

        <div className="ptd__filters">
          <div className="ptd__search">
            <span>🔍</span>
            <input value={dq} onChange={(e) => setDq(e.target.value)} placeholder="بحث في الحركات…" />
          </div>
          <Select value={dMethod} onChange={(e) => setDMethod(e.target.value)} options={METHOD_FILTER_OPTIONS} className="ptd__select" />
          <input value={dFrom} onChange={(e) => setDFrom(e.target.value)} type="date" className="ptd__date" title="من تاريخ" />
          <input value={dTo} onChange={(e) => setDTo(e.target.value)} type="date" className="ptd__date" title="إلى تاريخ" />
          <Select value={dSort} onChange={(e) => setDSort(e.target.value)} options={SORT_TXN_OPTIONS} className="ptd__select" />
        </div>

        <div className="ptd__body">
          <div className="ptd__body-head">
            <div className="ptd__body-count">السجل المالي — {loading ? '…' : toArabicDigits(filtered.length)} حركة</div>
            <div className="ptd__body-total">المجموع الظاهر: <span>{formatMoney(shownTotal)}</span></div>
          </div>

          {error ? (
            <div className="ptd__empty">
              <div className="ptd__empty-icon">⚠️</div>
              <div className="ptd__empty-title">تعذّر تحميل سجل الطرف</div>
              <div className="ptd__empty-hint">{error}</div>
            </div>
          ) : loading ? (
            <div className="ptd__empty">
              <div className="ptd__empty-icon">⏳</div>
              <div className="ptd__empty-title">جاري تحميل الحركات...</div>
            </div>
          ) : filtered.length > 0 ? (
            <div className="ptd__list">
              {filtered.map((t) => {
                const tm = TYPE_META[t.type] || { label: t.type, method: 'cash', dir: 'out', icon: '💵' }
                const mm = METHOD_META[tm.method]
                const sm = getStatusMeta(t)
                const tIsIn = tm.dir === 'in'
                const attCount = Array.isArray(t.attachments) ? t.attachments.length : (t.has_attachment ? 1 : 0)
                return (
                  <div key={t.id} className="ptd__item">
                    <div className="ptd__item-icon" style={{ background: mm.soft }}>{mm.icon}</div>
                    <div className="ptd__item-main">
                      <div className="ptd__item-row">
                        <div className="ptd__item-title">{tm.label}{t.check_no ? ` — شيك #${t.check_no}` : ''}</div>
                        <div className="ptd__item-amount" style={{ color: tIsIn ? 'var(--ok-ink)' : 'var(--danger)' }}>{tIsIn ? '+ ' : '− '}{formatMoney(t.amount)}</div>
                      </div>
                      {t.note && <div className="ptd__item-desc">{t.note}</div>}
                      <div className="ptd__item-tags">
                        <span className="ptd__tag" style={{ color: mm.color, background: mm.soft }}>{mm.label}</span>
                        <span className="ptd__tag" style={{ color: sm.color, background: sm.soft }}>{sm.label}</span>
                        <span className="ptd__tag ptd__tag--muted">📅 {formatDateAr(t.transaction_date)}</span>
                        {t.bank && <span className="ptd__tag ptd__tag--muted">🏦 {t.bank}</span>}
                        {attCount > 0 && <span className="ptd__tag ptd__tag--muted">📎 {toArabicDigits(attCount)} مرفق</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="ptd__empty">
              <div className="ptd__empty-icon">🔍</div>
              <div className="ptd__empty-title">لا حركات مطابقة للفلاتر</div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
