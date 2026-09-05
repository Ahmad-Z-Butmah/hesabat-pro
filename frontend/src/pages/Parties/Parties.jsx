import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import { useEffect, useMemo, useRef, useState } from 'react'
import { getPartiesSummary, updateParty, deletePartyApi } from '../../utils/api.js'
import { formatCurrency, formatMoney, toArabicDigits } from '../../utils/format.js'
import { Input, Select } from '../../components/ui/Input/Input.jsx'
import Field from '../../components/ui/Field/Field.jsx'
import Button from '../../components/ui/Button/Button.jsx'
import Modal from '../../components/ui/Modal/Modal.jsx'
import PartyLedgerModal from '../../components/modals/PartyLedgerModal/PartyLedgerModal.jsx'
import './Parties.css'

const AVATAR_PALETTE = ['#2563EB', '#0E2A4E', '#0E9268', '#B4780A', '#8b5cf6', '#EF4444', '#0891b2', '#c026d3', '#51637A', '#d97706']

const VIEW_TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'in', label: 'وارد (قبضت)' },
  { id: 'out', label: 'صادر (دفعت)' },
]

const DIRECTION_OPTIONS = [
  { value: 'in', label: 'وارد (قبضت منه)' },
  { value: 'out', label: 'صادر (دفعت له)' },
]

const SORT_COLUMNS = [
  { key: 'count', label: 'الحركات', align: 'is-center' },
  { key: 'cash', label: 'نقد / تحويل', align: 'is-left' },
  { key: 'cheque', label: 'شيكات', align: 'is-left' },
  { key: 'total', label: 'الإجمالي', align: 'is-left' },
]

