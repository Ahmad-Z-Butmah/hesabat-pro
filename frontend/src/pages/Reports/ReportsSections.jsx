// ============================================================
// مكوّنات عرض فقط لصفحة التقارير — كل القيم تصلها جاهزة كـ props
// من Reports.jsx (الذي يجلب البيانات الحقيقية من الباك-اند)
// ============================================================
import { formatMoney, formatDateAr, toArabicDigits } from '../../utils/format.js'

/* ---------------- خيارات الفترات والفلاتر (قيم حقيقية من الباك-اند) ---------------- */
export const PERIOD_LABELS = [
  { id: 'weekly', label: 'أسبوعي' },
  { id: 'monthly', label: 'شهري' },
  { id: 'yearly', label: 'سنوي' },
]

const STATUS_META = {
  'محصل': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)' },
  'مدفوع': { color: 'var(--brand)', soft: 'var(--brand-soft)' },
  'غير محصل': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
  'مستحق قريباً': { color: 'var(--warn-ink)', soft: 'var(--warn-soft)' },
  'متأخر': { color: '#fff', soft: 'var(--ink)' },
  'مرتجع': { color: 'var(--danger)', soft: 'var(--danger-soft)' },
}
const statusMeta = (s) => STATUS_META[s] || { color: 'var(--slate)', soft: 'var(--canvas)' }

const catMeta = () => ({ color: 'var(--slate)', soft: 'var(--canvas)' })

const METHOD_META = {
  'كاش': { color: 'var(--ok-ink)', soft: 'var(--ok-soft)', icon: '💵' },
  'شيك': { color: 'var(--brand)', soft: 'var(--brand-soft)', icon: '📦' },
}
const methodMeta = (m) => METHOD_META[m] || { color: 'var(--slate)', soft: 'var(--canvas)', icon: '•' }

/* ---------------- شريط تبديل الفترة ---------------- */
export function PeriodToggle({ period, onChange }) {
  return (
    <div className="rep-toggle">
      {PERIOD_LABELS.map((p) => (
        <button key={p.id} className={`rep-toggle__btn ${period === p.id ? 'is-on' : ''}`} onClick={() => onChange(p.id)}>{p.label}</button>
      ))}
    </div>
  )
}

/* ---------------- بطاقات ملخص الفترة (شهري/سنوي) ---------------- */
export function SummaryCards({ stats }) {
  return (
    <div className="rep-section">
      <h3 className="rep-section__title">ملخص الفترة — نقداً وشيكات</h3>
      <div className="rep-stats">
        {stats.map((s, i) => (
          <div key={i} className="rep-stat">
            <div className="rep-stat__icon" style={{ background: s.soft }}>{s.icon}</div>
            <div className="rep-stat__value" style={{ color: s.color }}>{formatMoney(s.value)}</div>
            <div className="rep-stat__label">{s.label}</div>
            <div className="rep-stat__count">{toArabicDigits(s.count)} حركة</div>
          </div>
        ))}
      </div>
    </div>
  )
}

