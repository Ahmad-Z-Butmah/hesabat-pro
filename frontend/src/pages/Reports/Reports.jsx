import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import { useEffect, useMemo, useState } from 'react'
import { getProjectReports, getPartiesSummary } from '../../utils/api.js'
import { toArabicDigits, formatMoney, formatDateAr } from '../../utils/format.js'
import { Printer } from '../../components/icons/Icons.jsx'
import Button from '../../components/ui/Button/Button.jsx'
import PositionDetailModal from '../../components/modals/PositionDetailModal/PositionDetailModal.jsx'
import PartyLedgerModal from '../../components/modals/PartyLedgerModal/PartyLedgerModal.jsx'
import ChequeDetailModal from '../../components/modals/ChequeDetailModal/ChequeDetailModal.jsx'
import {
  PeriodToggle, SummaryCards, InsightAndMethods, MainChart,
  FinancialPositionTable, WeekChequeTracker, DuePayments, PaidPartiesLedger,
  CashedChequesTable, PropertyPerformance, ProfitGauge, MainTransactionsTable,
} from './ReportsSections.jsx'
import './Reports.css'

const todayAr = new Date().toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' })
const n = (v) => Number(v) || 0

const STAT_META = [
  { icon: '📥', color: 'var(--ok-ink)', soft: 'var(--ok-soft)' },
  { icon: '📤', color: 'var(--danger)', soft: 'var(--danger-soft)' },
  { icon: '📦', color: 'var(--brand)', soft: 'var(--brand-soft)' },
  { icon: '🧾', color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
]

const METHOD_META = {
  'كاش': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)', icon: '💵' },
  'شيك': { color: 'var(--brand)', soft: 'var(--brand-soft)', icon: '📦' },
}

const POSITION_META = {
  in: { icon: '📥', color: 'var(--ok-ink)', soft: 'var(--ok-soft)' },
  out: { icon: '📤', color: 'var(--danger)', soft: 'var(--danger-soft)' },
  cash: { icon: '💵', color: 'var(--navy)', soft: 'var(--brand-soft)' },
  held: { icon: '📦', color: 'var(--brand)', soft: 'var(--brand-soft)' },
  owed: { icon: '⏳', color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
}

const CHART_META = {
  weekly: { title: 'مقبوضات مقابل مدفوعات — توزيع يومي', sub: 'حركة الأموال عبر أيام الأسبوع' },
  monthly: { title: 'مقبوضات مقابل مدفوعات — أسابيع الشهر', sub: 'تجميع الحركات لكل أسبوع من الشهر' },
  yearly: { title: 'الإيرادات مقابل التكاليف — عبر أشهر السنة', sub: 'تجميع الإيرادات والتكاليف لكل شهر' },
}

const INSIGHT_TEXT = {
  net_positive: (a) => `صافي الفترة إيجابي (${formatMoney(a)}) — الوارد يتجاوز الصادر، والوضع المالي مستقر.`,
  net_negative: (a) => `صافي الفترة سالب (−${formatMoney(Math.abs(a))}) — الصادر تجاوز الوارد. راجع تأجيل ما يمكن تأجيله من الشيكات المستحقة.`,
  top_out: (a, p) => `أعلى صرف كان لـ ${p || 'جهة ما'} بقيمة ${formatMoney(a)} — قد يضغط على السيولة.`,
  top_in: (a, p) => `أعلى قبض جاء من ${p || 'جهة ما'} بقيمة ${formatMoney(a)} — تابع باقي التحصيلات القادمة.`,
  empty: () => 'لا توجد حركات مالية في هذه الفترة لعرض قراءة تحليلية.',
}

function getPeriodTitle(period) {
  if (period === 'weekly') return 'هذا الأسبوع'
  if (period === 'yearly') return `سنة ${toArabicDigits(new Date().getFullYear())}`
  return new Date().toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })
}

