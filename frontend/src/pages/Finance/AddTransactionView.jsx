import { useEffect, useMemo, useRef, useState } from 'react'
import { ArrowLeft } from '../../components/icons/Icons.jsx'
import Field from '../../components/ui/Field/Field.jsx'
import { Input, Textarea } from '../../components/ui/Input/Input.jsx'
import Button from '../../components/ui/Button/Button.jsx'
import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import { listParties, createTransaction, createTransactionsBatch, listProjectTransactions } from '../../utils/api.js'
import { formatCurrency, formatDateAr, formatMoney } from '../../utils/format.js'
import './AddTransactionView.css'

const FINANCE_TXN_TYPES = [
  { id: 'check_in', label: 'شيك مستلم', sub: 'واردة', icon: '📥', color: '#10B981' },
  { id: 'check_out', label: 'شيك صادر', sub: 'صادرة', icon: '📤', color: '#EF4444' },
  { id: 'cash_in', label: 'كاش مستلم', sub: 'واردة', icon: '💵', color: '#2563EB' },
  { id: 'cash_out', label: 'كاش صادر', sub: 'صادرة', icon: '💸', color: '#F59E0B' },
]

const TYPE_META = {
  check_in: { dir: 'in', label: 'شيك مستلم' },
  check_out: { dir: 'out', label: 'شيك صادر' },
  cash_in: { dir: 'in', label: 'كاش مستلم' },
  cash_out: { dir: 'out', label: 'كاش صادر' },
}

function formatDateForInput(date) {
  return date.toISOString().slice(0, 10)
}

const emptyCheque = () => ({
  amount: '',
  check_no: '',
  bank: '',
  branch: '',
  due_date: '',
  source_transaction_id: null,
  attachment: null,
})

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_FILE_SIZE = 10 * 1024 * 1024

