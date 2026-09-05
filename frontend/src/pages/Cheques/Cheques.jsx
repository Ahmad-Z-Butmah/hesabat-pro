import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import {
  listProjectCheques,
  listParties,
  createTransaction,
  updateTransaction,
  deleteTransactionApi,
  getTransactionAttachmentBlob,
} from '../../utils/api.js'
import { formatMoney, toArabicDigits } from '../../utils/format.js'
import { Input, Select } from '../../components/ui/Input/Input.jsx'
import Button from '../../components/ui/Button/Button.jsx'
import './Cheques.css'

const SOON_DAYS = 14

const TYPE_META = {
  check_in: { label: 'شيك مستلم', short: 'مستلم', icon: '📥', dir: 'in', color: '#0e9268', soft: '#ecfdf5' },
  check_out: { label: 'شيك صادر', short: 'صادر', icon: '📤', dir: 'out', color: '#dc2626', soft: '#feecec' },
}

const STATUS_META = {
  pending: { label: 'قيد التحصيل', short: 'قيد التحصيل', color: '#b4780a', soft: '#fef6e7' },
  cleared: { label: 'تم التحصيل / الصرف', short: 'تم الصرف', color: '#0e9268', soft: '#ecfdf5' },
  bounced: { label: 'مرتجع', short: 'مرتجع', color: '#dc2626', soft: '#feecec' },
}

const TABS = [
  { id: 'all', label: 'الكل' },
  { id: 'in', label: 'المستلمة' },
  { id: 'out', label: 'الصادرة' },
  { id: 'soon', label: 'مستحقة قريباً' },
  { id: 'overdue', label: 'متأخرة' },
  { id: 'done', label: 'تمت' },
]

const SORT_OPTIONS = [
  { value: 'due_asc', label: 'أقرب استحقاق أولاً' },
  { value: 'due_desc', label: 'أبعد استحقاق أولاً' },
  { value: 'newest', label: 'الأحدث' },
  { value: 'oldest', label: 'الأقدم' },
  { value: 'amount_desc', label: 'أعلى قيمة' },
  { value: 'amount_asc', label: 'أقل قيمة' },
]

const partyLabel = (t) => t.party_name || (t.party_id ? `طرف #${t.party_id}` : '—')

function toISODate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
const todayISO = () => toISODate(new Date())

/** "2026-08-07" -> "7-8-2026" */
function formatDMY(iso) {
  if (!iso) return '—'
  const [y, m, d] = String(iso).slice(0, 10).split('-')
  return `${+d}-${+m}-${y}`
}

function daysUntil(iso) {
  if (!iso) return null
  const t = new Date(`${iso}T00:00:00`)
  const today = new Date(`${todayISO()}T00:00:00`)
  return Math.round((t - today) / 86400000)
}

/** سياق لطيف تحت تاريخ الاستحقاق للشيكات غير المنتهية */
function dueContext(c) {
  if (c.status !== 'pending' || !c.due_date) return null
  const d = daysUntil(c.due_date)
  if (d === 0) return { label: 'يستحق اليوم', tone: 'danger' }
  if (d < 0) return { label: d === -1 ? 'متأخر يوم واحد' : `متأخر ${toArabicDigits(-d)} أيام`, tone: 'danger' }
  if (d === 1) return { label: 'بعد يوم واحد', tone: 'warn' }
  if (d <= 7) return { label: `بعد ${toArabicDigits(d)} أيام`, tone: 'warn' }
  return { label: `بعد ${toArabicDigits(d)} يوم`, tone: 'muted' }
}

function dueSort(dir) {
  return (a, b) => {
    const ac = a.status === 'cleared' ? 1 : 0
    const bc = b.status === 'cleared' ? 1 : 0
    if (ac !== bc) return ac - bc
    const ad = a.due_date || '9999-12-31'
    const bd = b.due_date || '9999-12-31'
    if (ad !== bd) return dir * (ad < bd ? -1 : 1)
    const at = a.transaction_date || ''
    const bt = b.transaction_date || ''
    if (at !== bt) return bt < at ? -1 : 1
    const ac2 = a.created_at || ''
    const bc2 = b.created_at || ''
    if (ac2 !== bc2) return bc2 < ac2 ? -1 : 1
    return (b.id || 0) - (a.id || 0)
  }
}

function sortCheques(list, sortVal) {
  const out = list.slice()
  if (sortVal === 'amount_desc') return out.sort((a, b) => Number(b.amount) - Number(a.amount))
  if (sortVal === 'amount_asc') return out.sort((a, b) => Number(a.amount) - Number(b.amount))
  if (sortVal === 'newest') return out.sort((a, b) => (b.transaction_date || '').localeCompare(a.transaction_date || ''))
  if (sortVal === 'oldest') return out.sort((a, b) => (a.transaction_date || '').localeCompare(b.transaction_date || ''))
  if (sortVal === 'due_desc') return out.sort(dueSort(-1))
  return out.sort(dueSort(1))
}

