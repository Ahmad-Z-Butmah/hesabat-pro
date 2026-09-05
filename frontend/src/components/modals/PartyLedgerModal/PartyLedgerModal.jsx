import { useEffect, useState } from 'react'
import { formatMoney, formatDateAr, formatSignedMoney, toArabicDigits } from '../../../utils/format.js'
import { getPartyTransactions, getTransactionAttachmentBlob } from '../../../utils/api.js'
import './PartyLedgerModal.css'

const TYPE_META = {
  check_in: { label: 'شيك مستلم', color: '#10b981', soft: '#e8f5ee', dir: 'in', icon: '📥' },
  check_out: { label: 'شيك صادر', color: '#ef4444', soft: '#fde8e8', dir: 'out', icon: '📤' },
  cash_in: { label: 'كاش مستلم', color: '#2563eb', soft: '#e8f0fe', dir: 'in', icon: '💵' },
  cash_out: { label: 'كاش صادر', color: '#f59e0b', soft: '#fef3c7', dir: 'out', icon: '💸' },
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

/** السجل المالي الحقيقي لطرف واحد — يُجلب من الباك-اند عبر projectId */
function RealPartyLedger({ party, projectId, onClose }) {
  const [txns, setTxns] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    getPartyTransactions(projectId, party.id)
      .then((rows) => { if (active) setTxns(rows || []) })
      .catch((err) => { if (active) setError(err?.message || 'تعذّر تحميل سجل الطرف') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, party.id])

  const n = (v) => Number(v) || 0
  const net = n(party.net_balance)
  const cashTotal = n(party.cash_received) + n(party.cash_paid)
  const checkTotal = n(party.check_received) + n(party.check_paid)

  const tiles = [
    { label: 'إجمالي الوارد', v: n(party.received_total), c: 'var(--ok-ink)', bg: 'var(--ok-soft)' },
    { label: 'إجمالي الصادر', v: n(party.paid_total), c: 'var(--danger)', bg: 'var(--danger-soft)' },
    { label: 'نقد / تحويل', v: cashTotal, c: 'var(--navy)', bg: '#E8EEF6' },
    { label: 'شيكات', v: checkTotal, c: 'var(--brand)', bg: 'var(--brand-soft)' },
    { label: 'صافي الرصيد', v: net, c: net >= 0 ? 'var(--ok-ink)' : 'var(--danger)', bg: net >= 0 ? 'var(--ok-soft)' : 'var(--danger-soft)' },
  ]

  return (
    <div className="plm" onClick={onClose}>
      <div className="plm__card" onClick={(e) => e.stopPropagation()}>
        <div className="plm__head">
          <div className="plm__head-left">
            <div className="plm__avatar">{(party.name || '?').trim()[0]}</div>
            <div>
              <h2 className="plm__title">{party.name}</h2>
              <p className="plm__subtitle">{party.role || ''} · السجل المالي الكامل</p>
            </div>
          </div>
          <div className="plm__head-right">
            <div className="plm__total"><span>صافي الرصيد</span><b>{formatSignedMoney(net)}</b></div>
            <button className="plm__close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="plm__body">
          <div className="plm__tiles">
            {tiles.map((t, i) => (
              <div key={i} className="plm__tile" style={{ background: t.bg }}>
                <div className="plm__tile-val" style={{ color: t.c }}>{formatMoney(t.v)}</div>
                <div className="plm__tile-lab">{t.label}</div>
              </div>
            ))}
          </div>

          <div className="plm__ledger">
            <div className="plm__ledger-head">
              <h3>السجل المالي</h3>
              <span>{toArabicDigits(txns.length)} حركة</span>
            </div>

            {loading && <div className="plm__empty">جارٍ تحميل حركات الطرف…</div>}

            {!loading && error && <div className="plm__empty plm__empty--error">{error}</div>}

            {!loading && !error && txns.length === 0 && (
              <div className="plm__empty">لا حركات مالية مسجلة لهذا الطرف بعد</div>
            )}

            {!loading && !error && txns.length > 0 && (
              <div className="plm__txn-list">
                {txns.map((t) => {
                  const tm = TYPE_META[t.type] || TYPE_META.cash_in
                  const st = getStatusMeta(t)
                  const isIn = tm.dir === 'in'
                  return (
                    <div key={t.id} className="plm__txn">
                      <div className="plm__txn-icon" style={{ background: tm.soft }}>{tm.icon}</div>
                      <div className="plm__txn-main">
                        <div className="plm__txn-row1">
                          <span className="plm__txn-title">{tm.label}</span>
                          <span className="plm__txn-amount" style={{ color: isIn ? 'var(--ok-ink)' : 'var(--danger)' }}>
                            {isIn ? '+ ' : '− '}{formatMoney(n(t.amount))}
                          </span>
                        </div>
                        <div className="plm__txn-tags">
                          <span className="plm__txn-tag" style={{ color: st.color, background: st.soft }}>{st.label}</span>
                          {t.check_no && <span className="plm__txn-tag">شيك #{t.check_no}</span>}
                          {t.bank && <span className="plm__txn-tag">{t.bank}</span>}
                          <span className="plm__txn-tag">📅 {formatDateAr(t.transaction_date)}</span>
                        </div>
                        {t.note && <div className="plm__txn-note">{t.note}</div>}
                        {t.attachments && t.attachments.length > 0 && (
                          <div className="plm__txn-att">
                            {t.attachments.map((a) => (
                              <button key={a.id} type="button" className="plm__txn-att-btn" onClick={() => downloadAttachment(t.id, a)}>
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

function ChequeRow({ c }) {
  return (
    <div className="plm__chq-row" style={{ borderColor: c.cashed ? '#bfe9d4' : '#f6c9c9' }}>
      <span className="plm__chq-square" style={{ background: c.cashed ? 'var(--ok)' : 'var(--danger)' }} />
      <div className="plm__chq-main">
        <div className="plm__chq-no">شيك #{c.no}</div>
        <div className="plm__chq-date">{c.cashed ? 'صُرف بتاريخ ' : 'مستحق بتاريخ '}{formatDateAr(c.g)}</div>
      </div>
      <div className="plm__chq-side">
        <div className="plm__chq-amount">{formatMoney(c.amount)}</div>
        <span className="plm__chq-badge" style={{ color: c.cashed ? 'var(--ok-ink)' : 'var(--danger)', background: c.cashed ? 'var(--ok-soft)' : 'var(--danger-soft)' }}>
          {c.cashed ? 'مصروف' : 'غير مصروف'}
        </span>
      </div>
    </div>
  )
}

/** السجل المالي الكامل لطرف واحد (مقاول/مورد/عميل) — شيكاته ونقده مجموعَين (نمط قديم يستخدمه التقارير) */
function LegacyPartyLedger({ party, onClose }) {
  const uncashed = party.cheques.filter((c) => !c.cashed)
  const cashed = party.cheques.filter((c) => c.cashed)
  const tiles = [
    { label: 'إجمالي الشيكات', v: party.chTotal, c: 'var(--brand)', bg: 'var(--brand-soft)' },
    { label: 'منها مصروفة', v: party.chCashed, c: 'var(--ok-ink)', bg: 'var(--ok-soft)' },
    { label: 'غير مصروفة', v: party.chUncashed, c: 'var(--danger)', bg: 'var(--danger-soft)' },
    { label: 'نقد وتحويل', v: party.cashTotal, c: 'var(--navy)', bg: '#E8EEF6' },
    { label: 'الإجمالي المدفوع', v: party.grand, c: 'var(--ink)', bg: 'var(--line-2)' },
  ]

  return (
    <div className="plm" onClick={onClose}>
      <div className="plm__card" onClick={(e) => e.stopPropagation()}>
        <div className="plm__head">
          <div className="plm__head-left">
            <div className="plm__avatar">{party.name.trim()[0]}</div>
            <div>
              <h2 className="plm__title">{party.name}</h2>
              <p className="plm__subtitle">{party.role} · السجل المالي الكامل</p>
            </div>
          </div>
          <div className="plm__head-right">
            <div className="plm__total"><span>الإجمالي المدفوع</span><b>{formatMoney(party.grand)}</b></div>
            <button className="plm__close" onClick={onClose}>×</button>
          </div>
        </div>

        <div className="plm__body">
          <div className="plm__tiles">
            {tiles.map((t, i) => (
              <div key={i} className="plm__tile" style={{ background: t.bg }}>
                <div className="plm__tile-val" style={{ color: t.c }}>{formatMoney(t.v)}</div>
                <div className="plm__tile-lab">{t.label}</div>
              </div>
            ))}
          </div>

          <div className="plm__cols">
            <div className="plm__col">
              <div className="plm__col-head"><h3>الشيكات</h3><span>{party.cheques.length} شيك</span></div>
              {uncashed.length > 0 && (
                <>
                  <div className="plm__group-lab is-bad"><span />غير مصروفة (مستحقة)</div>
                  <div className="plm__chq-list">{uncashed.map((c, i) => <ChequeRow key={i} c={c} />)}</div>
                </>
              )}
              {cashed.length > 0 && (
                <>
                  <div className="plm__group-lab is-good"><span />مصروفة</div>
                  <div className="plm__chq-list">{cashed.map((c, i) => <ChequeRow key={i} c={c} />)}</div>
                </>
              )}
              {party.cheques.length === 0 && <div className="plm__empty">لا شيكات لهذا الطرف</div>}
            </div>

            <div className="plm__col">
              <div className="plm__col-head"><h3>النقد والتحويل</h3><span>{party.cashTxns.length} حركة</span></div>
              {party.cashTxns.length === 0 ? (
                <div className="plm__empty">لا دفعات نقدية لهذا الطرف — الدفع بالشيكات فقط</div>
              ) : (
                <div className="plm__cash-list">
                  {party.cashTxns.map((c, i) => (
                    <div key={i} className="plm__cash-row">
                      <span className="plm__cash-icon">{c.method === 'transfer' ? '🏦' : '💵'}</span>
                      <div className="plm__cash-main">
                        <div className="plm__cash-method">{c.method === 'transfer' ? 'تحويل بنكي' : 'نقداً'}</div>
                        <div className="plm__cash-date">بتاريخ {formatDateAr(c.g)}</div>
                      </div>
                      <div className="plm__cash-amount">{formatMoney(c.amount)}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

/** عند تمرير projectId يُعرض السجل الحقيقي من الباك-اند، وإلا النمط القديم (للتوافق مع التقارير) */
export default function PartyLedgerModal({ party, onClose, projectId }) {
  if (projectId) {
    return <RealPartyLedger party={party} projectId={projectId} onClose={onClose} />
  }
  return <LegacyPartyLedger party={party} onClose={onClose} />
}