export default function AddTransactionView({ cashOnHand, cashOnHandLoading, onBack, onSave }) {
  const { projectId } = useCurrentProject()
  const fileInputRef = useRef(null)
  const amountRef = useRef(null)
  const partyRef = useRef(null)
  const chequeFileInputRefs = useRef([])
  const [txnType, setTxnType] = useState('cash_in')
  const [amount, setAmount] = useState('')
  const [date, setDate] = useState(formatDateForInput(new Date()))
  const [party, setParty] = useState('')
  const [partyId, setPartyId] = useState(null)
  const [partyPhone, setPartyPhone] = useState('')
  const [partyOpen, setPartyOpen] = useState(false)
  const [notes, setNotes] = useState('')
  const [parties, setParties] = useState([])
  const [pendingChecks, setPendingChecks] = useState([])
  const [error, setError] = useState('')
  const [amountError, setAmountError] = useState('')
  const [partyError, setPartyError] = useState('')
  const [saving, setSaving] = useState(false)
  const [files, setFiles] = useState([])
  const [dragOver, setDragOver] = useState(false)
  const [chequeCount, setChequeCount] = useState('1')
  const [cheques, setCheques] = useState(() => [emptyCheque()])
  const [chequeErrors, setChequeErrors] = useState([])
  const [sourceOpen, setSourceOpen] = useState(null)
  const [chequeDragIndex, setChequeDragIndex] = useState(null)

  const isCheckOut = txnType === 'check_out'
  const isCheckIn = txnType === 'check_in'
  const isCashOut = txnType === 'cash_out'
  const isCashIn = txnType === 'cash_in'
  const isCheckTxn = isCheckOut || isCheckIn
  const isOut = isCheckOut || isCashOut
  const uploadLabel = isCheckTxn ? 'صورة الشيك' : 'صورة الفاتورة / الإيصال'

  useEffect(() => {
    if (!projectId) return
    listParties({ project_id: projectId })
      .then((results) => setParties(results))
      .catch(() => setParties([]))
  }, [projectId])

  useEffect(() => {
    if (!projectId) return
    listProjectTransactions(projectId, { type: 'check_in', status: 'pending' })
      .then((checks) => setPendingChecks(checks || []))
      .catch(() => setPendingChecks([]))
  }, [projectId])

  const pendingChecksPool = useMemo(
    () =>
      pendingChecks.map((c) => ({
        id: c.id,
        no: c.check_no || '',
        bank: c.bank || '',
        branch: c.branch || '',
        amount: Number(c.amount),
        g: c.due_date || c.transaction_date,
        party_name: c.party_name || '',
        party_id: c.party_id,
      })),
    [pendingChecks]
  )

  const trimmedParty = party.trim()
  const lowerQuery = trimmedParty.toLowerCase()

  const exactMatch = useMemo(() => {
    if (!trimmedParty || partyId) return null
    return parties.find((p) => p.name.trim().toLowerCase() === trimmedParty.toLowerCase()) ?? null
  }, [parties, trimmedParty, partyId])

  const partySuggestions = useMemo(() => {
    if (!partyOpen) return []
    if (!lowerQuery) return parties.slice(0, 10)
    const starts = []
    const contains = []
    parties.forEach((p) => {
      const name = p.name.trim().toLowerCase()
      if (name.startsWith(lowerQuery)) starts.push(p)
      else if (name.includes(lowerQuery)) contains.push(p)
    })
    return [...starts, ...contains].slice(0, 10)
  }, [parties, lowerQuery, partyOpen])

  useEffect(() => {
    if (exactMatch && !partyId) {
      setParty(exactMatch.name)
      setPartyId(exactMatch.id)
      setPartyPhone('')
      setPartyOpen(false)
      setError('')
    }
  }, [exactMatch, partyId])

  useEffect(() => {
    if (sourceOpen == null) return
    const handle = (e) => {
      if (!e.target.closest('.atv-src-dropdown')) setSourceOpen(null)
    }
    document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [sourceOpen])

  const selectedParty = parties.find((p) => p.id === partyId) ?? null
  const showPhoneField = !selectedParty || !selectedParty.phone?.trim()

  const totalAmount = isCheckTxn
    ? cheques.reduce((a, c) => a + (parseFloat(c.amount) || 0), 0)
    : (parseFloat(amount) || 0)
  const pvAmount = totalAmount.toLocaleString('en-US')
  const tm = TYPE_META[txnType]
  const isIn = tm.dir === 'in'
  const pvMethod = isCheckTxn ? 'شيك' : 'نقداً'
  const usedSourceIds = cheques.map((c) => c.source_transaction_id).filter(Boolean)

  const handlePartyChange = (value) => {
    setParty(value)
    setPartyId(null)
    setPartyOpen(true)
    setError('')
  }

  const handlePartyPick = (selected) => {
    setParty(selected.name)
    setPartyId(selected.id)
    setPartyPhone('')
    setPartyOpen(false)
    setError('')
  }

  const handleTypeChange = (newType) => {
    setTxnType(newType)
    setAmount('')
    setParty('')
    setPartyId(null)
    setCheques([emptyCheque()])
    setChequeCount('1')
    setChequeErrors([])
    setSourceOpen(null)
    setError('')
  }

  const handleChequeCountChange = (value) => {
    const cleaned = value.replace(/[^\d]/g, '')
    setChequeCount(cleaned)
    setError('')
    if (!cleaned) return
    const n = parseInt(cleaned, 10)
    if (n < 1) return
    setCheques((prev) => {
      const next = prev.slice(0, n)
      while (next.length < n) next.push(emptyCheque())
      return next
    })
    setChequeErrors((prev) => prev.slice(0, n))
  }

  const normalizeChequeCount = () => {
    const n = parseInt(chequeCount, 10)
    const target = n >= 1 ? n : 1
    setChequeCount(String(target))
    setCheques((prev) => {
      const next = prev.slice(0, target)
      while (next.length < target) next.push(emptyCheque())
      return next
    })
    setChequeErrors((prev) => prev.slice(0, target))
  }

  const handleChequeCountBlur = () => normalizeChequeCount()

  const handleChequeDelete = (index) => {
    if (cheques.length <= 1) return
    setCheques((prev) => prev.filter((_, i) => i !== index))
    setChequeCount((prev) => String(Math.max(1, (parseInt(prev, 10) || 1) - 1)))
    setChequeErrors((prev) => prev.filter((_, i) => i !== index))
    setSourceOpen(null)
  }

  const handleChequeField = (index, field, value) => {
    setCheques((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
    setChequeErrors((prev) => {
      if (!prev[index]) return prev
      const next = prev.slice()
      next[index] = { ...next[index], [field]: '' }
      return next
    })
  }

  const handleSourceSelect = (index, sourceId) => {
    const source = pendingChecksPool.find((c) => c.id === Number(sourceId))
    setCheques((prev) =>
      prev.map((c, i) => {
        if (i !== index) return c
        if (!source) return { ...c, source_transaction_id: null }
        return {
          ...c,
          amount: String(Math.round(source.amount)),
          check_no: source.no || '',
          bank: source.bank || '',
          branch: source.branch || '',
          due_date: typeof source.g === 'string' ? source.g : formatDateForInput(new Date(source.g)),
          source_transaction_id: source.id,
        }
      })
    )
    setChequeErrors((prev) => {
      if (!prev[index]) return prev
      const next = prev.slice()
      next[index] = { ...next[index], amount: '', check_no: '', due_date: '' }
      return next
    })
  }

  const handleChequeAttachment = (index, file) => {
    if (!file) return
    if (!ALLOWED_TYPES.includes(file.type)) {
      setChequeErrors((prev) => {
        const next = prev.slice()
        next[index] = { ...(next[index] || {}), attachment: 'نوع الملف غير مدعوم' }
        return next
      })
      return
    }
    if (file.size > MAX_FILE_SIZE) {
      setChequeErrors((prev) => {
        const next = prev.slice()
        next[index] = { ...(next[index] || {}), attachment: 'حجم الملف يتجاوز 10MB' }
        return next
      })
      return
    }
    setCheques((prev) => prev.map((c, i) => (i === index ? { ...c, attachment: file } : c)))
    setChequeErrors((prev) => {
      const next = prev.slice()
      next[index] = { ...(next[index] || {}), attachment: '' }
      return next
    })
  }

  const handleChequeAttachmentInput = (e, index) => {
    const file = e.target.files?.[0]
    if (file) handleChequeAttachment(index, file)
    e.target.value = ''
  }

  const handleChequeAttachmentDrop = (e, index) => {
    e.preventDefault()
    setChequeDragIndex(null)
    const file = e.dataTransfer.files?.[0]
    if (file) handleChequeAttachment(index, file)
  }

  const handleChequeAttachmentDragOver = (e, index) => {
    e.preventDefault()
    setChequeDragIndex(index)
  }

  const handleChequeAttachmentDragLeave = (e) => {
    e.preventDefault()
    setChequeDragIndex(null)
  }

  const removeChequeAttachment = (index) => {
    setCheques((prev) => prev.map((c, i) => (i === index ? { ...c, attachment: null } : c)))
    setChequeErrors((prev) => {
      const next = prev.slice()
      next[index] = { ...(next[index] || {}), attachment: '' }
      return next
    })
  }

  const validateFile = (file) => {
    if (!ALLOWED_TYPES.includes(file.type)) return `نوع الملف غير مسموح: ${file.type}`
    if (file.size > MAX_FILE_SIZE) return `الملف كبير جداً (الحد الأقصى 10MB): ${file.name}`
    return null
  }

  const addFiles = (fileList) => {
    const newFiles = Array.from(fileList)
    const valid = []
    for (const f of newFiles) {
      const err = validateFile(f)
      if (err) { setError(err); return }
      if (!files.some((existing) => existing.name === f.name && existing.size === f.size)) valid.push(f)
    }
    setFiles((prev) => [...prev, ...valid])
    setError('')
  }

  const handleFileInput = (e) => {
    if (e.target.files?.length) addFiles(e.target.files)
    e.target.value = ''
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setDragOver(false)
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files)
  }

  const handleDragOver = (e) => { e.preventDefault(); setDragOver(true) }
  const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false) }

  const removeFile = (index) => setFiles((prev) => prev.filter((_, i) => i !== index))

  const getFilePreview = (file) => (file.type.startsWith('image/') ? URL.createObjectURL(file) : null)

  const handleSave = async () => {
    let hasError = false
    let workingCheques = cheques
    setSourceOpen(null)

    if (isCheckTxn) {
      const target = Math.max(1, parseInt(chequeCount, 10) || 1)
      workingCheques = cheques.slice(0, target)
      while (workingCheques.length < target) workingCheques.push(emptyCheque())
      setChequeCount(String(target))
      setCheques(workingCheques)
      const cardErrors = workingCheques.map((c) => {
        const err = {}
        if (!c.amount || !c.amount.replace(/\D/g, '') || Number(c.amount) <= 0) err.amount = 'يرجى إدخال مبلغ الشيك'
        if (!c.check_no.trim()) err.check_no = 'يرجى إدخال رقم الشيك'
        if (!c.due_date) err.due_date = 'يرجى اختيار تاريخ الاستحقاق'
        return err
      })
      setChequeErrors(cardErrors)
      if (cardErrors.some((e) => Object.keys(e).length > 0)) {
        const idx = cardErrors.findIndex((e) => Object.keys(e).length > 0)
        setError(`بيانات شيك ${idx + 1} غير مكتملة`)
        return
      }
    } else {
      if (!amount || !amount.replace(/\D/g, '')) {
        setAmountError('يرجى إدخال المبلغ')
        hasError = true
        amountRef.current?.focus()
      } else if (Number(amount) <= 0) {
        setAmountError('يجب أن يكون المبلغ أكبر من صفر')
        hasError = true
        amountRef.current?.focus()
      } else {
        setAmountError('')
      }
    }

    if (!trimmedParty) {
      setPartyError('يرجى إدخال اسم الطرف')
      if (!hasError) partyRef.current?.focus()
      hasError = true
    } else {
      setPartyError('')
    }

    if (hasError) return

    setSaving(true)
    setError('')

    try {
      if (isCheckTxn) {
        const fd = new FormData()
        fd.append('payload', JSON.stringify({
          type: txnType,
          party_id: partyId || null,
          party_name: partyId ? null : trimmedParty,
          party_phone: partyId ? null : (partyPhone.trim() || null),
          transaction_date: date,
          note: notes || null,
          cheques: workingCheques.map((c, i) => ({
            client_key: `ck_${i}`,
            amount: String(Number(c.amount)),
            check_no: c.check_no.trim() || null,
            bank: c.bank.trim() || null,
            branch: c.branch.trim() || null,
            due_date: c.due_date || null,
            source_transaction_id: c.source_transaction_id || null,
          })),
        }))
        workingCheques.forEach((c, i) => {
          if (c.attachment) {
            fd.append('files', c.attachment, `ck_${i}::${c.attachment.name}`)
          }
        })
        const created = await createTransactionsBatch(projectId, fd)
        if (onSave) onSave(created)
        onBack()
      } else {
        const formData = new FormData()
        formData.append('type', txnType)
        formData.append('amount', String(Number(amount)))
        formData.append('transaction_date', date)
        formData.append('status', 'cleared')
        if (notes) formData.append('note', notes)

        if (partyId) {
          formData.append('party_id', String(partyId))
        } else {
          formData.append('party_name', trimmedParty)
          if (partyPhone.trim()) formData.append('party_phone', partyPhone.trim())
        }

        files.forEach((f) => formData.append('files', f))

        const newTx = await createTransaction(projectId, formData)

        if (onSave) onSave(newTx)
        onBack()
      }
    } catch (err) {
      setError(err?.message || 'تعذّر حفظ الحركة')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="atv animate-fade">
      <div className="atv__back" onClick={onBack}><ArrowLeft size={16} /> رجوع إلى الحركات المالية</div>

      <div className="atv__grid">
        <div className="atv__col">

          <div className="atv-card">
            <h2 className="atv-card__title">إضافة حركة مالية</h2>
            <p className="atv-card__sub">اختر نوع الحركة ثم عبّئ التفاصيل — كل شيء في صفحة واحدة</p>
            <label className="atv-label">نوع الحركة</label>
            <div className="atv-types">
              {FINANCE_TXN_TYPES.map((t) => {
                const on = txnType === t.id
                return (
                  <div
                    key={t.id}
                    className="atv-type"
                    onClick={() => handleTypeChange(t.id)}
                    style={{ borderColor: on ? t.color : 'var(--line)', background: on ? t.color + '12' : '#fff' }}
                  >
                    <div className="atv-type__icon" style={{ background: t.color + '1f' }}>{t.icon}</div>
                    <div className="atv-type__label">{t.label}</div>
                    <div className="atv-type__sub">{t.sub}</div>
                    {on && <span className="atv-type__check" style={{ background: t.color }}>✓</span>}
                  </div>
                )
              })}
            </div>
          </div>

          {isCashOut && (
            <div className="atv-cash-card">
              <span className="atv-cash-card__label">الكاش المتوفر حاليًا</span>
              {cashOnHandLoading ? (
                <span className="atv-cash-card__state">جارٍ تحميل الرصيد...</span>
              ) : cashOnHand == null ? (
                <span className="atv-cash-card__state">تعذّر تحميل الكاش المتوفر</span>
              ) : (
                <span className="atv-cash-card__value">{formatCurrency(cashOnHand, { signed: cashOnHand < 0 })}</span>
              )}
            </div>
          )}

          {isCheckTxn && (
            <div className="atv-card">
              <div className="atv-card__head-row">
                <h3 className="atv-card__title-sm">الشيكات</h3>
                <span className="atv-card__count">{cheques.length} شيك</span>
              </div>
              <p className="atv-card__sub">أدخل بيانات كل شيك على حدة — الطرف والتاريخ والملاحظات مشتركة</p>

              <div className="atv-cheque-count">
                <Field label="عدد الشيكات">
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={chequeCount}
                    onChange={(e) => handleChequeCountChange(e.target.value)}
                    onBlur={handleChequeCountBlur}
                    placeholder="1"
                  />
                </Field>
              </div>

              <div className="atv-cheques">
                {cheques.map((c, idx) => {
                  const err = chequeErrors[idx] || {}
                  const hasErr = Object.keys(err).some((k) => k !== 'attachment')
                  return (
                    <div key={idx} className={`atv-cheque ${hasErr ? 'is-error' : ''}`}>
                      <div className="atv-cheque__head">
                        <span className="atv-cheque__title">شيك {idx + 1}</span>
                        {cheques.length > 1 && (
                          <button type="button" className="atv-cheque__remove" title="حذف الشيك" onClick={() => handleChequeDelete(idx)}>×</button>
                        )}
                      </div>
                      {hasErr && (
                        <div className="atv-cheque__error">بيانات شيك {idx + 1} غير مكتملة</div>
                      )}
                      <div className="atv-two">
                        <Field label="المبلغ (₪)">
                          <Input type="text" inputMode="numeric" value={c.amount} onChange={(e) => handleChequeField(idx, 'amount', e.target.value.replace(/\D/g, ''))} placeholder="0" className={err.amount ? 'inp--error' : ''} />
                          {err.amount && <div className="atv-field-error">{err.amount}</div>}
                        </Field>
                        <Field label="رقم الشيك">
                          <Input value={c.check_no} onChange={(e) => handleChequeField(idx, 'check_no', e.target.value)} placeholder="مثال: 7830" className={err.check_no ? 'inp--error' : ''} />
                          {err.check_no && <div className="atv-field-error">{err.check_no}</div>}
                        </Field>
                        <Field label="اسم البنك">
                          <Input value={c.bank} onChange={(e) => handleChequeField(idx, 'bank', e.target.value)} placeholder="مثال: بنك فلسطين" />
                        </Field>
                        <Field label="تاريخ الاستحقاق">
                          <Input type="date" value={c.due_date} onChange={(e) => handleChequeField(idx, 'due_date', e.target.value)} className={err.due_date ? 'inp--error' : ''} />
                          {err.due_date && <div className="atv-field-error">{err.due_date}</div>}
                        </Field>
                      </div>
                      {isCheckOut && (
                        <div className="atv-cheque__source">
                          <Field label="اختيار شيك مستلم من النظام (اختياري)">
                            <div className={`atv-src-dropdown ${sourceOpen === idx ? 'is-open' : ''}`}>
                              <button
                                type="button"
                                className={`atv-src-dropdown__trigger ${c.source_transaction_id ? 'is-chosen' : ''}`}
                                onClick={() => setSourceOpen(sourceOpen === idx ? null : idx)}
                              >
                                <span className="atv-src-dropdown__label">
                                  {c.source_transaction_id
                                    ? (() => {
                                        const chosen = pendingChecksPool.find((p) => p.id === c.source_transaction_id)
                                        return chosen ? `شيك #${chosen.no || chosen.id}` : 'شيك جديد — إدخال يدوي'
                                      })()
                                    : 'شيك جديد — إدخال يدوي'}
                                </span>
                                <span className="atv-src-dropdown__caret">▾</span>
                              </button>
                              {sourceOpen === idx && (
                                <div className="atv-src-dropdown__menu">
                                  <button
                                    type="button"
                                    className={`atv-src-dropdown__opt ${!c.source_transaction_id ? 'is-selected' : ''}`}
                                    onClick={() => {
                                      handleSourceSelect(idx, '')
                                      setSourceOpen(null)
                                    }}
                                  >
                                    <span className="atv-src-dropdown__opt-title">شيك جديد — إدخال يدوي</span>
                                  </button>
                                  {pendingChecksPool.map((p) => {
                                    const disabled = usedSourceIds.includes(p.id) && c.source_transaction_id !== p.id
                                    return (
                                      <button
                                        key={p.id}
                                        type="button"
                                        className={`atv-src-dropdown__opt ${c.source_transaction_id === p.id ? 'is-selected' : ''} ${disabled ? 'is-disabled' : ''}`}
                                        onClick={() => {
                                          if (disabled) return
                                          handleSourceSelect(idx, String(p.id))
                                          setSourceOpen(null)
                                        }}
                                      >
                                        <span className="atv-src-dropdown__opt-main">
                                          <span className="atv-src-dropdown__opt-title">شيك #{p.no || p.id}</span>
                                          <span className="atv-src-dropdown__opt-sub">
                                            {p.bank || 'بدون بنك'}{p.g ? ` · ${formatDateAr(p.g)}` : ''}{p.party_name ? ` · ${p.party_name}` : ''}
                                          </span>
                                        </span>
                                        <span className="atv-src-dropdown__opt-amount">{formatMoney(p.amount)}</span>
                                      </button>
                                    )
                                  })}
                                </div>
                              )}
                            </div>
                            <span className="atv-cheque__source-hint">عند الاختيار تُعبّأ بيانات هذا الشيك فقط من النظام</span>
                          </Field>
                        </div>
                      )}

                      <div className="atv-cheque-attach">
                        <span className="atv-cheque-attach__label">صورة الشيك</span>
                        {c.attachment ? (
                          <div className="atv-cheque-attach__file">
                            {c.attachment.type.startsWith('image/') ? (
                              <img src={URL.createObjectURL(c.attachment)} alt="" className="atv-cheque-attach__thumb" />
                            ) : (
                              <div className="atv-cheque-attach__pdf">📄</div>
                            )}
                            <div className="atv-cheque-attach__info">
                              <span className="atv-cheque-attach__name">{c.attachment.name}</span>
                              <span className="atv-cheque-attach__size">{Math.round(c.attachment.size / 1024)} KB</span>
                            </div>
                            <button
                              type="button"
                              className="atv-cheque-attach__remove"
                              title="إزالة المرفق"
                              onClick={() => removeChequeAttachment(idx)}
                            >×</button>
                          </div>
                        ) : (
                          <div
                            className={`atv-cheque-attach__drop ${chequeDragIndex === idx ? 'is-dragover' : ''}`}
                            onClick={() => chequeFileInputRefs.current[idx]?.click()}
                            onDrop={(e) => handleChequeAttachmentDrop(e, idx)}
                            onDragOver={(e) => handleChequeAttachmentDragOver(e, idx)}
                            onDragLeave={handleChequeAttachmentDragLeave}
                          >
                            <span className="atv-cheque-attach__icon">🖼</span>
                            <span className="atv-cheque-attach__text">اسحب ملفًا هنا أو اضغط للاختيار</span>
                            <span className="atv-cheque-attach__hint">JPG / PNG / PDF · حتى 10MB · ملف واحد</span>
                            <input
                              ref={(el) => { chequeFileInputRefs.current[idx] = el }}
                              type="file"
                              accept="image/jpeg,image/png,application/pdf"
                              onChange={(e) => handleChequeAttachmentInput(e, idx)}
                              style={{ display: 'none' }}
                            />
                          </div>
                        )}
                        {err.attachment && <div className="atv-field-error">{err.attachment}</div>}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="atv-card">
            <h3 className="atv-card__title-sm" style={{ marginBottom: 18 }}>تفاصيل الحركة</h3>
            <div className="atv-two">
              {!isCheckTxn && (
                <Field label="المبلغ (₪)">
                  <Input ref={amountRef} type="text" value={amount} onChange={(e) => { setAmount(e.target.value.replace(/\D/g, '')); setAmountError('') }} inputMode="numeric" placeholder="0" className={amountError ? 'inp--error' : ''} />
                  {amountError && <div className="atv-field-error">{amountError}</div>}
                </Field>
              )}
              <Field label="التاريخ"><Input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <div style={{ gridColumn: '1/-1' }}>
                <Field label="الطرف (اسم الشخص/الجهة)">
                  <Input
                    ref={partyRef}
                    value={party}
                    onChange={(e) => { handlePartyChange(e.target.value); setPartyError('') }}
                    onFocus={() => setPartyOpen(true)}
                    onBlur={() => setPartyOpen(false)}
                    onClick={() => setPartyOpen(true)}
                    placeholder="مثال: مؤسسة النور للمقاولات"
                    autoComplete="off"
                    className={partyError ? 'inp--error' : ''}
                  />
                  {partyError && <div className="atv-field-error">{partyError}</div>}
                </Field>
                {partyId ? (
                  <div className="atv-party-selected">تم اختيار: {party}</div>
                ) : (
                  partyOpen && partySuggestions.length > 0 && (
                    <div className="atv-party-suggestions">
                      {partySuggestions.map((suggestion) => (
                        <button
                          key={suggestion.id}
                          type="button"
                          className="atv-party-suggestions__item"
                          onMouseDown={(e) => { e.preventDefault(); handlePartyPick(suggestion) }}
                        >
                          {suggestion.name}
                        </button>
                      ))}
                    </div>
                  )
                )}
              </div>
            </div>

            {showPhoneField && (
              <div style={{ marginTop: 16 }}>
                <Field label="رقم الهاتف (اختياري)">
                  <Input type="tel" inputMode="tel" value={partyPhone} onChange={(e) => setPartyPhone(e.target.value)} placeholder="مثال:0525577191" />
                </Field>
              </div>
            )}

            <div style={{ marginTop: 16 }}>
              <Field label="ملاحظات (اختياري)"><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="أي تفاصيل إضافية…" /></Field>
            </div>
          </div>

          <div className="atv-card">
            <h3 className="atv-card__title-sm" style={{ marginBottom: 4 }}>{uploadLabel}</h3>
            <p className="atv-card__sub" style={{ marginBottom: 16 }}>أرفق صورة الشيك أو الفاتورة/الإيصال — تظهر معاينة صغيرة</p>
            <div className="atv-upload">
              <div
                className={`atv-dropzone ${dragOver ? 'is-dragover' : ''}`}
                onClick={() => fileInputRef.current?.click()}
                onDrop={handleDrop}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
              >
                <span className="atv-dropzone__icon">🖼</span>
                <span className="atv-dropzone__text">اسحب الملف هنا أو اضغط للرفع</span>
                <span className="atv-dropzone__hint">JPG / PNG / PDF · حتى 10MB · أكثر من ملف</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  multiple
                  accept="image/jpeg,image/png,application/pdf"
                  onChange={handleFileInput}
                  style={{ display: 'none' }}
                />
              </div>
              {files.length > 0 && (
                <div className="atv-file-previews">
                  {files.map((f, i) => {
                    const preview = getFilePreview(f)
                    return (
                      <div key={i} className="atv-file-preview">
                        {preview ? (
                          <img src={preview} alt="" className="atv-file-preview__img" />
                        ) : (
                          <div className="atv-file-preview__pdf-icon">📄</div>
                        )}
                        <div className="atv-file-preview__info">
                          <span className="atv-file-preview__name">{f.name}</span>
                          <span className="atv-file-preview__size">{Math.round(f.size / 1024)} KB</span>
                        </div>
                        <button type="button" className="atv-file-preview__remove" onClick={() => removeFile(i)}>✕</button>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="atv-side">
          <div className="atv-side__card">
            <div className="atv-side__title">ملخص الحركة</div>
            <div className="atv-side__type-row">
              <div className="atv-side__icon" style={{ background: (FINANCE_TXN_TYPES.find((t) => t.id === txnType)?.color || '#2563eb') + '1f' }}>
                {FINANCE_TXN_TYPES.find((t) => t.id === txnType)?.icon || '💵'}
              </div>
              <div>
                <div className="atv-side__type" style={{ color: FINANCE_TXN_TYPES.find((t) => t.id === txnType)?.color || '#2563eb' }}>{tm.label}</div>
                <div className="atv-side__dir">{isIn ? 'حركة واردة (+)' : 'حركة صادرة (−)'}</div>
              </div>
            </div>
            <div className="atv-side__amount" style={{ color: isIn ? '#10b981' : '#ef4444' }}>
              {isIn ? '+ ' : '− '}{pvAmount} <span>₪</span>
            </div>
            <div className="atv-side__rows">
              <div className="atv-side__row"><span>الطرف</span><span>{party.trim() || '—'}</span></div>
              {isCheckTxn ? (
                <>
                  <div className="atv-side__row"><span>عدد الشيكات</span><span>{cheques.length}</span></div>
                  <div className="atv-side__row"><span>إجمالي القيمة</span><span>{pvAmount} ₪</span></div>
                </>
              ) : (
                <div className="atv-side__row"><span>الطريقة</span><span>{pvMethod}</span></div>
              )}
            </div>
          </div>
          <div className="atv-side__actions">
            <Button variant="primary" full onClick={handleSave} disabled={saving}>{saving ? 'جارٍ الحفظ...' : 'حفظ الحركة'}</Button>
            <Button variant="secondary" full onClick={onBack}>إلغاء</Button>
          </div>
          {error && <div className="atv-error">{error}</div>}
        </div>
      </div>
    </div>
  )
}