export default function Reports() {
  const { projectId } = useCurrentProject()
  const [period, setPeriod] = useState('monthly')
  const [posOpenId, setPosOpenId] = useState(null)
  const [partyOpenId, setPartyOpenId] = useState(null)
  const [chqOpenIdx, setChqOpenIdx] = useState(null)
  const [report, setReport] = useState(null)
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const isWeekly = period === 'weekly'
  const isMonthly = period === 'monthly'
  const isYearly = period === 'yearly'
  const isMonthOrYear = !isWeekly
  const showDue = !isYearly

  useEffect(() => {
    if (!projectId) return
    let active = true
    setLoading(true)
    setError('')
    getProjectReports(projectId, { period })
      .then((data) => { if (active) setReport(data) })
      .catch((err) => { if (active) setError(err?.message || 'تعذّر تحميل التقارير') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, period])

  useEffect(() => {
    if (!projectId) return
    let active = true
    getPartiesSummary(projectId)
      .then((rows) => { if (active) setParties(rows || []) })
      .catch(() => { if (active) setParties([]) })
    return () => { active = false }
  }, [projectId])

  const rowsAll = report?.rows || []

  const periodStats = (report?.summary || []).map((s, i) => ({
    ...STAT_META[i % STAT_META.length],
    label: s.label,
    value: n(s.value),
    count: s.count,
  }))

  const methodBreakdown = {
    methods: (report?.methods || []).map((m) => ({ ...METHOD_META[m.label], label: m.label, amount: n(m.amount), pct: m.pct })),
    total: n(report?.methods_total),
  }

  const chart = useMemo(() => {
    const bars = (report?.bars || []).map((b) => ({ label: b.label, in: n(b.income), out: n(b.expense) }))
    const many = bars.length > 8
    return {
      bars,
      barW: many ? '15px' : bars.length > 5 ? '22px' : '30px',
      barGroupGap: many ? '6px' : '14px',
      showLabels: bars.length <= 7,
    }
  }, [report])

  const positionMetrics = (report?.position || []).map((m) => ({
    ...POSITION_META[m.id],
    id: m.id,
    label: m.label,
    desc: m.desc,
    value: n(m.value),
    items: m.items || [],
  }))

  const weekTracker = report?.week_tracker
    ? {
        rows: report.week_tracker.rows || [],
        cashedCount: report.week_tracker.cashed_count,
        cashedValue: n(report.week_tracker.cashed_value),
        pendingCount: report.week_tracker.pending_count,
        pendingValue: n(report.week_tracker.pending_value),
      }
    : { rows: [], cashedCount: 0, cashedValue: 0, pendingCount: 0, pendingValue: 0 }

  const due = {
    list: (report?.due_payments || []).map((d) => ({ ...d, date: formatDateAr(d.due_date) })),
    total: n(report?.due_total),
    count: report?.due_count || 0,
  }

  const cashedDuring = report?.cashed_cheques
    ? {
        rows: report.cashed_cheques.rows || [],
        count: report.cashed_cheques.count,
        total: n(report.cashed_cheques.total),
      }
    : { rows: [], count: 0, total: 0 }

  const partiesLedger = useMemo(() => {
    return (parties || [])
      .filter((p) => n(p.paid_total) > 0)
      .map((p) => ({
        id: p.id,
        name: p.name,
        role: p.role || '',
        count: p.transaction_count,
        chTotal: n(p.check_paid),
        cashTotal: n(p.cash_paid),
        grand: n(p.paid_total),
        net_balance: n(p.net_balance),
        received_total: n(p.received_total),
        paid_total: n(p.paid_total),
        cash_received: n(p.cash_received),
        cash_paid: n(p.cash_paid),
        check_received: n(p.check_received),
        check_paid: n(p.check_paid),
      }))
      .sort((a, b) => b.grand - a.grand)
  }, [parties])

  const insights = (report?.insights || []).map((ins) => {
    const build = INSIGHT_TEXT[ins.kind]
    return { icon: ins.icon, tone: ins.tone, text: build ? build(n(ins.amount), ins.party) : ins.text }
  })

  const propPerf = isMonthly ? (report?.property_performance || { props: [], highlights: [] }) : null
  const yearlyProfit = isYearly ? (report?.yearly_profit || null) : null

  const posDetail = posOpenId ? positionMetrics.find((m) => m.id === posOpenId) : null
  const partyDetail = partyOpenId ? partiesLedger.find((p) => p.id === partyOpenId) : null
  const chqDetail = chqOpenIdx != null ? cashedDuring.rows[chqOpenIdx] : null

  const periodTitle = getPeriodTitle(period)

  if (loading && !report) {
    return (
      <div className="rep animate-fade">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>جاري تحميل التقارير...</div>
      </div>
    )
  }

  if (error && !report) {
    return (
      <div className="rep animate-fade">
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--danger)', fontWeight: 700 }}>{error}</div>
      </div>
    )
  }

  return (
    <div className="rep animate-fade" data-project-id={projectId}>
      <div className="rep__head">
        <div>
          <h2 className="rep__title">التقارير</h2>
          <p className="rep__sub">أداء المشروع المالي بلمحة — مقبوضات، مدفوعات، شيكات، وربحية العقارات</p>
        </div>
        <div className="rep__head-tools no-print">
          <div className="rep__count">📄 عدد الحركات <b>{toArabicDigits(rowsAll.length)}</b></div>
          <PeriodToggle period={period} onChange={setPeriod} />
          <Button variant="primary" size="sm" iconLeft={<Printer size={16} />} onClick={() => window.print()}>
            تصدير PDF / طباعة
          </Button>
        </div>
      </div>

      {/* يظهر فقط عند الطباعة/التصدير — يمنح التقرير سياقاً بدل عناصر التحكم التفاعلية */}
      <div className="print-only rep__print-context">
        <span>الفترة: {periodTitle}</span>
        <span>تاريخ إنشاء التقرير: {todayAr}</span>
      </div>

      {isMonthOrYear && <SummaryCards stats={periodStats} />}

      {isMonthOrYear && (
        <InsightAndMethods
          periodTitle={periodTitle}
          insights={insights}
          methods={methodBreakdown.methods}
          methodTotal={methodBreakdown.total}
        />
      )}

      <MainChart
        title={CHART_META[period].title}
        sub={CHART_META[period].sub}
        bars={chart.bars}
        barW={chart.barW}
        barGroupGap={chart.barGroupGap}
        showLabels={chart.showLabels}
      />

      <FinancialPositionTable metrics={positionMetrics} onOpen={setPosOpenId} />

      {isWeekly && <WeekChequeTracker tracker={weekTracker} />}
      {showDue && <DuePayments due={due} />}

      <PaidPartiesLedger parties={partiesLedger} onOpen={setPartyOpenId} />

      {isMonthOrYear && <CashedChequesTable data={cashedDuring} onOpen={setChqOpenIdx} />}
      {isMonthly && propPerf && <PropertyPerformance data={propPerf} />}
      {isYearly && yearlyProfit && <ProfitGauge data={yearlyProfit} yearLabel={toArabicDigits(new Date().getFullYear())} />}

      <MainTransactionsTable rows={rowsAll} count={rowsAll.length} />

      {posDetail && <PositionDetailModal detail={posDetail} onClose={() => setPosOpenId(null)} />}
      {partyDetail && <PartyLedgerModal party={partyDetail} projectId={projectId} onClose={() => setPartyOpenId(null)} />}
      {chqDetail && <ChequeDetailModal cheque={chqDetail} onClose={() => setChqOpenIdx(null)} />}
    </div>
  )
}