export default function Parties() {
  const { projectId } = useCurrentProject()
  const [view, setView] = useState('all')
  const [q, setQ] = useState('')
  const [activeSort, setActiveSort] = useState('total')
  const [openId, setOpenId] = useState(null)
  const [parties, setParties] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)
  const [actionFor, setActionFor] = useState(null)
  const [menuPos, setMenuPos] = useState(null)
  const [editingParty, setEditingParty] = useState(null)
  const [deletingParty, setDeletingParty] = useState(null)
  const [savingEdit, setSavingEdit] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [formError, setFormError] = useState('')
  const [deleteError, setDeleteError] = useState('')
  const [editForm, setEditForm] = useState({ name: '', role: '', direction: 'in', phone: '' })
  const actionMenuRef = useRef(null)

  useEffect(() => {
    if (!actionFor) return
    const handle = (e) => {
      if (e.target.closest('.prt-actions__menu') || e.target.closest('.prt-actions__btn')) return
      setActionFor(null)
      setMenuPos(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [actionFor])

  const closeMenu = () => {
    setActionFor(null)
    setMenuPos(null)
  }

  const openEdit = (p) => {
    setEditForm({
      name: p.name || '',
      role: p.role || '',
      direction: p.direction || (p.net > 0 ? 'in' : 'out'),
      phone: p.phone || '',
    })
    setFormError('')
    setEditingParty(p)
  }

  const handleEditSave = async () => {
    if (!editingParty) return
    const name = editForm.name.trim()
    if (!name) {
      setFormError('اسم الطرف لا يمكن أن يكون فارغاً')
      return
    }
    setSavingEdit(true)
    setFormError('')
    try {
      await updateParty(editingParty.id, {
        name,
        role: editForm.role.trim() || null,
        direction: editForm.direction,
        phone: editForm.phone.trim() || null,
      })
      setEditingParty(null)
      setReload((r) => r + 1)
    } catch (err) {
      setFormError(err?.message || 'تعذّر تعديل الطرف')
    } finally {
      setSavingEdit(false)
    }
  }

  const handleDelete = async () => {
    if (!deletingParty) return
    setDeleting(true)
    setDeleteError('')
    try {
      await deletePartyApi(deletingParty.id)
      setDeletingParty(null)
      setReload((r) => r + 1)
    } catch (err) {
      setDeleteError(err?.message || 'تعذّر حذف الطرف')
    } finally {
      setDeleting(false)
    }
  }

  useEffect(() => {
    if (!projectId) return
    let active = true
    setLoading(true)
    setError('')
    getPartiesSummary(projectId)
      .then((rows) => { if (active) setParties(rows || []) })
      .catch((err) => { if (active) setError(err?.message || 'تعذّر تحميل الأطراف') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [projectId, reload])

  const rows = useMemo(() => {
    let list = parties.map((p, i) => {
      const cashReceived = Number(p.cash_received) || 0
      const cashPaid = Number(p.cash_paid) || 0
      const checkReceived = Number(p.check_received) || 0
      const checkPaid = Number(p.check_paid) || 0
      const net = Number(p.net_balance) || 0
      return {
        ...p,
        dir: net > 0 ? 'in' : 'out',
        net,
        cash: cashReceived + cashPaid,
        cheque: checkReceived + checkPaid,
        grand: Number(p.total_activity) || 0,
        count: p.transaction_count || 0,
        color: AVATAR_PALETTE[i % AVATAR_PALETTE.length],
      }
    })
    list = list.filter((p) => {
      if (view !== 'all' && p.dir !== view) return false
      if (q && !((p.name || '').includes(q) || (p.role || '').includes(q))) return false
      return true
    })
    const key = activeSort
    const dir = -1
    const getVal = (p, k) => {
      if (k === 'count') return Number(p.count) || 0
      if (k === 'cash') return Number(p.cash) || 0
      if (k === 'cheque') return Number(p.cheque) || 0
      return Number(p.grand) || 0
    }
    const next = [...list]
    next.sort((a, b) => {
      const va = getVal(a, key)
      const vb = getVal(b, key)
      if (va !== vb) return (va - vb) * dir
      const da = a.last_transaction_date ? new Date(a.last_transaction_date).getTime() : 0
      const db = b.last_transaction_date ? new Date(b.last_transaction_date).getTime() : 0
      if (da !== db) return (da - db) * dir
      return (a.id - b.id) * dir
    })
    return next
  }, [parties, view, q, activeSort])

  const summary = useMemo(() => {
    const received = parties.filter((p) => (Number(p.net_balance) || 0) > 0)
    const paid = parties.filter((p) => (Number(p.net_balance) || 0) < 0)
    const sum = (fn) => parties.reduce((a, p) => a + fn(p), 0)
    return [
      { icon: '📥', soft: 'var(--ok-soft)', color: 'var(--ok-ink)', label: 'قبضت من الأطراف', value: sum((p) => ((Number(p.net_balance) || 0) > 0 ? Number(p.total_activity) || 0 : 0)), note: `${received.length} طرف` },
      { icon: '📤', soft: 'var(--danger-soft)', color: 'var(--danger)', label: 'دفعت للمقاولين والموردين', value: sum((p) => ((Number(p.net_balance) || 0) < 0 ? Number(p.total_activity) || 0 : 0)), note: `${paid.length} طرف` },
      { icon: '📥', soft: 'var(--brand-soft)', color: 'var(--brand)', label: 'الشيكات الواردة', value: sum((p) => Number(p.check_received) || 0), note: 'إجمالي الشيكات المستلمة' },
      { icon: '📤', soft: '#fef3c7', color: '#F59E0B', label: 'الشيكات الصادرة', value: sum((p) => Number(p.check_paid) || 0), note: 'إجمالي الشيكات الصادرة' },
    ]
  }, [parties])

  const openParty = openId ? rows.find((p) => p.id === openId) : null
  const hasParties = parties.length > 0

  return (
    <div className="prt animate-fade" data-project-id={projectId}>
      <div className="prt__head">
        <div>
          <h2 className="prt__title">الأطراف والحسابات</h2>
          <p className="prt__sub">كل من تعاملت معه مالياً — عملاء ومقاولون وموردون — مع إجمالي ما قبضته أو دفعته نقداً وشيكات</p>
        </div>
        <div className="prt-toggle">
          {VIEW_TABS.map((t) => (
            <button key={t.id} className={`prt-toggle__btn ${view === t.id ? 'is-on' : ''}`} onClick={() => setView(t.id)}>{t.label}</button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="prt-card prt-state">
          <div className="prt-state__icon">⏳</div>
          <div>جارٍ تحميل الأطراف وحساباتهم…</div>
        </div>
      )}

      {!loading && error && (
        <div className="prt-card prt-state prt-state--error">
          <div className="prt-state__icon">⚠️</div>
          <div>{error}</div>
          <button className="prt-state__btn" onClick={() => setReload((r) => r + 1)}>إعادة المحاولة</button>
        </div>
      )}

      {!loading && !error && !hasParties && (
        <div className="prt-card prt-state">
          <div className="prt-state__icon">📭</div>
          <div>لا توجد أطراف أو حركات مالية في هذا المشروع بعد</div>
        </div>
      )}

      {!loading && !error && hasParties && (
        <>
          <div className="prt-summary">
            {summary.map((s, i) => (
              <div key={i} className="prt-card prt-stat">
                <div className="prt-stat__icon" style={{ background: s.soft }}>{s.icon}</div>
                <div className="prt-stat__value" style={{ color: s.color }}>{formatCurrency(s.value)}</div>
                <div className="prt-stat__label">{s.label}</div>
                <div className="prt-stat__note">{s.note}</div>
              </div>
            ))}
          </div>

          <div className="prt-controls">
            <div className="prt-search">
              <span>🔍</span>
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="ابحث باسم الطرف أو الصفة…" />
            </div>
          </div>

          <div className="prt-card prt-table-card">
            <table className="prt-table">
              <thead>
                <tr>
                  <th>الطرف / الصفة</th>
                  <th className="is-center">الاتجاه</th>
                  {SORT_COLUMNS.map((c) => (
                    <th key={c.key} className={c.align}>
                      <button
                        type="button"
                        className="prt-sort-btn"
                        aria-label={`ترتيب حسب ${c.label}`}
                        onClick={() => setActiveSort(activeSort === c.key ? 'total' : c.key)}
                      >
                        {c.label}
                        <span className={`prt-sort-caret ${activeSort === c.key ? 'is-active' : ''}`}>▼</span>
                      </button>
                    </th>
                  ))}
                  <th className="is-center">السجل</th>
                  <th className="is-center">إجراءات</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="prt-table__row-click" onClick={() => setOpenId(p.id)}>
                    <td>
                      <div className="prt-table__lead">
                        <div className="prt-avatar" style={{ background: p.color }}>{(p.name || '?').trim()[0]}</div>
                        <div><div className="prt-table__label">{p.name}</div><div className="prt-table__desc">{p.role}</div></div>
                      </div>
                    </td>
                    <td className="is-center">
                      {p.net === 0 ? (
                        <span className="prt-dir" style={{ color: 'var(--slate)', background: 'var(--line-2)' }}>متوازن</span>
                      ) : (
                        <span className="prt-dir" style={p.net > 0 ? { color: 'var(--ok-ink)', background: 'var(--ok-soft)' } : { color: 'var(--danger)', background: 'var(--danger-soft)' }}>
                          {p.net > 0 ? 'قبضت' : 'دفعت'}
                        </span>
                      )}
                    </td>
                    <td className="is-center prt-table__strong">{toArabicDigits(p.count)}</td>
                    <td className="is-left" style={{ color: 'var(--ok-ink)', fontWeight: 700 }}>{formatMoney(p.cash)}</td>
                    <td className="is-left" style={{ color: 'var(--brand)', fontWeight: 700 }}>{formatMoney(p.cheque)}</td>
                    <td className="is-left prt-table__value">{formatMoney(p.grand)}</td>
                    <td className="is-center"><span className="prt-link-pill">عرض السجل ›</span></td>
                    <td className="is-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        className="prt-actions__btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          if (actionFor === p.id) { closeMenu(); return }
                          const rect = e.currentTarget.getBoundingClientRect()
                          setMenuPos({ top: rect.bottom + 4, left: rect.right - 148 })
                          setActionFor(p.id)
                        }}
                      >⋮</button>
                      {actionFor === p.id && menuPos && (
                        <div
                          className="prt-actions__menu"
                          ref={actionMenuRef}
                          style={{ position: 'fixed', top: menuPos.top, left: menuPos.left }}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button className="prt-actions__item" onClick={() => { openEdit(p); closeMenu() }}>تعديل</button>
                          <button className="prt-actions__item is-danger" onClick={() => { setDeleteError(''); setDeletingParty(p); closeMenu() }}>حذف</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {rows.length === 0 && (
              <div className="prt-empty">
                <div className="prt-empty__icon">🔍</div>
                <div className="prt-empty__title">لا يوجد طرف مطابق للبحث</div>
                <div className="prt-empty__hint">جرّب اسماً آخر أو غيّر التصنيف</div>
              </div>
            )}
          </div>
        </>
      )}

      {openParty && <PartyLedgerModal party={openParty} projectId={projectId} onClose={() => setOpenId(null)} />}

      {editingParty && (
        <Modal
          title="تعديل بيانات الطرف"
          subtitle={editingParty.name}
          onClose={() => setEditingParty(null)}
          width={460}
          footer={
            <>
              <Button variant="secondary" onClick={() => setEditingParty(null)}>إلغاء</Button>
              <Button variant="primary" onClick={handleEditSave} disabled={savingEdit}>{savingEdit ? 'جارٍ الحفظ...' : 'حفظ التعديل'}</Button>
            </>
          }
        >
          <div className="prt-form">
            {formError && <div className="prt-form__error">{formError}</div>}
            <Field label="الاسم">
              <Input value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} placeholder="اسم الطرف" />
            </Field>
            <Field label="الدور / الصفة">
              <Input value={editForm.role} onChange={(e) => setEditForm((f) => ({ ...f, role: e.target.value }))} placeholder="مثال: مقاول رئيسي" />
            </Field>
            <Field label="الاتجاه">
              <Select value={editForm.direction} onChange={(e) => setEditForm((f) => ({ ...f, direction: e.target.value }))} options={DIRECTION_OPTIONS} />
            </Field>
            <Field label="رقم الهاتف">
              <Input value={editForm.phone} onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))} placeholder="رقم الهاتف" />
            </Field>
          </div>
        </Modal>
      )}

      {deletingParty && (
        <Modal
          title="حذف الطرف"
          onClose={() => { setDeletingParty(null); setDeleteError('') }}
          width={420}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setDeletingParty(null); setDeleteError('') }}>إلغاء</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'جارٍ الحذف...' : 'حذف الطرف'}</Button>
            </>
          }
        >
          <div className="prt-form">
            <p className="prt-delete-text">هل أنت متأكد من حذف الطرف «{deletingParty.name}»؟</p>
            {deleteError && <div className="prt-form__error">{deleteError}</div>}
          </div>
        </Modal>
      )}
    </div>
  )
}