function Modal({ onClose, children, wide = false }) {
  return (
    <div className="chq-overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className={`chq-modal${wide ? ' chq-modal--wide' : ''}`} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  )
}

function ChequeAttachments({ tx, attachBlobs, onPreview }) {
  if (!tx || !tx.attachments || tx.attachments.length === 0) return null
  return (
    <div className="chq-attachments-grid">
      {tx.attachments.map((att) => {
        const blob = attachBlobs[att.id]
        const isImage = att.mime_type?.startsWith('image/')
        return (
          <div key={att.id} className="chq-attachment-card">
            {!blob || blob.loading ? (
              <div className="chq-attachment-loading">جاري التحميل...</div>
            ) : blob.error ? (
              <div className="chq-attachment-error">{blob.error}</div>
            ) : isImage ? (
              <img src={blob.objectUrl} alt={att.original_name} className="chq-attachment-thumb" onClick={() => onPreview(att)} />
            ) : (
              <div className="chq-attachment-file">
                <span className="chq-attachment-file__icon">📄</span>
                <button className="chq-attachment-file__btn" onClick={() => window.open(blob.objectUrl, '_blank', 'noopener,noreferrer')}>فتح الملف</button>
              </div>
            )}
            <div className="chq-attachment-meta">
              <span className="chq-attachment-name" title={att.original_name}>{att.original_name}</span>
              <span className="chq-attachment-size">{Math.round(att.file_size / 1024)} KB</span>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AddChequeModal({ projectId, onClose, onSaved, onError }) {
  const [type, setType] = useState('check_in')
  const [partyName, setPartyName] = useState('')
  const [amount, setAmount] = useState('')
  const [checkNo, setCheckNo] = useState('')
  const [bank, setBank] = useState('')
  const [branch, setBranch] = useState('')
  const [txnDate, setTxnDate] = useState(todayISO())
  const [dueDate, setDueDate] = useState('')
  const [note, setNote] = useState('')
  const [file, setFile] = useState(null)
  const [parties, setParties] = useState([])
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  useEffect(() => {
    if (!projectId) return
    listParties({ project_id: projectId }).then(setParties).catch(() => setParties([]))
  }, [projectId])

  const exactParty = useMemo(
    () => parties.find((p) => p.name.trim().toLowerCase() === partyName.trim().toLowerCase()),
    [parties, partyName]
  )
  const suggestions = useMemo(
    () => (partyName.trim() ? parties.filter((p) => p.name.toLowerCase().includes(partyName.trim().toLowerCase())).slice(0, 6) : []),
    [parties, partyName]
  )

  const submit = async () => {
    const errs = {}
    if (!amount || Number(amount) <= 0) errs.amount = 'أدخل مبلغاً أكبر من صفر'
    if (!partyName.trim()) errs.partyName = 'اسم الطرف مطلوب'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    try {
      const fd = new FormData()
      fd.append('type', type)
      fd.append('amount', String(Number(amount)))
      fd.append('transaction_date', txnDate || todayISO())
      fd.append('status', type === 'check_in' ? 'pending' : 'cleared')
      if (note.trim()) fd.append('note', note.trim())
      if (exactParty) fd.append('party_id', String(exactParty.id))
      else fd.append('party_name', partyName.trim())
      if (checkNo.trim()) fd.append('check_no', checkNo.trim())
      if (bank.trim()) fd.append('bank', bank.trim())
      if (branch.trim()) fd.append('branch', branch.trim())
      if (dueDate) fd.append('due_date', dueDate)
      if (file) fd.append('files', file)
      await createTransaction(projectId, fd)
      onSaved()
    } catch (err) {
      onError(err.message || 'تعذّر حفظ الشيك')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <button className="chq-modal__close" onClick={onClose} title="إغلاق">×</button>
      <h3 className="chq-modal__title">إضافة شيك</h3>

      <div className="chq-form">
        <div className="is-full">
          <span className="chq-field__label">نوع الشيك</span>
          <div className="chq-type-pick">
            {Object.keys(TYPE_META).map((k) => (
              <button
                key={k}
                type="button"
                className={`chq-type-pick__btn ${type === k ? 'is-on' : ''}`}
                onClick={() => setType(k)}
              >
                {TYPE_META[k].icon} {TYPE_META[k].label}
              </button>
            ))}
          </div>
        </div>

        <div className="is-full">
          <span className="chq-field__label">اسم الطرف / العميل</span>
          <Input
            value={partyName}
            onChange={(e) => { setPartyName(e.target.value); setErrors((prev) => ({ ...prev, partyName: '' })) }}
            placeholder="مثال: مؤسسة النور"
            list={undefined}
            autoComplete="off"
            className={errors.partyName ? 'inp--error' : ''}
          />
          {suggestions.length > 0 && (
            <div className="chq-suggest">
              {suggestions.map((p) => (
                <button key={p.id} type="button" onClick={() => { setPartyName(p.name); setErrors((prev) => ({ ...prev, partyName: '' })) }}>{p.name}</button>
              ))}
            </div>
          )}
          {errors.partyName && <div className="chq-field__error">{errors.partyName}</div>}
        </div>

        <div>
          <span className="chq-field__label">المبلغ (₪)</span>
          <Input
            type="number" inputMode="numeric" value={amount}
            onChange={(e) => { setAmount(e.target.value); setErrors((prev) => ({ ...prev, amount: '' })) }}
            placeholder="0"
            className={errors.amount ? 'inp--error' : ''}
          />
          {errors.amount && <div className="chq-field__error">{errors.amount}</div>}
        </div>
        <div>
          <span className="chq-field__label">رقم الشيك</span>
          <Input value={checkNo} onChange={(e) => setCheckNo(e.target.value)} placeholder="مثال: 45245" />
        </div>

        <div>
          <span className="chq-field__label">البنك</span>
          <Input value={bank} onChange={(e) => setBank(e.target.value)} placeholder="مثال: بنك فلسطين" />
        </div>
        <div>
          <span className="chq-field__label">الفرع</span>
          <Input value={branch} onChange={(e) => setBranch(e.target.value)} placeholder="اختياري" />
        </div>

        <div>
          <span className="chq-field__label">تاريخ الحركة</span>
          <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
        </div>
        <div>
          <span className="chq-field__label">تاريخ الاستحقاق</span>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>

        <div className="is-full">
          <span className="chq-field__label">ملاحظات (اختياري)</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="أي تفاصيل إضافية…" />
        </div>

        <div className="is-full">
          <span className="chq-field__label">مرفق (اختياري) — صورة الشيك</span>
          <label className="chq-file">
            <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
            <span>{file ? `📎 ${file.name}` : 'اضغط لاختيار ملف'}</span>
          </label>
        </div>
      </div>

      <div className="chq-modal__actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>إلغاء</Button>
        <Button variant="primary" onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الشيك'}</Button>
      </div>
    </Modal>
  )
}

function EditChequeModal({ tx, onClose, onSaved, onError }) {
  const [amount, setAmount] = useState(tx.amount != null ? String(Number(tx.amount)) : '')
  const [checkNo, setCheckNo] = useState(tx.check_no || '')
  const [bank, setBank] = useState(tx.bank || '')
  const [branch, setBranch] = useState(tx.branch || '')
  const [txnDate, setTxnDate] = useState((tx.transaction_date || '').slice(0, 10))
  const [dueDate, setDueDate] = useState((tx.due_date || '').slice(0, 10))
  const [note, setNote] = useState(tx.note || '')
  const [saving, setSaving] = useState(false)
  const [errors, setErrors] = useState({})

  const submit = async () => {
    const errs = {}
    if (!amount || Number(amount) <= 0) errs.amount = 'أدخل مبلغاً أكبر من صفر'
    if (Object.keys(errs).length) { setErrors(errs); return }
    setSaving(true)
    const payload = {}
    if (amount) payload.amount = Number(amount)
    if (checkNo.trim()) payload.check_no = checkNo.trim()
    if (bank.trim()) payload.bank = bank.trim()
    if (branch.trim()) payload.branch = branch.trim()
    if (txnDate) payload.transaction_date = txnDate
    if (dueDate) payload.due_date = dueDate
    if (note.trim()) payload.note = note.trim()
    try {
      await updateTransaction(tx.id, payload)
      onSaved()
    } catch (err) {
      onError(err.message || 'تعذّر حفظ التعديلات')
      setSaving(false)
    }
  }

  return (
    <Modal onClose={onClose}>
      <button className="chq-modal__close" onClick={onClose} title="إغلاق">×</button>
      <h3 className="chq-modal__title">تعديل الشيك رقم {toArabicDigits(tx.check_no || '')}</h3>

      <div className="chq-form">
        <div>
          <span className="chq-field__label">المبلغ (₪)</span>
          <Input type="number" inputMode="numeric" value={amount} onChange={(e) => { setAmount(e.target.value); setErrors((prev) => ({ ...prev, amount: '' })) }} className={errors.amount ? 'inp--error' : ''} />
          {errors.amount && <div className="chq-field__error">{errors.amount}</div>}
        </div>
        <div>
          <span className="chq-field__label">رقم الشيك</span>
          <Input value={checkNo} onChange={(e) => setCheckNo(e.target.value)} />
        </div>
        <div>
          <span className="chq-field__label">البنك</span>
          <Input value={bank} onChange={(e) => setBank(e.target.value)} />
        </div>
        <div>
          <span className="chq-field__label">الفرع</span>
          <Input value={branch} onChange={(e) => setBranch(e.target.value)} />
        </div>
        <div>
          <span className="chq-field__label">تاريخ الحركة</span>
          <Input type="date" value={txnDate} onChange={(e) => setTxnDate(e.target.value)} />
        </div>
        <div>
          <span className="chq-field__label">تاريخ الاستحقاق</span>
          <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </div>
        <div className="is-full">
          <span className="chq-field__label">ملاحظات</span>
          <Input value={note} onChange={(e) => setNote(e.target.value)} />
        </div>
      </div>

      <div className="chq-modal__actions">
        <Button variant="secondary" onClick={onClose} disabled={saving}>إلغاء</Button>
        <Button variant="primary" onClick={submit} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ التعديلات'}</Button>
      </div>
    </Modal>
  )
}

export default function Cheques() {
  const { projectId } = useCurrentProject()
  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [search, setSearch] = useState('')
  const [type, setType] = useState('all')
  const [status, setStatus] = useState('all')
  const [bank, setBank] = useState('all')
  const [duePreset, setDuePreset] = useState('all')
  const [dueFrom, setDueFrom] = useState('')
  const [dueTo, setDueTo] = useState('')
  const [amtMin, setAmtMin] = useState('')
  const [amtMax, setAmtMax] = useState('')
  const [sort, setSort] = useState('due_asc')
  const [showFilters, setShowFilters] = useState(false)

  const [openMenu, setOpenMenu] = useState(null)
  const [detailTx, setDetailTx] = useState(null)
  const [editTx, setEditTx] = useState(null)
  const [attachTx, setAttachTx] = useState(null)
  const [attachBlobs, setAttachBlobs] = useState({})
  const [previewAtt, setPreviewAtt] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [toast, setToast] = useState(null)

  const menuRef = useRef(null)
  const objectUrlsRef = useRef([])

  const fetchCheques = useCallback(() => {
    if (!projectId) return
    setLoading(true)
    setError('')
    listProjectCheques(projectId)
      .then((results) => setTransactions(Array.isArray(results) ? results : []))
      .catch((err) => setError(err.message || 'تعذّر تحميل الشيكات'))
      .finally(() => setLoading(false))
  }, [projectId])

  useEffect(() => { fetchCheques() }, [fetchCheques])

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
              ? 'انتهت الجلسة، سجّل الدخول مرة أخرى'
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

  useEffect(() => () => { objectUrlsRef.current.forEach((url) => URL.revokeObjectURL(url)) }, [])

  useEffect(() => {
    if (!toast) return
    const t = setTimeout(() => setToast(null), 3200)
    return () => clearTimeout(t)
  }, [toast])

  useEffect(() => {
    if (openMenu == null) return
    const onDown = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpenMenu(null)
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [openMenu])

  useEffect(() => {
    const open = detailTx || editTx || attachTx || showAdd || confirm || previewAtt
    if (!open) return
    const onKey = (e) => {
      if (e.key === 'Escape') { setDetailTx(null); setEditTx(null); setAttachTx(null); setShowAdd(false); setConfirm(null); setPreviewAtt(null) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [detailTx, editTx, attachTx, showAdd, confirm, previewAtt])

  const cheques = useMemo(
    () => transactions.filter((t) => t.type === 'check_in' || t.type === 'check_out'),
    [transactions]
  )

  const banks = useMemo(() => [...new Set(cheques.map((c) => c.bank).filter(Boolean))], [cheques])

  const summary = useMemo(() => {
    const sumVal = (arr) => arr.reduce((a, c) => a + Number(c.amount || 0), 0)
    const card = (key, icon, label, arr, color, soft) => ({
      key, icon, label, count: arr.length, value: sumVal(arr), color, soft,
    })
    const received = cheques.filter((c) => c.type === 'check_in')
    const issued = cheques.filter((c) => c.type === 'check_out')
    const soon = cheques.filter((c) => {
      if (c.status !== 'pending' || !c.due_date) return false
      const d = daysUntil(c.due_date)
      return d != null && d >= 0 && d <= SOON_DAYS
    })
    const overdue = cheques.filter((c) => {
      if (c.status !== 'pending' || !c.due_date) return false
      const d = daysUntil(c.due_date)
      return d != null && d < 0
    })
    const done = cheques.filter((c) => c.status === 'cleared')
    return [
      card('received', '📥', 'الشيكات المستلمة', received, '#0e9268', '#ecfdf5'),
      card('issued', '📤', 'الشيكات الصادرة', issued, '#dc2626', '#feecec'),
      card('soon', '⏳', 'مستحقة قريباً', soon, '#b4780a', '#fef6e7'),
      card('overdue', '🔴', 'متأخرة', overdue, '#dc2626', '#feecec'),
      card('done', '✅', 'تمت', done, '#2563eb', '#eef4ff'),
    ]
  }, [cheques])

  const activeTab = useMemo(() => {
    if (status === 'pending' && duePreset === 'soon') return 'soon'
    if (status === 'pending' && duePreset === 'overdue') return 'overdue'
    if (status === 'cleared' && duePreset === 'all') return 'done'
    if (type === 'check_in' && status === 'all' && duePreset === 'all') return 'in'
    if (type === 'check_out' && status === 'all' && duePreset === 'all') return 'out'
    return 'all'
  }, [type, status, duePreset])

  const selectTab = (id) => {
    setSearch('')
    setDueFrom(''); setDueTo(''); setAmtMin(''); setAmtMax('')
    if (id === 'in') { setType('check_in'); setStatus('all'); setDuePreset('all') }
    else if (id === 'out') { setType('check_out'); setStatus('all'); setDuePreset('all') }
    else if (id === 'soon') { setType('all'); setStatus('pending'); setDuePreset('soon') }
    else if (id === 'overdue') { setType('all'); setStatus('pending'); setDuePreset('overdue') }
    else if (id === 'done') { setType('all'); setStatus('cleared'); setDuePreset('all') }
    else { setType('all'); setStatus('all'); setDuePreset('all') }
  }

  const changeStatus = (v) => {
    setStatus(v)
    if (v !== 'pending') setDuePreset('all')
  }

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return cheques.filter((c) => {
      if (type !== 'all' && c.type !== type) return false
      if (status !== 'all' && c.status !== status) return false
      if (bank !== 'all' && c.bank !== bank) return false
      if (duePreset === 'soon') {
        if (c.status !== 'pending' || !c.due_date) return false
        const d = daysUntil(c.due_date)
        if (d == null || d < 0 || d > SOON_DAYS) return false
      }
      if (duePreset === 'overdue') {
        if (c.status !== 'pending' || !c.due_date) return false
        const d = daysUntil(c.due_date)
        if (d == null || d >= 0) return false
      }
      if (dueFrom && c.due_date < dueFrom) return false
      if (dueTo && c.due_date > dueTo) return false
      const amt = Number(c.amount) || 0
      if (amtMin !== '' && amt < Number(amtMin)) return false
      if (amtMax !== '' && amt > Number(amtMax)) return false
      if (q) {
        const hay = [
          c.party_name, c.check_no, c.bank, c.branch, c.note,
          c.party_role, c.role, c.unit, c.reference,
        ].filter(Boolean).join(' ').toLowerCase()
        if (!hay.includes(q)) return false
      }
      return true
    })
  }, [cheques, type, status, bank, duePreset, dueFrom, dueTo, amtMin, amtMax, search])

  const list = useMemo(() => sortCheques(filtered, sort), [filtered, sort])
  const shownTotal = list.reduce((a, c) => a + Number(c.amount || 0), 0)
  const shownIn = list.filter((c) => c.type === 'check_in').reduce((a, c) => a + Number(c.amount || 0), 0)
  const shownOut = shownTotal - shownIn

  const chips = useMemo(() => {
    const arr = []
    if (search.trim()) arr.push({ key: 'q', label: `البحث: «${search.trim()}»`, clear: () => setSearch('') })
    if (type !== 'all') arr.push({ key: 'type', label: TYPE_META[type]?.short, clear: () => setType('all') })
    if (status !== 'all') arr.push({ key: 'status', label: STATUS_META[status]?.short, clear: () => setStatus('all') })
    if (bank !== 'all') arr.push({ key: 'bank', label: bank, clear: () => setBank('all') })
    if (duePreset === 'soon') arr.push({ key: 'preset', label: 'مستحقة قريباً', clear: () => setDuePreset('all') })
    if (duePreset === 'overdue') arr.push({ key: 'preset', label: 'متأخرة', clear: () => setDuePreset('all') })
    if (dueFrom || dueTo) arr.push({ key: 'dueRange', label: `الاستحقاق من ${dueFrom || '...'} إلى ${dueTo || '...'}`, clear: () => { setDueFrom(''); setDueTo('') } })
    if (amtMin !== '' || amtMax !== '') arr.push({ key: 'amtRange', label: `القيمة من ${amtMin || '...'} إلى ${amtMax || '...'}`, clear: () => { setAmtMin(''); setAmtMax('') } })
    return arr
  }, [search, type, status, bank, duePreset, dueFrom, dueTo, amtMin, amtMax])

  const clearAll = () => {
    setSearch(''); setType('all'); setStatus('all'); setBank('all'); setDuePreset('all')
    setDueFrom(''); setDueTo(''); setAmtMin(''); setAmtMax('')
  }
  const hasFilters = chips.length > 0

  const toastMsg = (msg, tone = 'ok') => setToast({ msg, tone })

  const requestStatusChange = (c, target) => {
    const isIn = c.type === 'check_in'
    const msgs = {
      cleared: isIn ? `سيُسجَّل الشيك رقم ${c.check_no || ''} كـ«تم التحصيل».` : `سيُسجَّل الشيك رقم ${c.check_no || ''} كـ«مدفوع».`,
      bounced: `سيُسجَّل الشيك رقم ${c.check_no || ''} كـ«مرتجع».`,
      pending: `سيُعاد الشيك رقم ${c.check_no || ''} إلى حالة «قيد التحصيل».`,
    }
    setConfirm({
      title: 'تأكيد تغيير الحالة',
      message: `${msgs[target]}\nسيتم تحديث الحالة في السجلات المالية مباشرة.`,
      confirmLabel: target === 'bounced' ? 'تسجيل مرتجع' : target === 'cleared' ? 'تأكيد التحصيل' : 'إعادة الحالة',
      danger: target === 'bounced',
      onConfirm: async () => {
        try {
          await updateTransaction(c.id, { status: target })
          setOpenMenu(null); setDetailTx(null); setConfirm(null)
          toastMsg(target === 'cleared' ? 'تم تحديث الحالة بنجاح' : 'تم تحديث حالة الشيك')
          fetchCheques()
        } catch (err) {
          setConfirm(null)
          toastMsg(err.message || 'تعذّر تحديث الحالة', 'error')
        }
      },
    })
  }

  const requestDelete = (c) => {
    setConfirm({
      title: 'حذف الشيك',
      message: `سيتم حذف الشيك رقم ${c.check_no || ''} نهائياً، ولن يمكن التراجع عن هذا الإجراء.`,
      confirmLabel: 'حذف نهائي',
      danger: true,
      onConfirm: async () => {
        try {
          await deleteTransactionApi(c.id)
          setOpenMenu(null); setDetailTx(null); setConfirm(null)
          toastMsg('تم حذف الشيك')
          fetchCheques()
        } catch (err) {
          setConfirm(null)
          toastMsg(err.message || 'تعذّر حذف الشيك', 'error')
        }
      },
    })
  }

  const renderActions = (c) => {
    const hasAtt = c.attachments && c.attachments.length > 0
    return (
      <div className="chq-menu" ref={menuRef}>
        <button className="chq-menu__item" onClick={() => { setDetailTx(c); setOpenMenu(null) }}>📋 عرض التفاصيل</button>
        <button className="chq-menu__item" onClick={() => { setEditTx(c); setOpenMenu(null) }}>✏️ تعديل</button>
        {c.status === 'pending' && (
          <>
            <button className="chq-menu__item" onClick={() => { setOpenMenu(null); requestStatusChange(c, 'cleared') }}>✓ تسجيل التحصيل / الصرف</button>
            <button className="chq-menu__item" onClick={() => { setOpenMenu(null); requestStatusChange(c, 'bounced') }}>⚠ تسجيل مرتجع</button>
          </>
        )}
        {c.status === 'bounced' && (
          <button className="chq-menu__item" onClick={() => { setOpenMenu(null); requestStatusChange(c, 'pending') }}>↺ إعادة للمتابعة</button>
        )}
        {c.status === 'cleared' && (
          <button className="chq-menu__item" onClick={() => { setOpenMenu(null); requestStatusChange(c, 'pending') }}>↺ إلغاء التحصيل</button>
        )}
        {hasAtt && (
          <button className="chq-menu__item" onClick={() => { setAttachTx(c); setOpenMenu(null) }}>📎 المرفقات</button>
        )}
        <button className="chq-menu__item is-danger" onClick={() => { setOpenMenu(null); requestDelete(c) }}>🗑 حذف</button>
      </div>
    )
  }

  return (
    <div className="chq animate-fade" data-project-id={projectId}>
      <header className="chq-head">
        <div>
          <h1 className="chq-head__title">الشيكات</h1>
          <p className="chq-head__sub">تابع الشيكات المستلمة والصادرة، مواعيد استحقاقها، وحالتها الحالية.</p>
        </div>
        <Button variant="primary" iconLeft={<span className="chq-head__plus">＋</span>} onClick={() => setShowAdd(true)}>إضافة شيك</Button>
      </header>

      {loading ? (
        <div className="chq-state" role="status">
          <span className="chq-spinner" aria-hidden="true" />
          <p>جارٍ تحميل الشيكات...</p>
        </div>
      ) : error ? (
        <div className="chq-state chq-state--error" role="alert">
          <span className="chq-state__icon">⚠️</span>
          <p className="chq-state__title">تعذّر تحميل الشيكات</p>
          <p className="chq-state__hint">{error}</p>
          <Button variant="secondary" onClick={fetchCheques}>إعادة المحاولة</Button>
        </div>
      ) : (
        <>
          <div className="chq-summary">
            {summary.map((s) => (
              <div key={s.key} className="chq-stat" style={{ '--st-color': s.color, '--st-soft': s.soft }} title={`${s.label}: ${s.count} شيك`}>
                <div className="chq-stat__head">
                  <span className="chq-stat__icon">{s.icon}</span>
                  <span className="chq-stat__label">{s.label}</span>
                </div>
                <div className="chq-stat__count">{toArabicDigits(s.count)} شيك</div>
                <div className="chq-stat__value">{formatMoney(s.value)}</div>
              </div>
            ))}
          </div>

          <div className="chq-card chq-filters">
            <div className="chq-filters__main">
              <div className="chq-search">
                <span className="chq-search__icon" aria-hidden="true">🔍</span>
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="ابحث برقم الشيك، الطرف، البنك، الوحدة…"
                  aria-label="بحث في الشيكات"
                />
                {search && (
                  <button className="chq-search__clear" onClick={() => setSearch('')} title="مسح البحث">✕</button>
                )}
              </div>
              <div className="chq-sort-wrap">
                <label className="chq-field__label" htmlFor="chq-sort">ترتيب حسب</label>
                <Select id="chq-sort" value={sort} onChange={(e) => setSort(e.target.value)} options={SORT_OPTIONS} className="chq-select" />
              </div>
              <button
                type="button"
                className={`chq-filter-toggle${showFilters ? ' is-on' : ''}${hasFilters ? ' has-filters' : ''}`}
                onClick={() => setShowFilters((v) => !v)}
                aria-expanded={showFilters}
              >
                <span className="chq-filter-toggle__icon" aria-hidden="true">⚙</span>
                <span>فلاتر</span>
                {hasFilters && <span className="chq-filter-toggle__count">{toArabicDigits(chips.length)}</span>}
              </button>
            </div>

            {showFilters && (
              <div className="chq-filters__panel">
                <div className="chq-filters__grid">
                  <label className="chq-field">
                    <span className="chq-field__label">النوع</span>
                    <Select value={type} onChange={(e) => setType(e.target.value)} options={[{ value: 'all', label: 'الكل' }, ...Object.keys(TYPE_META).map((k) => ({ value: k, label: TYPE_META[k].label }))]} className="chq-select" />
                  </label>
                  <label className="chq-field">
                    <span className="chq-field__label">الحالة</span>
                    <Select value={status} onChange={(e) => changeStatus(e.target.value)} options={[{ value: 'all', label: 'كل الحالات' }, ...Object.keys(STATUS_META).map((k) => ({ value: k, label: STATUS_META[k].label }))]} className="chq-select" />
                  </label>
                  <label className="chq-field">
                    <span className="chq-field__label">البنك</span>
                    <Select value={bank} onChange={(e) => setBank(e.target.value)} options={[{ value: 'all', label: 'كل البنوك' }, ...banks.map((b) => ({ value: b, label: b }))]} className="chq-select" />
                  </label>
                  <label className="chq-field">
                    <span className="chq-field__label">استحقاق من</span>
                    <Input type="date" value={dueFrom} onChange={(e) => setDueFrom(e.target.value)} className="chq-field__input" />
                  </label>
                  <label className="chq-field">
                    <span className="chq-field__label">استحقاق إلى</span>
                    <Input type="date" value={dueTo} onChange={(e) => setDueTo(e.target.value)} className="chq-field__input" />
                  </label>
                  <label className="chq-field">
                    <span className="chq-field__label">القيمة من</span>
                    <Input type="number" min="0" inputMode="numeric" value={amtMin} onChange={(e) => setAmtMin(e.target.value)} placeholder="0" className="chq-field__input" />
                  </label>
                  <label className="chq-field">
                    <span className="chq-field__label">القيمة إلى</span>
                    <Input type="number" min="0" inputMode="numeric" value={amtMax} onChange={(e) => setAmtMax(e.target.value)} placeholder="0" className="chq-field__input" />
                  </label>
                </div>

                <div className="chq-filters__foot">
                  <span className="chq-filters__hint">فلاتر إضافية — تُطبَّق فوراً على القائمة</span>
                  <Button variant="ghost" className="chq-clear-all" onClick={clearAll} disabled={!hasFilters}>مسح الفلاتر</Button>
                </div>
              </div>
            )}

            {hasFilters && (
              <div className="chq-chips">
                {chips.map((chip) => (
                  <span key={chip.key} className="chq-chip">
                    {chip.label}
                    <button className="chq-chip__x" onClick={chip.clear} title="إزالة هذا الفلتر">✕</button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <nav className="chq-tabs" role="tablist" aria-label="تصنيفات الشيكات">
            {TABS.map((t) => (
              <button
                key={t.id}
                role="tab"
                aria-selected={activeTab === t.id}
                className={`chq-tab ${activeTab === t.id ? 'is-on' : ''}`}
                onClick={() => selectTab(t.id)}
              >
                {t.label}
              </button>
            ))}
          </nav>

          <div className="chq-result-strip">
            <div className="chq-result-count">{toArabicDigits(list.length)} شيك</div>
            <div className="chq-result-total">
              القيمة الظاهرة: <span className="chq-result-total__in">وارد {formatMoney(shownIn)}</span>
              <span className="chq-result-total__sep">·</span>
              <span className="chq-result-total__out">صادر {formatMoney(shownOut)}</span>
            </div>
          </div>

          {list.length === 0 ? (
            <div className="chq-state">
              <span className="chq-state__icon">{cheques.length === 0 ? '🧾' : '🔍'}</span>
              <p className="chq-state__title">{cheques.length === 0 ? 'لا توجد شيكات بعد' : 'لا نتائج مطابقة'}</p>
              <p className="chq-state__hint">
                {cheques.length === 0
                  ? 'أضف شيكاً مستلماً أو صادراً من زر «إضافة شيك» وسيظهر هنا تلقائياً.'
                  : hasFilters
                    ? 'جرّب توسيع نطاق الفلاتر أو مسحها للعثور على شيكات.'
                    : 'لا توجد شيكات مطابقة.'}
              </p>
              {hasFilters && <Button variant="secondary" onClick={clearAll}>مسح الفلاتر</Button>}
            </div>
          ) : (
            <div className="chq-table">
              <div className="chq-table__head">
                <span>رقم الشيك</span>
                <span>الطرف / العميل</span>
                <span>البنك</span>
                <span>القيمة</span>
                <span>النوع</span>
                <span>تاريخ الاستحقاق</span>
                <span>الحالة</span>
                <span className="is-actions">الإجراءات</span>
              </div>
              {list.map((c) => {
                const tm = TYPE_META[c.type] || { short: c.type, icon: '🧾', color: '#2563eb', soft: '#eef4ff' }
                const sm = STATUS_META[c.status] || { label: c.status, short: c.status, color: '#51637a', soft: '#f4f7fb' }
                const ctx = dueContext(c)
                const hasAtt = c.attachments && c.attachments.length > 0
                const sub = c.note || c.party_role || c.role || ''
                return (
                  <div key={c.id} className={`chq-row chq-row--${tm.dir}`} onClick={() => setDetailTx(c)}>
                    <div className="chq-cell chq-cell--no">
                      <span className="chq-row__no" title="رقم الشيك">{toArabicDigits(c.check_no || '—')}</span>
                      {hasAtt && <span className="chq-row__attach" title="يحتوي مرفقات">📎</span>}
                    </div>
                    <div className="chq-cell chq-cell--party" title={partyLabel(c)}>
                      <span className="chq-avatar" style={{ background: tm.color }}>{partyLabel(c).trim()[0] || '؟'}</span>
                      <span className="chq-cell__party-body">
                        <span className="chq-row__party-name">{partyLabel(c)}</span>
                        {sub && <span className="chq-row__party-sub" title={sub}>{sub}</span>}
                      </span>
                    </div>
                    <div className="chq-cell chq-cell--bank" title="البنك / الفرع">
                      {c.bank || '—'}{c.branch ? ` · ${c.branch}` : ''}
                    </div>
                    <div className="chq-cell chq-cell--amount" title="قيمة الشيك">
                      <span className="chq-row__amount-val">{formatMoney(c.amount)}</span>
                      <span className="chq-row__amount-hint">{tm.dir === 'in' ? 'وارد' : 'صادر'}</span>
                    </div>
                    <div className="chq-cell chq-cell--type">
                      <span className="chq-badge chq-badge--type" style={{ color: tm.color, background: tm.soft }}>{tm.icon} {tm.short}</span>
                    </div>
                    <div className={`chq-cell chq-cell--due${ctx ? ` is-${ctx.tone}` : ''}`} title="تاريخ الاستحقاق">
                      <span className="chq-row__due-date">{formatDMY(c.due_date)}</span>
                      {ctx ? <span className="chq-row__due-ctx">{ctx.label}</span> : <span className="chq-row__due-ctx is-muted">{sm.short}</span>}
                    </div>
                    <div className="chq-cell chq-cell--status">
                      <span className="chq-badge chq-badge--status" style={{ color: sm.color, background: sm.soft }}>{sm.short}</span>
                    </div>
                    <div className="chq-cell chq-cell--menu">
                      <button
                        className={`chq-dots ${openMenu === c.id ? 'is-on' : ''}`}
                        onClick={(e) => { e.stopPropagation(); setOpenMenu(openMenu === c.id ? null : c.id) }}
                        onMouseDown={(e) => e.stopPropagation()}
                        title="إجراءات الشيك"
                        aria-label="إجراءات الشيك"
                      >
                        ⋮
                      </button>
                      {openMenu === c.id && renderActions(c)}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </>
      )}

      {detailTx && (
        <Modal onClose={() => setDetailTx(null)}>
          <button className="chq-modal__close" onClick={() => setDetailTx(null)} title="إغلاق">×</button>
          <h3 className="chq-modal__title">تفاصيل الشيك</h3>
          <div className="chq-modal__grid">
            <div><span className="chq-modal__label">النوع</span><span>{TYPE_META[detailTx.type]?.label || detailTx.type}</span></div>
            <div><span className="chq-modal__label">رقم الشيك</span><span>{detailTx.check_no || '—'}</span></div>
            <div><span className="chq-modal__label">الطرف</span><span>{partyLabel(detailTx)}</span></div>
            <div><span className="chq-modal__label">المبلغ</span><span style={{ fontWeight: 800 }}>{formatMoney(detailTx.amount)}</span></div>
            <div><span className="chq-modal__label">البنك</span><span>{detailTx.bank || '—'}</span></div>
            <div><span className="chq-modal__label">الفرع</span><span>{detailTx.branch || '—'}</span></div>
            <div><span className="chq-modal__label">تاريخ الحركة</span><span>{formatDMY(detailTx.transaction_date)}</span></div>
            <div><span className="chq-modal__label">تاريخ الاستحقاق</span><span>{formatDMY(detailTx.due_date)}</span></div>
            <div><span className="chq-modal__label">الحالة</span><span>{STATUS_META[detailTx.status]?.label || detailTx.status}</span></div>
            <div><span className="chq-modal__label">تاريخ الإنشاء</span><span>{detailTx.created_at ? formatDMY(detailTx.created_at) : '—'}</span></div>
            {detailTx.note && <div className="is-full"><span className="chq-modal__label">ملاحظات</span><span>{detailTx.note}</span></div>}
          </div>
          <div className="chq-modal__actions">
            {detailTx.attachments && detailTx.attachments.length > 0 && (
              <Button variant="secondary" onClick={() => { setAttachTx(detailTx); setDetailTx(null) }}>📎 المرفقات</Button>
            )}
            {detailTx.status === 'pending' && (
              <>
                <Button variant="primary" onClick={() => { setDetailTx(null); requestStatusChange(detailTx, 'cleared') }}>✓ تسجيل التحصيل / الصرف</Button>
                <Button variant="danger" onClick={() => { setDetailTx(null); requestStatusChange(detailTx, 'bounced') }}>⚠ تسجيل مرتجع</Button>
              </>
            )}
            {detailTx.status === 'bounced' && (
              <Button variant="primary" onClick={() => { setDetailTx(null); requestStatusChange(detailTx, 'pending') }}>↺ إعادة للمتابعة</Button>
            )}
            {detailTx.status === 'cleared' && (
              <Button variant="secondary" onClick={() => { setDetailTx(null); requestStatusChange(detailTx, 'pending') }}>↺ إلغاء التحصيل</Button>
            )}
          </div>
        </Modal>
      )}

      {editTx && (
        <EditChequeModal
          tx={editTx}
          onClose={() => setEditTx(null)}
          onSaved={() => { setEditTx(null); toastMsg('تم حفظ التعديلات'); fetchCheques() }}
          onError={(m) => toastMsg(m, 'error')}
        />
      )}

      {showAdd && (
        <AddChequeModal
          projectId={projectId}
          onClose={() => setShowAdd(false)}
          onSaved={() => { setShowAdd(false); toastMsg('تمت إضافة الشيك'); fetchCheques() }}
          onError={(m) => toastMsg(m, 'error')}
        />
      )}

      {attachTx && attachTx.attachments && attachTx.attachments.length > 0 && (
        <Modal onClose={() => setAttachTx(null)} wide>
          <button className="chq-modal__close" onClick={() => setAttachTx(null)} title="إغلاق">×</button>
          <h3 className="chq-modal__title">المرفقات ({toArabicDigits(attachTx.attachments.length)})</h3>
          <ChequeAttachments tx={attachTx} attachBlobs={attachBlobs} onPreview={setPreviewAtt} />
        </Modal>
      )}

      {confirm && (
        <Modal onClose={() => setConfirm(null)}>
          <h3 className="chq-modal__title">{confirm.title}</h3>
          <p className="chq-confirm__msg">{confirm.message}</p>
          <div className="chq-modal__actions">
            <Button variant="secondary" onClick={() => setConfirm(null)}>إلغاء</Button>
            <Button variant={confirm.danger ? 'danger' : 'primary'} onClick={confirm.onConfirm}>{confirm.confirmLabel}</Button>
          </div>
        </Modal>
      )}

      {previewAtt && attachBlobs[previewAtt.id]?.objectUrl && (
        <div className="chq-overlay" onClick={() => setPreviewAtt(null)} role="dialog" aria-modal="true">
          <div className="chq-preview" onClick={(e) => e.stopPropagation()}>
            <button className="chq-modal__close" onClick={() => setPreviewAtt(null)} title="إغلاق">×</button>
            <img src={attachBlobs[previewAtt.id].objectUrl} alt={previewAtt.original_name} className="chq-preview__img" />
          </div>
        </div>
      )}

      {toast && (
        <div className={`chq-toast is-${toast.tone}`} role="status">
          <span>{toast.tone === 'error' ? '⚠️' : '✓'}</span>
          <span>{toast.msg}</span>
        </div>
      )}
    </div>
  )
}
