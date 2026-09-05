import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import { Plus } from '../../components/icons/Icons.jsx'
import Button from '../../components/ui/Button/Button.jsx'
import { formatCurrency, formatDateAr } from '../../utils/format.js'
import AddTransactionView from './AddTransactionView.jsx'
import {
  listProjectTransactions,
  getFinanceSummary,
  updateTransaction,
  deleteTransactionApi,
  getTransactionAttachmentBlob,
} from '../../utils/api.js'
import './Finance.css'

const TYPE_META = {
  check_in: { label: 'شيك مستلم', color: '#10b981', soft: '#e8f5ee', dir: 'in', icon: '📥' },
  check_out: { label: 'شيك صادر', color: '#ef4444', soft: '#fde8e8', dir: 'out', icon: '📤' },
  cash_in: { label: 'كاش مستلم', color: '#2563eb', soft: '#e8f0fe', dir: 'in', icon: '💵' },
  cash_out: { label: 'كاش صادر', color: '#f59e0b', soft: '#fef3c7', dir: 'out', icon: '💸' },
}

const FINANCE_FILTERS = [
  { id: 'all', label: 'الكل' },
  { id: 'cash_in', label: 'كاش مستلم' },
  { id: 'cash_out', label: 'كاش صادر' },
  { id: 'check_in', label: 'شيك مستلم' },
  { id: 'check_out', label: 'شيك صادر' },
]

function getStatusMeta(t) {
  if (t.status === 'cleared') {
    if (t.type === 'cash_in') return { label: 'مقبوض', color: '#10b981', soft: '#e8f5ee' }
    if (t.type === 'check_in') return { label: 'تم الصرف', color: '#10b981', soft: '#e8f5ee' }
    return { label: 'مدفوع', color: '#2563eb', soft: '#e8f0fe' }
  }
  if (t.status === 'bounced') return { label: 'مرتجع', color: '#ef4444', soft: '#fde8e8' }
  if (t.type === 'check_in') {
    const overdue = t.due_date && new Date(t.due_date) < new Date()
    return { label: overdue ? 'متأخر' : 'قيد التحصيل', color: '#f59e0b', soft: '#fef3c7' }
  }
  return { label: 'مستحق', color: '#f59e0b', soft: '#fef3c7' }
}

