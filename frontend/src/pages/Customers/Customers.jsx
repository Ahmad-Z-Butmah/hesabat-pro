import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import { useEffect, useMemo, useState } from 'react'
import { getCustomers } from '../../utils/api.js'
import { formatCurrency, formatDateAr, toArabicDigits } from '../../utils/format.js'
import CustomerDetailModal from '../../components/modals/CustomerDetailModal/CustomerDetailModal.jsx'
import './Customers.css'

const AVATAR_PALETTE = ['#2563EB', '#0E2A4E', '#0E9268', '#B4780A', '#8b5cf6', '#EF4444', '#0891b2', '#c026d3', '#51637A', '#d97706']

const COLS = ['اسم العميل', 'رقم الهاتف', 'سعر البيع', 'إجمالي المدفوع', 'المتبقي', 'عدد الشيكات', 'أقرب استحقاق', 'الحالة']

function unitLabel(no) {
  return `شقة ${toArabicDigits(no)}`
}

/** شاشة العملاء: مشترو الوحدات الحقيقيون فقط — مشتق من علاقات البيع في الباك-اند */
export default function Customers() {
  const { projectId } = useCurrentProject()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [openId, setOpenId] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let active = true
    setLoading(true)
    setError('')
    getCustomers(projectId)
      .then((rows) => { if (active) setCustomers(rows || []) })
      .catch((err) => { if (active) setError(err?.message || 'تعذّر تحميل العملاء') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, reload])

  const rows = useMemo(() => customers.map((c, i) => ({ ...c, color: AVATAR_PALETTE[i % AVATAR_PALETTE.length] })), [customers])

  const openCustomer = openId ? rows.find((c) => c.id === openId) : null

  return (
    <div className="cust animate-fade" data-project-id={projectId}>
      <div className="cust__head">
        <div>
          <h2 className="cust__title">العملاء</h2>
          <p className="cust__sub">{customers.length ? toArabicDigits(customers.length) : '٠'} عميل اشتروا شققاً في المشروع</p>
        </div>
      </div>

      <div className="cust__table-wrap">
        <table className="cust__table">
          <thead>
            <tr>
              {COLS.map((c, i) => (
                <th key={c} className={i === 5 || i === 7 ? 'is-center' : ''}>{c}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((c) => {
              const unitNos = (c.unit_nos || []).map(unitLabel)
              const unitLine = unitNos.join(' • ')
              return (
                <tr key={c.id} onClick={() => setOpenId(c.id)}>
                  <td>
                    <div className="cust__name">
                      <div className="cust__avatar" style={{ background: c.color }}>
                        {(c.name || '?').trim()[0]}
                      </div>
                      <div>
                        <div className="cust__name-txt">{c.name}</div>
                        <div className="cust__units">{unitLine}</div>
                      </div>
                    </div>
                  </td>
                  <td className="cust__phone-cell">{c.phone || '—'}</td>
                  <td className="cust__total">{formatCurrency(c.sale_price_total)}</td>
                  <td className="cust__cash">{formatCurrency(c.paid_total)}</td>
                  <td className="cust__cash">{formatCurrency(c.remaining_total)}</td>
                  <td className="is-center cust__checks">{toArabicDigits(c.check_count || 0)}</td>
                  <td className="cust__due">{c.nearest_due_date ? formatDateAr(c.nearest_due_date) : '—'}</td>
                  <td className="is-center">
                    <span className={`cust__status ${c.is_overdue ? 'is-late' : 'is-ok'}`}>
                      {c.is_overdue ? 'متأخر' : 'منتظم'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {!loading && !error && rows.length === 0 && (
          <div className="cust__empty">
            <div className="cust__empty-icon">👥</div>
            <div className="cust__empty-title">لا عملاء بعد</div>
            <div className="cust__empty-hint">سجّل بيع وحدة في صفحة الشقق ليظهر المشتري هنا تلقائياً</div>
          </div>
        )}
        {loading && <div className="cust__empty">جارٍ تحميل العملاء…</div>}
        {!loading && error && <div className="cust__empty cust__empty--error">{error}</div>}
      </div>

      {openCustomer && (
        <CustomerDetailModal
          customer={openCustomer}
          projectId={projectId}
          onClose={() => setOpenId(null)}
          onChanged={() => setReload((r) => r + 1)}
        />
      )}
    </div>
  )
}
