import { useEffect, useState } from 'react'
import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import { Doc, Cash } from '../../components/icons/Icons.jsx'
import { getProjectOverview } from '../../utils/api.js'
import { formatCurrency, formatDateAr } from '../../utils/format.js'
import './ProjectOverview.css'

const ICONS = { doc: Doc, cash: Cash }

const TYPE_TONE = { check_in: 'green', check_out: 'amber', cash_in: 'blue', cash_out: 'red' }
const TYPE_LABEL = { check_in: 'شيك مستلم', check_out: 'شيك صادر', cash_in: 'كاش مستلم', cash_out: 'كاش صادر' }

function KpiCard({ label, value, sub, tone, icon }) {
  const Icon = ICONS[icon] || Doc
  return (
    <div className={`kpi kpi--${tone}`}>
      <span className="kpi__icon"><Icon size={24} /></span>
      <span className="kpi__label">{label}</span>
      <span className="kpi__value">{value}</span>
      <span className="kpi__sub">{sub}</span>
    </div>
  )
}

function getStatusBadge(t) {
  if (t.status === 'cleared') {
    if (t.type === 'cash_in') return { label: 'مقبوض', tone: 'green' }
    if (t.type === 'check_in') return { label: 'تم الصرف', tone: 'green' }
    return { label: 'مدفوع', tone: 'gray' }
  }
  if (t.status === 'bounced') return { label: 'مرتجع', tone: 'red' }
  if (t.type === 'check_in') {
    const overdue = t.due_date && new Date(t.due_date) < new Date()
    return { label: overdue ? 'متأخر' : 'قيد التحصيل', tone: 'amber' }
  }
  return { label: 'مستحق', tone: 'amber' }
}

function RecentMovements({ transactions }) {
  return (
    <div className="ovcard rec">
      <div className="rec__head">
        <a href="#all" className="rec__all">عرض الكل</a>
        <h3 className="ovcard__title">أحدث الحركات المالية</h3>
      </div>
      <table className="rec__table">
        <thead>
          <tr>
            <th>النوع</th><th>الطرف</th><th>المبلغ</th><th>الطريقة</th><th>الاستحقاق</th><th>الحالة</th>
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const isIn = t.type === 'check_in' || t.type === 'cash_in'
            const isCheck = t.type === 'check_in' || t.type === 'check_out'
            const sm = getStatusBadge(t)
            const date = isCheck ? (t.due_date || t.transaction_date) : t.transaction_date
            return (
              <tr key={t.id}>
                <td><span className={`badge ${TYPE_TONE[t.type] ? `badge--${TYPE_TONE[t.type]}` : 'badge--gray'}`}>{TYPE_LABEL[t.type] || t.type}</span></td>
                <td className="rec__party">{t.party_name || (t.party_id ? `طرف #${t.party_id}` : '—')}</td>
                <td className={isIn ? 'rec__amt-pos' : 'rec__amt-neg'}>{isIn ? '+ ' : '− '}{formatCurrency(t.amount)}</td>
                <td className="rec__mut">{isCheck ? `شيك #${t.check_no || '—'}` : 'نقداً'}</td>
                <td className="rec__mut">{date ? formatDateAr(date) : '—'}</td>
                <td><span className={`badge badge--${sm.tone}`}>{sm.label}</span></td>
              </tr>
            )
          })}
          {transactions.length === 0 && (
            <tr><td colSpan={6} className="rec__empty">لا توجد حركات مالية بعد</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}

export default function ProjectOverview() {
  const { projectId } = useCurrentProject()
  const [data, setData] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let cancelled = false
    getProjectOverview(projectId)
      .then((res) => { if (!cancelled) setData(res) })
      .catch(() => { if (!cancelled) setData(null) })
    return () => { cancelled = true }
  }, [projectId])

  if (!data) {
    return (
      <div className="overview animate-fade" data-project-id={projectId}>
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>جاري تحميل البيانات...</div>
      </div>
    )
  }

  const s = data.summary
  const kpis = [
    { key: 'checks_in', label: 'شيكات مستلمة', value: formatCurrency(s.received_checks_total), sub: `${s.received_checks_count} شيك مستلم`, tone: 'green', icon: 'doc' },
    { key: 'checks_out', label: 'شيكات صادرة', value: formatCurrency(s.issued_checks_total), sub: `${s.issued_checks_count} شيك صادر`, tone: 'amber', icon: 'doc' },
    { key: 'cash_in', label: 'كاش مستلم', value: formatCurrency(s.cash_received_total), sub: `${s.cash_received_count} حركة كاش مستلم`, tone: 'blue', icon: 'cash' },
    { key: 'cash_out', label: 'كاش صادر', value: formatCurrency(s.cash_paid_total), sub: `${s.cash_paid_count} حركة كاش صادر`, tone: 'red', icon: 'cash' },
  ]

  return (
    <div className="overview animate-fade" data-project-id={projectId}>
      <div className="overview__kpis">
        {kpis.map((k) => <KpiCard key={k.key} {...k} />)}
      </div>
      <RecentMovements transactions={data.latest_transactions || []} />
    </div>
  )
}