/* ---------------- تحليل ذكي (كتلة كحلية) + توزيع طرق الدفع ---------------- */
export function InsightAndMethods({ periodTitle, insights, methods, methodTotal }) {
  return (
    <div className="rep-insight-grid">
      <div className="rep-insight">
        <div className="rep-insight__head">
          <div className="rep-insight__icon">💡</div>
          <div>
            <div className="rep-insight__eyebrow">تحليل ذكي · {periodTitle}</div>
            <div className="rep-insight__title">قراءة سريعة لحالة السيولة والتحصيل</div>
          </div>
        </div>
        <div className="rep-insight__list">
          {insights.map((i, idx) => (
            <div key={idx} className="rep-insight__item"><span className="rep-insight__dot">{i.icon}</span><span>{i.text}</span></div>
          ))}
        </div>
      </div>

      <div className="rep-card rep-methods">
        <h3 className="rep-methods__title">توزيع حسب طريقة الدفع</h3>
        <p className="rep-methods__sub">حجم الحركات {formatMoney(methodTotal)} — ليست كلها نقداً</p>
        <div className="rep-methods__list">
          {methods.map((m) => (
            <div key={m.label}>
              <div className="rep-methods__row">
                <span><span className="rep-methods__icon" style={{ background: m.soft }}>{m.icon}</span>{m.label}</span>
                <span>{formatMoney(m.amount)} <em>· {toArabicDigits(m.pct)}٪</em></span>
              </div>
              <div className="rep-methods__track"><div style={{ width: `${m.pct}%`, background: m.color }} /></div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

/* ---------------- الرسم البياني الرئيسي ---------------- */
export function MainChart({ title, sub, bars, barW, barGroupGap, showLabels }) {
  if (!bars || bars.length === 0) {
    return (
      <div className="rep-card rep-chart">
        <div className="rep-chart__head">
          <div>
            <h3 className="rep-chart__title">{title}</h3>
            <p className="rep-chart__sub">{sub}</p>
          </div>
        </div>
        <div className="rep-empty">لا توجد بيانات للفترة المحددة</div>
      </div>
    )
  }
  const max = Math.max(1, ...bars.map((b) => Math.max(b.in, b.out)))
  const H = 140
  const toShort = (n) => (n >= 1000 ? `${toArabicDigits(Math.round(n / 1000))} ألف` : toArabicDigits(n))
  return (
    <div className="rep-card rep-chart">
      <div className="rep-chart__head">
        <div>
          <h3 className="rep-chart__title">{title}</h3>
          <p className="rep-chart__sub">{sub}</p>
        </div>
        <div className="rep-chart__legend">
          <span><i style={{ background: 'var(--ok)' }} />مقبوضات</span>
          <span><i style={{ background: 'var(--danger)' }} />مدفوعات</span>
        </div>
      </div>
      <div className="rep-chart__plot" style={{ gap: barGroupGap }}>
        {bars.map((b, i) => (
          <div key={i} className="rep-chart__group">
            <div className="rep-chart__pair">
              <div className="rep-chart__bar-col">
                {showLabels && <span className="rep-chart__lab" style={{ color: 'var(--ok-ink)' }}>{toShort(b.in)}</span>}
                <div className="rep-chart__bar" style={{ width: barW, height: `${Math.max(3, Math.round((b.in / max) * H))}px`, background: 'linear-gradient(#14cf94,#10B981)' }} />
              </div>
              <div className="rep-chart__bar-col">
                {showLabels && <span className="rep-chart__lab" style={{ color: 'var(--danger)' }}>{toShort(b.out)}</span>}
                <div className="rep-chart__bar" style={{ width: barW, height: `${Math.max(3, Math.round((b.out / max) * H))}px`, background: 'linear-gradient(#f36b6b,#EF4444)' }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="rep-chart__labels" style={{ gap: barGroupGap }}>
        {bars.map((b, i) => <div key={i} className="rep-chart__month">{b.label}</div>)}
      </div>
    </div>
  )
}

/* ---------------- جدول الموقف المالي ---------------- */
export function FinancialPositionTable({ metrics, onOpen }) {
  return (
    <div className="rep-section">
      <h3 className="rep-section__title">الموقف المالي — أين أموالي؟ <span>اضغط على أي بند لعرض تفاصيله</span></h3>
      <div className="rep-card rep-table-card">
        <table className="rep-table">
          <thead>
            <tr><th>البند</th><th className="is-center">العدد</th><th className="is-left">القيمة</th><th className="is-center">التفاصيل</th></tr>
          </thead>
          <tbody>
            {metrics.map((m) => (
              <tr key={m.id} className="rep-table__row-click" onClick={() => onOpen(m.id)}>
                <td>
                  <div className="rep-table__lead">
                    <div className="rep-icon" style={{ background: m.soft }}>{m.icon}</div>
                    <div><div className="rep-table__label">{m.label}</div><div className="rep-table__desc">{m.desc}</div></div>
                  </div>
                </td>
                <td className="is-center"><span className="rep-count-pill">{toArabicDigits(m.items.length)}</span></td>
                <td className="is-left rep-table__value" style={{ color: m.color }}>{formatMoney(m.value)}</td>
                <td className="is-center"><span className="rep-link-pill">التفاصيل ›</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- متابعة شيكات الأسبوع ---------------- */
export function WeekChequeTracker({ tracker }) {
  return (
    <div className="rep-section">
      <div className="rep-section__head">
        <h3 className="rep-section__title">شيكات هذا الأسبوع <span>واردة وصادرة — المربع الأحمر = لم يُصرف بعد</span></h3>
        <div className="rep-section__badges">
          <span className="rep-badge-pill is-good">✓ صُرفت هذا الأسبوع: {toArabicDigits(tracker.cashedCount)} شيك · {formatMoney(tracker.cashedValue)}</span>
          <span className="rep-badge-pill is-bad">⏳ واردة بانتظار التحصيل: {toArabicDigits(tracker.pendingCount)} · {formatMoney(tracker.pendingValue)}</span>
        </div>
      </div>
      <div className="rep-card rep-table-card">
        <table className="rep-table">
          <thead>
            <tr><th className="is-center">الحالة</th><th>رقم الشيك</th><th>النوع</th><th>الطرف</th><th>العقار/الوحدة</th><th className="is-left">المبلغ</th><th>التاريخ</th><th className="is-center">الوضع</th></tr>
          </thead>
          <tbody>
            {tracker.rows.length === 0 && (
              <tr><td colSpan={8} className="rep-empty">لا توجد شيكات مرتبطة بهذا الأسبوع</td></tr>
            )}
            {tracker.rows.map((r, i) => {
              const isIn = r.dir === 'in'
              const settled = r.status === 'محصل' || r.status === 'مدفوع'
              const sm = statusMeta(r.status)
              return (
                <tr key={i} className={settled ? 'rep-row--ok' : 'rep-row--warn'}>
                  <td className="is-center"><span className="rep-square" style={{ background: settled ? 'var(--ok)' : 'var(--danger)' }} /></td>
                  <td className="rep-table__strong">#{r.no}</td>
                  <td><span className="rep-dir" style={isIn ? { color: 'var(--ok-ink)', background: 'var(--ok-soft)' } : { color: 'var(--danger)', background: 'var(--danger-soft)' }}>{isIn ? 'وارد' : 'صادر'}</span></td>
                  <td className="rep-table__strong">{r.party}</td>
                  <td className="rep-mut">{r.unit}</td>
                  <td className="is-left rep-table__strong">{formatMoney(r.amount)}</td>
                  <td className="rep-mut">{formatDateAr(r.g)}</td>
                  <td className="is-center"><span className="rep-pill" style={{ color: sm.color, background: sm.soft }}>{r.status}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- دفعات مستحقة قادمة ---------------- */
export function DuePayments({ due }) {
  return (
    <div className="rep-section">
      <div className="rep-section__head">
        <h3 className="rep-section__title">دفعات مستحقة الشهر القادم <span>حركات مجدولة يجب دفعها قريباً</span></h3>
        <span className="rep-badge-pill is-warn">⏳ إجمالي المستحق: {formatMoney(due.total)} · {toArabicDigits(due.count)} دفعة</span>
      </div>
      {due.list.length === 0 ? (
        <div className="rep-card rep-table-card"><div className="rep-empty">لا توجد دفعات مستحقة قادمة</div></div>
      ) : (
      <div className="rep-due-grid">
        {due.list.map((d, i) => {
          const cm = catMeta(d.cat)
          const icon = d.method.includes('شيك') ? '🧾' : d.method.includes('تحويل') ? '🏦' : '💵'
          return (
            <div key={i} className="rep-due-card">
              <div className="rep-icon" style={{ background: cm.soft }}>{icon}</div>
              <div className="rep-due-card__body">
                <div className="rep-due-card__row">
                  <div className="rep-due-card__party">{d.party}</div>
                  <div className="rep-due-card__amount">− {formatMoney(d.amount)}</div>
                </div>
                <div className="rep-due-card__note">{d.note} · {d.unit}</div>
                <div className="rep-due-card__tags">
                  <span className="rep-pill" style={{ color: cm.color, background: cm.soft }}>{d.cat}</span>
                  <span className="rep-pill rep-pill--method">{d.method}</span>
                  {d.attach && <span className="rep-pill rep-pill--attach">📎 مرفق</span>}
                  <span className="rep-pill rep-pill--day">📅 {d.day} {d.date}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>
      )}
    </div>
  )
}

/* ---------------- سجل المستفيدين ---------------- */
export function PaidPartiesLedger({ parties, onOpen }) {
  const palette = ['#2563EB', '#0E2A4E', '#0E9268', '#B4780A', '#8b5cf6', '#EF4444', '#51637A']
  return (
    <div className="rep-section">
      <h3 className="rep-section__title">سجل المستفيدين — لمن دفعت؟ <span>اضغط على أي طرف لعرض سجله المالي الكامل</span></h3>
      <div className="rep-card rep-table-card">
        <table className="rep-table">
          <thead>
            <tr><th>الطرف / الصفة</th><th className="is-center">عدد الحركات</th><th className="is-left">مدفوع بشيكات</th><th className="is-left">مدفوع نقداً/تحويل</th><th className="is-left">الإجمالي المدفوع</th><th className="is-center">السجل</th></tr>
          </thead>
          <tbody>
            {parties.length === 0 && (
              <tr><td colSpan={6} className="rep-empty">لا توجد أطراف بدفعات مسجلة بعد</td></tr>
            )}
            {parties.map((p, i) => (
              <tr key={p.id} className="rep-table__row-click" onClick={() => onOpen(p.id)}>
                <td>
                  <div className="rep-table__lead">
                    <div className="rep-avatar" style={{ background: palette[i % palette.length] }}>{p.name.trim()[0]}</div>
                    <div><div className="rep-table__label">{p.name}</div><div className="rep-table__desc">{p.role}</div></div>
                  </div>
                </td>
                <td className="is-center rep-table__strong">{toArabicDigits(p.count)}</td>
                <td className="is-left" style={{ color: 'var(--brand)', fontWeight: 700 }}>{formatMoney(p.chTotal)}</td>
                <td className="is-left" style={{ color: 'var(--ok-ink)', fontWeight: 700 }}>{formatMoney(p.cashTotal)}</td>
                <td className="is-left rep-table__value" style={{ color: 'var(--navy)' }}>{formatMoney(p.grand)}</td>
                <td className="is-center"><span className="rep-link-pill">عرض السجل ›</span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- شيكات صُرفت خلال الفترة ---------------- */
export function CashedChequesTable({ data, onOpen }) {
  return (
    <div className="rep-section">
      <div className="rep-section__head">
        <h3 className="rep-section__title">الشيكات التي صُرفت خلال الفترة <span>قد تكون صدرت في فترة سابقة — اضغط للتفاصيل</span></h3>
        <span className="rep-badge-pill is-good">✓ صُرف خلال الفترة: {toArabicDigits(data.count)} شيك · {formatMoney(data.total)}</span>
      </div>
      <div className="rep-card rep-table-card">
        <table className="rep-table">
          <thead>
            <tr><th className="is-center">صُرف</th><th>رقم الشيك</th><th>النوع</th><th>الطرف</th><th>تاريخ الإصدار</th><th>تاريخ الصرف</th><th className="is-left">المبلغ</th><th className="is-center">التفاصيل</th></tr>
          </thead>
          <tbody>
            {data.rows.length === 0 && (
              <tr><td colSpan={8} className="rep-empty">لا توجد شيكات صُرفت خلال هذه الفترة</td></tr>
            )}
            {data.rows.map((r, i) => {
              const isIn = r.dir === 'in'
              return (
                <tr key={i} className="rep-table__row-click" onClick={() => onOpen(i)}>
                  <td className="is-center"><span className="rep-square" style={{ background: 'var(--ok)' }} /></td>
                  <td className="rep-table__strong">#{r.no}</td>
                  <td><span className="rep-dir" style={isIn ? { color: 'var(--ok-ink)', background: 'var(--ok-soft)' } : { color: 'var(--danger)', background: 'var(--danger-soft)' }}>{isIn ? 'وارد ← صُرف' : 'صادر ← صُرف'}</span></td>
                  <td className="rep-table__strong">{r.party}</td>
                  <td className="rep-mut">{formatDateAr(r.issued)}</td>
                  <td className="rep-table__strong">{formatDateAr(r.cashed)}</td>
                  <td className="is-left rep-table__value">{formatMoney(r.amount)}</td>
                  <td className="is-center"><span className="rep-pill" style={r.deferred ? { color: 'var(--warn-ink)', background: 'var(--warn-soft)' } : { color: 'var(--ok-ink)', background: 'var(--ok-soft)' }}>{r.deferred ? 'مؤجَّل' : 'ضمن الفترة'}</span></td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- أداء العقارات (شهري) ---------------- */
export function PropertyPerformance({ data }) {
  if (!data || !data.props || data.props.length === 0) {
    return (
      <div className="rep-section">
        <h3 className="rep-section__title">أداء العقارات</h3>
        <div className="rep-card rep-table-card"><div className="rep-empty">لا توجد بيانات للفترة المحددة</div></div>
      </div>
    )
  }
  return (
    <div className="rep-section">
      <h3 className="rep-section__title">أداء العقارات</h3>
      <div className="rep-prop-highlights">
        {data.highlights.map((h, i) => (
          <div key={i} className="rep-card rep-prop-highlight">
            <div className="rep-prop-highlight__head"><span className="rep-icon rep-icon--sm">{h.icon}</span><span>{h.title}</span></div>
            <div className="rep-prop-highlight__name">{h.name}</div>
            <div className="rep-prop-highlight__value" style={{ color: h.color }}>{formatMoney(h.value)}</div>
          </div>
        ))}
      </div>
      <div className="rep-card rep-table-card">
        <table className="rep-table">
          <thead>
            <tr><th>العقار / الوحدة</th><th className="is-left">إجمالي الوارد</th><th className="is-left">إجمالي الصادر</th><th className="is-left">الصافي</th><th className="is-center">نسبة التحصيل</th><th className="is-left">الذمم المتأخرة</th></tr>
          </thead>
          <tbody>
            {data.props.map((p) => (
              <tr key={p.name}>
                <td><div className="rep-table__label">{p.name}</div><div className="rep-table__desc">{p.owner}</div></td>
                <td className="is-left" style={{ color: 'var(--ok-ink)', fontWeight: 700 }}>{formatMoney(p.in)}</td>
                <td className="is-left" style={{ color: 'var(--slate)', fontWeight: 700 }}>{formatMoney(p.out)}</td>
                <td className="is-left rep-table__value" style={{ color: p.net < 0 ? 'var(--danger)' : 'var(--ok-ink)' }}>{p.net < 0 ? '− ' : '+ '}{formatMoney(Math.abs(p.net))}</td>
                <td className="is-center">
                  <div className="rep-rate">
                    <div className="rep-rate__track"><div style={{ width: `${p.rate}%`, background: p.rate >= 85 ? 'var(--ok)' : p.rate >= 65 ? 'var(--warn)' : 'var(--danger)' }} /></div>
                    <span style={{ color: p.rate >= 85 ? 'var(--ok-ink)' : p.rate >= 65 ? 'var(--warn-ink)' : 'var(--danger)' }}>{toArabicDigits(p.rate)}٪</span>
                  </div>
                </td>
                <td className="is-left" style={{ color: p.late > 0 ? 'var(--danger)' : 'var(--muted)', fontWeight: 700 }}>{formatMoney(p.late)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- ربحية السنة (سنوي) ---------------- */
export function ProfitGauge({ data, yearLabel }) {
  const win = data.net >= 0
  const deg = Math.round((Math.min(data.pct, 100) / 100) * 360)
  const gaugeGradient = `conic-gradient(${win ? '#10B981' : '#EF4444'} 0deg ${deg}deg, #EEF2F7 ${deg}deg 360deg)`
  return (
    <div className="rep-section">
      <div className="rep-card rep-profit">
        <div className="rep-profit__head">
          <div>
            <h3 className="rep-profit__title">ربحية المشروع لسنة {yearLabel}</h3>
            <p className="rep-profit__sub">نسبة الربح = (صافي الربح ÷ تكلفة المشروع) × ١٠٠٪</p>
          </div>
          <span className={`rep-profit__badge ${win ? 'is-good' : 'is-bad'}`}>{win ? '▲' : '▼'} {win ? 'رابح' : 'خاسر'}</span>
        </div>
        <div className="rep-profit__grid">
          <div className="rep-gauge-wrap">
            <div className="rep-gauge" style={{ background: gaugeGradient }}>
              <div className="rep-gauge__inner">
                <div className="rep-gauge__pct" style={{ color: win ? 'var(--ok-ink)' : 'var(--danger)' }}>{toArabicDigits(data.pct)}٪</div>
                <div className="rep-gauge__label">نسبة الربح</div>
              </div>
            </div>
          </div>
          <div className="rep-profit__tiles">
            <div className="rep-profit__tile"><span className="rep-icon rep-icon--sm">📦</span><span>تكلفة المشروع</span><b>{formatMoney(data.cost)}</b></div>
            <div className="rep-profit__tile"><span className="rep-icon rep-icon--sm">💰</span><span>إجمالي الإيرادات</span><b style={{ color: 'var(--brand)' }}>{formatMoney(data.rev)}</b></div>
            <div className="rep-profit__tile is-good"><span className="rep-icon rep-icon--sm">📈</span><span>صافي الربح</span><b style={{ color: 'var(--ok-ink)' }}>{formatMoney(data.net)}</b></div>
          </div>
        </div>
      </div>

      <div className="rep-card rep-table-card" style={{ marginTop: 20 }}>
        <div className="rep-quarter__head">الجدول التفصيلي — حسب الربع</div>
        <table className="rep-table">
          <thead><tr><th>الفترة</th><th className="is-left">الإيرادات</th><th className="is-left">التكاليف</th><th className="is-left">صافي الربح</th><th className="is-center">نسبة الربح</th></tr></thead>
          <tbody>
            {data.quarters.map((q, i) => (
              <tr key={i}>
                <td className="rep-table__label">{q.label}</td>
                <td className="is-left" style={{ color: 'var(--brand)', fontWeight: 700 }}>{formatMoney(q.rev)}</td>
                <td className="is-left" style={{ color: 'var(--slate)', fontWeight: 700 }}>{formatMoney(q.cost)}</td>
                <td className="is-left" style={{ color: 'var(--ok-ink)', fontWeight: 800 }}>{formatMoney(q.net)}</td>
                <td className="is-center"><span className="rep-pill" style={q.pct >= 25 ? { color: 'var(--ok-ink)', background: 'var(--ok-soft)' } : { color: 'var(--warn-ink)', background: 'var(--warn-soft)' }}>{toArabicDigits(q.pct)}٪</span></td>
              </tr>
            ))}
            <tr className="rep-quarter__total">
              <td className="rep-table__label">الإجمالي · {yearLabel}</td>
              <td className="is-left" style={{ color: 'var(--brand)', fontWeight: 800 }}>{formatMoney(data.rev)}</td>
              <td className="is-left" style={{ color: 'var(--slate)', fontWeight: 800 }}>{formatMoney(data.cost)}</td>
              <td className="is-left" style={{ color: 'var(--ok-ink)', fontWeight: 900 }}>{formatMoney(data.net)}</td>
              <td className="is-center"><span className="rep-pill" style={{ color: '#fff', background: 'var(--ok-ink)' }}>{toArabicDigits(data.pct)}٪</span></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

/* ---------------- جدول أبرز الحركات (الرئيسي، قابل للتصفية) ---------------- */
export function MainTransactionsTable({ rows, count }) {
  return (
    <div className="rep-card rep-table-card">
      <div className="rep-table-card__head">
        <div>
          <h3 className="rep-table-card__title">أبرز الحركات المالية في الفترة</h3>
          <p className="rep-table-card__sub">حسب عوامل التصفية المحددة أعلى الصفحة</p>
        </div>
        <span className="rep-count-pill">{toArabicDigits(count)} حركة</span>
      </div>
      <table className="rep-table">
        <thead>
          <tr><th>النوع</th><th>العقار/الوحدة</th><th>الطرف/الجهة</th><th>التصنيف</th><th>طريقة الدفع</th><th>التاريخ</th><th className="is-center">الحالة</th><th className="is-left">المبلغ</th></tr>
        </thead>
        <tbody>
          {rows.map((r, i) => {
            const isIn = r.dir === 'in'
            const cm = catMeta(r.cat), sm = statusMeta(r.status), mm = methodMeta(r.method)
            return (
              <tr key={i} className={isIn ? 'rep-row--in' : 'rep-row--out'}>
                <td><span className="rep-dir" style={isIn ? { color: 'var(--ok-ink)', background: 'var(--ok-soft)' } : { color: 'var(--danger)', background: 'var(--danger-soft)' }}>{isIn ? '↙ وارد' : '↗ صادر'}</span></td>
                <td className="rep-mut">{r.unit}</td>
                <td className="rep-table__strong">{r.party}</td>
                <td><span className="rep-pill" style={{ color: cm.color, background: cm.soft }}>{r.cat}</span></td>
                <td><span className="rep-pill rep-pill--method" style={{ color: mm.color, background: mm.soft }}>{r.method}</span></td>
                <td className="rep-mut">{formatDateAr(r.g)}</td>
                <td className="is-center"><span className="rep-pill" style={{ color: sm.color, background: sm.soft }}>{r.status}</span></td>
                <td className="is-left rep-table__value" style={{ color: isIn ? 'var(--ok-ink)' : 'var(--danger)' }}>{isIn ? '+ ' : '− '}{formatMoney(r.amount)}</td>
              </tr>
            )
          })}
          {rows.length === 0 && (
            <tr><td colSpan={8} className="rep-empty">🔍 لا حركات مطابقة لعوامل التصفية — جرّب توسيع الفلاتر أو إعادة تعيينها</td></tr>
          )}
        </tbody>
      </table>
    </div>
  )
}
