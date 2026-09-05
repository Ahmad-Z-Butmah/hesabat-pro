import { useMemo } from 'react'
import { formatMoney, formatDateAr } from '../../../utils/format.js'
import './ChecksMonthModal.css'

function daysUntil(iso) {
  return Math.round((new Date(iso) - new Date()) / 86400000)
}

function daysText(iso) {
  const d = daysUntil(iso)
  if (d > 0) return `يتبقى ${d} يوم`
  if (d === 0) return 'يُصرف اليوم'
  return `تأخر ${-d} يوم`
}

function effStatus(t) {
  if (t.type === 'check_in') {
    if (t.status === 'cleared') return 'تم الصرف'
    if (t.status === 'bounced') return 'مرتجع'
    if (t.due_date && new Date(t.due_date) < new Date()) return 'متأخر'
    return 'قيد التحصيل'
  }
  if (t.type === 'check_out') {
    if (t.status === 'cleared') return 'مدفوع'
    if (t.status === 'bounced') return 'مرتجع'
    return 'مستحق'
  }
  return t.status
}

export default function ChecksMonthModal({ tx, onClose, onStatusChange }) {
  const withinMonth = (t) => {
    const d = t.due_date || t.transaction_date
    return d && daysUntil(d) <= 30
  }

  const { recvList, outList, monthCount, problemChecks } = useMemo(() => {
    const recv = tx.filter(
      (t) => t.type === 'check_in' && withinMonth(t) && t.status !== 'bounced' && t.status !== 'cleared'
    )
    const out = tx.filter(
      (t) =>
        t.type === 'check_out' &&
        withinMonth(t) &&
        daysUntil(t.due_date || t.transaction_date) >= -40 &&
        t.status !== 'bounced' &&
        t.status !== 'cleared'
    )
    const problems = tx.filter(
      (t) => (t.type === 'check_in' || t.type === 'check_out') && t.status === 'bounced'
    )
    return {
      recvList: recv,
      outList: out,
      monthCount: recv.length + out.length,
      problemChecks: problems,
    }
  }, [tx])

  const sortedRecv = useMemo(
    () =>
      [...recvList].sort((a, b) => {
        const rank = (t) => (effStatus(t) === 'تم الصرف' ? 2 : effStatus(t) === 'متأخر' ? 0 : 1)
        const ra = rank(a), rb = rank(b)
        return ra !== rb ? ra - rb : daysUntil(a.due_date || a.transaction_date) - daysUntil(b.due_date || b.transaction_date)
      }),
    [recvList]
  )

  const sortedOut = useMemo(
    () =>
      [...outList].sort(
        (a, b) => daysUntil(a.due_date || a.transaction_date) - daysUntil(b.due_date || b.transaction_date)
      ),
    [outList]
  )

  const recvTotal = useMemo(
    () => sortedRecv.filter((t) => effStatus(t) !== 'تم الصرف').reduce((a, b) => a + b.amount, 0),
    [sortedRecv]
  )

  const outTotal = useMemo(
    () => sortedOut.reduce((a, b) => a + b.amount, 0),
    [sortedOut]
  )

  return (
    <div className="cmm" onClick={onClose}>
      <div className="cmm__card" onClick={(e) => e.stopPropagation()}>
        <div className="cmm__head">
          <div className="cmm__head-left">
            <div className="cmm__head-icon">📅</div>
            <div>
              <h2 className="cmm__title">شيكات هذا الشهر</h2>
              <p className="cmm__subtitle">مواعيد الصرف خلال الـ30 يوماً القادمة · تتحدّث تلقائياً نهاية كل شهر</p>
            </div>
          </div>
          <div className="cmm__head-right">
            <div className="cmm__count">
              <div className="cmm__count-val">{monthCount}</div>
              <div className="cmm__count-label">شيك هذا الشهر</div>
            </div>
            <button className="cmm__close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="cmm__body">
          <div className="cmm__cols">
            <div className="cmm__col">
              <div className="cmm__col-head">
                <div className="cmm__col-title"><span className="cmm__col-icon is-green">📥</span><h3>شيكات مستلمة <span>(تحصيل)</span></h3></div>
                <span className="cmm__col-total is-green">{formatMoney(recvTotal)}</span>
              </div>
              <div className="cmm__list">
                {sortedRecv.map((t) => {
                  const status = effStatus(t)
                  const overdue = status === 'متأخر'
                  return (
                    <div key={t.id} className={`cmm-check ${overdue ? 'is-overdue' : ''}`}>
                      <div className="cmm-check__top">
                        <div className="cmm-check__info">
                          <div className="cmm-check__name-row">
                            <span className="cmm-check__name">{t.party_name}</span>
                            <span className={`cmm-check__badge ${overdue ? 'is-overdue' : 'is-pending'}`}>{status}</span>
                          </div>
                          <div className="cmm-check__sub">شيك #{t.check_no} · {t.bank} · من {t.party_name}</div>
                        </div>
                        <div className="cmm-check__amount">{formatMoney(t.amount)}</div>
                      </div>
                      <div className="cmm-check__bottom">
                        <span className="cmm-check__due">📅 {formatDateAr(t.due_date || t.transaction_date)} · {daysText(t.due_date || t.transaction_date)}</span>
                        <div className="cmm-check__actions">
                          <button className="cmm-btn cmm-btn--cash" onClick={() => onStatusChange(t.id, 'cleared')}>✓ تم الصرف</button>
                          <button className="cmm-btn cmm-btn--bounce" onClick={() => onStatusChange(t.id, 'bounced')}>⚠ فيه خلل</button>
                        </div>
                      </div>
                    </div>
                  )
                })}
                {sortedRecv.length === 0 && <div className="cmm-empty">لا شيكات مستلمة هذا الشهر</div>}
              </div>
            </div>

            <div className="cmm__col">
              <div className="cmm__col-head">
                <div className="cmm__col-title"><span className="cmm__col-icon is-red">📤</span><h3>شيكات صادرة <span>(صرف)</span></h3></div>
                <span className="cmm__col-total is-red">{formatMoney(outTotal)}</span>
              </div>
              <div className="cmm__list">
                {sortedOut.map((t) => (
                  <div key={t.id} className="cmm-check">
                    <div className="cmm-check__top">
                      <div className="cmm-check__info">
                        <div className="cmm-check__name-row">
                          <span className="cmm-check__name">{t.party_name}</span>
                          <span className="cmm-check__badge is-pending">{effStatus(t)}</span>
                        </div>
                        <div className="cmm-check__sub">شيك #{t.check_no} · {t.bank}</div>
                      </div>
                      <div className="cmm-check__amount is-red">− {formatMoney(t.amount)}</div>
                    </div>
                    <div className="cmm-check__bottom">
                      <span className="cmm-check__due">📅 {formatDateAr(t.due_date || t.transaction_date)} · {daysText(t.due_date || t.transaction_date)}</span>
                      <button className="cmm-btn cmm-btn--bounce" onClick={() => onStatusChange(t.id, 'bounced')}>⚠ فيه خلل</button>
                    </div>
                  </div>
                ))}
                {sortedOut.length === 0 && <div className="cmm-empty">لا شيكات صادرة هذا الشهر</div>}
              </div>
            </div>
          </div>

          {problemChecks.length > 0 && (
            <div className="cmm-problems">
              <div className="cmm-problems__head">
                <span className="cmm-problems__icon">⚠</span>
                <h3>شيكات مرتجعة / فيها خلل</h3>
                <span className="cmm-problems__count">{problemChecks.length}</span>
              </div>
              <div className="cmm-problems__grid">
                {problemChecks.map((t) => (
                  <div key={t.id} className="cmm-problem">
                    <div className="cmm-problem__icon">🚫</div>
                    <div className="cmm-problem__info">
                      <div className="cmm-problem__title">{t.party_name}</div>
                      <div className="cmm-problem__sub">شيك #{t.check_no} · {t.bank} · {t.type === 'check_in' ? 'مستلم' : 'صادر'}</div>
                    </div>
                    <div className="cmm-problem__side">
                      <div className="cmm-problem__amount">{formatMoney(t.amount)}</div>
                      <button className="cmm-problem__restore" onClick={() => onStatusChange(t.id, 'pending')}>↺ استرجاع</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="cmm-tip">
            <span>💡</span>
            <span>حدّد «تم الصرف» للشيك المستلم عند تحصيله لإضافة قيمته لرصيد الكاش المتوفر. الشيك الذي فات موعده ولم يُصرف يبقى مثبتاً في الأعلى بلون أسود حتى تعالجه.</span>
          </div>
        </div>
      </div>
    </div>
  )
}