export default function Finance() {
  const { projectId } = useCurrentProject()
  const [transactions, setTransactions] = useState([])
  const [summary, setSummary] = useState(null)
  const [summaryLoading, setSummaryLoading] = useState(false)
  const [view, setView] = useState('list')
  const [filter, setFilter] = useState('all')
  const [loading, setLoading] = useState(false)
  const [actionMenu, setActionMenu] = useState(null)
  const [detailTx, setDetailTx] = useState(null)
  const [attachTx, setAttachTx] = useState(null)
  const [attachBlobs, setAttachBlobs] = useState({})
  const [previewAtt, setPreviewAtt] = useState(null)
  const [linkWarn, setLinkWarn] = useState(null)
  const objectUrlsRef = useRef([])
  const menuRef = useRef(null)

  const fetchTransactions = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    listProjectTransactions(projectId)
      .then((results) => setTransactions(results || []))
      .catch(() => setTransactions([]))
      .finally(() => setLoading(false))
  }, [projectId])

  const fetchSummary = useCallback(() => {
    if (!projectId) return
    setSummaryLoading(true)
    getFinanceSummary(projectId)
      .then(setSummary)
      .catch(() => setSummary(null))
      .finally(() => setSummaryLoading(false))
  }, [projectId])

  useEffect(() => {
    fetchTransactions()
    fetchSummary()
  }, [fetchTransactions, fetchSummary])

  useEffect(() => {
    if (!actionMenu) return
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setActionMenu(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [actionMenu])

  useEffect(() => {
    objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url))
    objectUrlsRef.current = []
    setAttachBlobs({})
    setPreviewAtt(null)

    if (!attachTx || !attachTx.attachments || attachTx.attachments.length === 0) return

    let cancelled = false

    attachTx.attachments.forEach((att) => {
      setAttachBlobs((prev) => ({ ...prev, [att.id]: { loading: true, objectUrl: null, error: null } }))
      getTransactionAttachmentBlob(attachTx.id, att.id)
        .then((blob) => {
          if (cancelled) { URL.revokeObjectURL(URL.createObjectURL(blob)); return }
          const url = URL.createObjectURL(blob)
          objectUrlsRef.current.push(url)
          setAttachBlobs((prev) => ({ ...prev, [att.id]: { loading: false, objectUrl: url, error: null } }))
        })
        .catch((err) => {
          if (cancelled) return
          const msg =
            err.status === 401
              ? 'انتهت جلسة تسجيل الدخول، يرجى تسجيل الدخول مرة أخرى'
              : err.status === 403
                ? 'لا تملك صلاحية عرض هذا المرفق'
                : err.status === 404
                  ? 'المرفق غير موجود'
                  : 'تعذّر تحميل المرفق'
          setAttachBlobs((prev) => ({ ...prev, [att.id]: { loading: false, objectUrl: null, error: msg } }))
        })
    })

    return () => { cancelled = true }
  }, [attachTx])

  const filteredTx = useMemo(() => {
    let rows = transactions
    if (filter !== 'all') rows = rows.filter((t) => t.type === filter)
    return rows
  }, [transactions, filter])

  const { filteredIn, filteredOut } = useMemo(() => {
    let fin = 0, fout = 0
    filteredTx.forEach((t) => {
      if (t.type === 'cash_in' || t.type === 'check_in') fin += Number(t.amount)
      else fout += Number(t.amount)
    })
    return { filteredIn: fin, filteredOut: fout }
  }, [filteredTx])

  const handleStatusChange = async (id, newStatus) => {
    try {
      await updateTransaction(id, { status: newStatus })
      setActionMenu(null)
      fetchTransactions()
      fetchSummary()
    } catch (err) {
      alert(err.message || 'فشل تغيير الحالة')
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الحركة المالية؟')) return
    try {
      await deleteTransactionApi(id)
      setActionMenu(null)
      fetchTransactions()
      fetchSummary()
    } catch (err) {
      if (err.status === 409 && err.detail?.code === 'TRANSACTION_HAS_LINKED_RECORDS') {
        setLinkWarn({ detail: err.detail })
        return
      }
      alert(err.message || 'فشل الحذف')
    }
  }

  const openLinkedDetail = (linked) => {
    const full = transactions.find((t) => t.id === linked.id)
    setDetailTx(full || linked)
    setLinkWarn(null)
  }

  const handleSaved = () => {
    fetchTransactions()
    fetchSummary()
    setView('list')
  }

  if (view === 'add') {
    return (
      <AddTransactionView
        onBack={() => setView('list')}
        onSave={handleSaved}
        cashOnHand={summary?.available_cash ?? null}
        cashOnHandLoading={summaryLoading}
      />
    )
  }

  if (!summary) {
    return (
      <div className="fin animate-fade">
        <div className="fin__loading" style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          جاري تحميل البيانات...
        </div>
      </div>
    )
  }

  const kpiDefs = [
    {
      icon: '💵', color: '#10b981', soft: '#e8f5ee',
      value: summary.available_cash,
      label: 'الكاش المتوفر فعلاً',
      hint: 'نقد + شيكات تم صرفها',
    },
    {
      icon: '📦', color: '#2563eb', soft: '#e8f0fe',
      value: summary.pending_checks,
      label: 'شيكات بحوزتك (لم تُصرف)',
      hint: `${summary.pending_count} شيكات مستلمة بحوزتك`,
    },
    {
      icon: '📅', color: '#f59e0b', soft: '#fef3c7',
      value: summary.month_check_value,
      label: 'شيكات هذا الشهر',
      hint: `${summary.month_check_count} شيك مستحق هذا الشهر`,
    },
  ]

  return (
    <div className="fin animate-fade" data-project-id={projectId}>
      <div className="fin__kpis">
        {kpiDefs.map((k, i) => (
          <div key={i} className="fin-kpi">
            <div className="fin-kpi__icon" style={{ background: k.soft, color: k.color }}>{k.icon}</div>
            <div className="fin-kpi__value" style={{ color: k.color }}>{formatCurrency(k.value, { signed: k.value < 0 })}</div>
            <div className="fin-kpi__label">{k.label}</div>
            <div className="fin-kpi__hint">{k.hint}</div>
          </div>
        ))}
      </div>

      <div className="fin-card fin-table-card">
        <div className="fin-table__head">
          <div>
            <h2 className="fin-table__title">الحركات المالية</h2>
            <p className="fin-table__sub">
              {loading
                ? 'جاري تحميل الحركات...'
                : <>{filteredTx.length} حركة  •  وارد: <span className="fin-sub-in">{formatCurrency(filteredIn, { signed: true })}</span>  •  صادر: <span className="fin-sub-out">{formatCurrency(-filteredOut, { signed: true })}</span></>}
            </p>
          </div>
          <div className="fin-table__tools">
            <Button variant="primary" iconLeft={<Plus size={16} />} onClick={() => setView('add')}>إضافة حركة مالية</Button>
          </div>
        </div>

        <div className="fin-chips">
          {FINANCE_FILTERS.map((f) => {
            const on = filter === f.id
            const count = f.id === 'all' ? transactions.length : transactions.filter((t) => t.type === f.id).length
            return (
              <div key={f.id} className={`fin-chip ${on ? 'is-on' : ''}`} onClick={() => setFilter(f.id)}>
                {f.label} <span className="fin-chip__count">{count}</span>
              </div>
            )
          })}
        </div>

        <div className="fin-table-wrap">
          <table className="fin-table">
            <thead>
              <tr>
                <th className="is-center fin-index-col">#</th><th>النوع</th><th>الاتجاه</th><th>الطرف / صاحب الشيك</th><th>المبلغ</th>
                <th>الطريقة</th><th>تاريخ الاستحقاق / الصرف</th>
                <th className="is-center">الحالة</th><th className="is-center">مرفق</th><th className="is-center">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {filteredTx.map((t) => {
                const tm = TYPE_META[t.type]
                const isIn = tm.dir === 'in'
                const isCheck = t.type === 'check_in' || t.type === 'check_out'
                const sm = getStatusMeta(t)
                return (
                  <tr
                    key={t.id}
                    className={`fin-row ${isIn ? 'fin-row--in' : 'fin-row--out'}`}
                    onClick={() => setDetailTx(t)}
                  >
                    <td className="is-center fin-index">TX{String(t.sequence_number).padStart(2, '0')}</td>
                    <td><span className="fin-type-badge" style={{ color: tm.color, background: tm.soft }}>{tm.label}</span></td>
                    <td><span className={`fin-dir ${isIn ? 'is-in' : 'is-out'}`}>{isIn ? '↙' : '↗'} {isIn ? 'وارد' : 'صادر'}</span></td>
                    <td>
                      <div className="fin-party">{t.party_name || (t.party_id ? `طرف #${t.party_id}` : '—')}</div>
                      {isCheck && t.check_no && <div className="fin-owner">شيك #{t.check_no}</div>}
                    </td>
                    <td className={isIn ? 'fin-amt is-pos' : 'fin-amt is-neg'}>{isIn ? '+ ' : '− '}{formatCurrency(t.amount)}</td>
                    <td className="fin-mut">{isCheck ? `شيك #${t.check_no || '—'}` : (t.method === 'transfer' ? 'تحويل' : 'نقداً')}</td>
                    <td className="fin-mut">{formatDateAr(t.transaction_date)}</td>
                    <td className="is-center"><span className="fin-status" style={{ color: sm.color, background: sm.soft }}>{sm.label}</span></td>
                    <td className="is-center" onClick={(e) => e.stopPropagation()}>
                      {(t.attachments && t.attachments.length > 0) ? (
                        <span className="fin-attach has" onClick={() => setAttachTx(t)}>📎</span>
                      ) : (
                        <span className="fin-attach">—</span>
                      )}
                    </td>
                    <td className="is-center" style={{ position: 'relative' }} onClick={(e) => e.stopPropagation()}>
                      <span className="fin-dots" onClick={(e) => { e.stopPropagation(); setActionMenu(actionMenu === t.id ? null : t.id) }}>⋮</span>
                      {actionMenu === t.id && (
                        <div className="fin-action-menu" ref={menuRef}>
                          <button className="fin-action-item" onClick={() => { setDetailTx(t); setActionMenu(null) }}>📋 تفاصيل</button>
                          {t.status === 'pending' && (
                            <>
                              <button className="fin-action-item" onClick={() => handleStatusChange(t.id, 'cleared')}>
                                ✓ {t.type === 'check_in' ? 'تم الصرف' : 'تم الدفع'}
                              </button>
                              <button className="fin-action-item" onClick={() => handleStatusChange(t.id, 'bounced')}>
                                ⚠ مرتجع
                              </button>
                            </>
                          )}
                          {t.status === 'bounced' && (
                            <button className="fin-action-item" onClick={() => handleStatusChange(t.id, 'pending')}>
                              ↺ استرجاع
                            </button>
                          )}
                          <button className="fin-action-item fin-action-item--danger" onClick={() => { setActionMenu(null); handleDelete(t.id) }}>
                            🗑 حذف
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })}
              {filteredTx.length === 0 && (
                <tr><td colSpan={10} className="fin-empty">لا توجد حركات مطابقة</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {detailTx && (
        <div className="fin-overlay" onClick={() => setDetailTx(null)}>
          <div className="fin-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal__close" onClick={() => setDetailTx(null)}>×</button>
            <h3 className="fin-modal__title">تفاصيل الحركة المالية</h3>
            <div className="fin-modal__grid">
              <div><span className="fin-modal__label">النوع</span><span>{TYPE_META[detailTx.type]?.label || detailTx.type}</span></div>
              <div><span className="fin-modal__label">الاتجاه</span><span>{detailTx.type?.includes('in') ? 'وارد' : 'صادر'}</span></div>
              <div><span className="fin-modal__label">المبلغ</span><span style={{ color: detailTx.type?.includes('in') ? '#10b981' : '#ef4444', fontWeight: 800 }}>
                {formatCurrency(detailTx.amount, { signed: true })}
              </span></div>
              <div><span className="fin-modal__label">تاريخ الحركة</span><span>{detailTx.transaction_date ? formatDateAr(detailTx.transaction_date) : '—'}</span></div>
              <div><span className="fin-modal__label">الطرف</span><span>{detailTx.party_name || (detailTx.party_id ? `طرف #${detailTx.party_id}` : '—')}</span></div>
              <div><span className="fin-modal__label">رقم الطرف</span><span>{detailTx.party_id || '—'}</span></div>
              <div><span className="fin-modal__label">الطريقة</span><span>{detailTx.type?.includes('check') ? 'شيك' : (detailTx.method === 'transfer' ? 'تحويل' : 'نقداً')}</span></div>
              <div><span className="fin-modal__label">الحالة</span><span>{getStatusMeta(detailTx).label}</span></div>
              {detailTx.check_no && <div><span className="fin-modal__label">رقم الشيك</span><span>{detailTx.check_no}</span></div>}
              {detailTx.bank && <div><span className="fin-modal__label">البنك</span><span>{detailTx.bank}</span></div>}
              {detailTx.branch && <div><span className="fin-modal__label">الفرع</span><span>{detailTx.branch}</span></div>}
              {detailTx.due_date && <div><span className="fin-modal__label">تاريخ الاستحقاق</span><span>{formatDateAr(detailTx.due_date)}</span></div>}
              {detailTx.note && <div style={{ gridColumn: '1/-1' }}><span className="fin-modal__label">ملاحظات</span><span>{detailTx.note}</span></div>}
              <div style={{ gridColumn: '1/-1' }}><span className="fin-modal__label">تاريخ الإنشاء</span><span>{detailTx.created_at ? formatDateAr(detailTx.created_at.slice(0, 10)) : '—'}</span></div>
            </div>
          </div>
        </div>
      )}

      {attachTx && attachTx.attachments && attachTx.attachments.length > 0 && (
        <div className="fin-overlay" onClick={() => setAttachTx(null)}>
          <div className="fin-modal fin-modal--wide" onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal__close" onClick={() => setAttachTx(null)}>×</button>
            <h3 className="fin-modal__title">المرفقات ({attachTx.attachments.length})</h3>
            <div className="fin-attachments-grid">
              {attachTx.attachments.map((att) => {
                const blob = attachBlobs[att.id]
                const isImage = att.mime_type?.startsWith('image/')
                return (
                  <div key={att.id} className="fin-attachment-card">
                    {!blob || blob.loading ? (
                      <div className="fin-attachment-loading">جاري التحميل...</div>
                    ) : blob.error ? (
                      <div className="fin-attachment-error">{blob.error}</div>
                    ) : isImage ? (
                      <img
                        src={blob.objectUrl}
                        alt={att.original_name}
                        className="fin-attachment-thumbnail"
                        onClick={() => setPreviewAtt(att)}
                      />
                    ) : (
                      <div className="fin-attachment-card__pdf">
                        <span className="fin-attachment-card__pdf-icon">📄</span>
                        <button
                          className="fin-attachment-card__pdf-btn"
                          onClick={() => window.open(blob.objectUrl, '_blank', 'noopener,noreferrer')}
                        >فتح الملف</button>
                      </div>
                    )}
                    <div className="fin-attachment-meta">
                      <span className="fin-attachment-name">{att.original_name}</span>
                      <span className="fin-attachment-size">{Math.round(att.file_size / 1024)} KB</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {previewAtt && attachBlobs[previewAtt.id]?.objectUrl && (
        <div className="fin-overlay" onClick={() => setPreviewAtt(null)}>
          <div className="fin-preview-modal" onClick={(e) => e.stopPropagation()}>
            <button className="fin-modal__close" onClick={() => setPreviewAtt(null)}>×</button>
            <img
              src={attachBlobs[previewAtt.id].objectUrl}
              alt={previewAtt.original_name}
              className="fin-preview-img"
            />
          </div>
        </div>
      )}

      {linkWarn && (() => {
        const linkedList = Array.isArray(linkWarn.detail?.linked_transactions) ? linkWarn.detail.linked_transactions : []
        return (
          <div className="fin-overlay" onClick={() => setLinkWarn(null)}>
            <div className="fin-modal fin-modal--warn" onClick={(e) => e.stopPropagation()}>
              <button className="fin-modal__close" onClick={() => setLinkWarn(null)}>×</button>
              <div className="fin-warn-head">
                <span className="fin-warn-icon">⚠</span>
                <h3 className="fin-modal__title">لا يمكن حذف الحركة</h3>
              </div>
              <p className="fin-warn-text">هذه الحركة مرتبطة بحركة مالية أخرى، لذلك لا يمكن حذفها قبل معالجة الحركة المرتبطة.</p>
              <p className="fin-warn-hint">هذا الشيك المستلم تم استخدامه لإنشاء شيك صادر أو حركة مرتبطة. يمكنك فتح الحركة المرتبطة ومراجعتها أو حذفها أولًا، ثم إعادة محاولة حذف الحركة الأصلية.</p>
              {linkWarn.detail?.linked_transactions_count != null && (
                <div className="fin-warn-count">عدد الحركات المرتبطة: {linkWarn.detail.linked_transactions_count}</div>
              )}
              {linkedList.length > 0 && (
                <div className="fin-warn-linked">
                  {linkedList.map((lt) => (
                    <div key={lt.id} className="fin-warn-linked__card">
                      <div className="fin-warn-linked__title">{TYPE_META[lt.type]?.label || lt.type}</div>
                      <div className="fin-warn-linked__row">رقم الحركة: {lt.id}</div>
                      {lt.check_no && <div className="fin-warn-linked__row">رقم الشيك: {lt.check_no}</div>}
                      {lt.amount != null && <div className="fin-warn-linked__row">المبلغ: {formatCurrency(lt.amount)}</div>}
                      {lt.party_name && <div className="fin-warn-linked__row">الطرف: {lt.party_name}</div>}
                      {lt.status && <div className="fin-warn-linked__row">الحالة: {getStatusMeta(lt).label}</div>}
                      {linkedList.length > 1 && (
                        <button className="fin-warn-linked__btn" onClick={() => openLinkedDetail(lt)}>عرض الحركة</button>
                      )}
                    </div>
                  ))}
                </div>
              )}
              <div className="fin-warn-actions">
                <Button variant="primary" onClick={() => setLinkWarn(null)}>إغلاق</Button>
                {linkedList.length === 1 && (
                  <Button variant="secondary" onClick={() => openLinkedDetail(linkedList[0])}>عرض الحركة المرتبطة</Button>
                )}
              </div>
            </div>
          </div>
        )
      })()}
    </div>
  )
}
