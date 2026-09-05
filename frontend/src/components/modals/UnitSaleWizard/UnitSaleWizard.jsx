import { useEffect, useMemo, useState } from 'react'
import Modal from '../../ui/Modal/Modal.jsx'
import Field from '../../ui/Field/Field.jsx'
import { Input, Textarea } from '../../ui/Input/Input.jsx'
import Button from '../../ui/Button/Button.jsx'
import { listParties, createUnitSale } from '../../../utils/api.js'
import './UnitSaleWizard.css'

const STEPS = ['المشتري', 'بيانات البيع', 'الشيكات', 'العقد', 'المراجعة']
const ACCEPTED = ['image/jpeg', 'image/png', 'application/pdf']
const MAX_SIZE = 10 * 1024 * 1024

const TYPE_LABEL = { apartment: 'شقة', roof: 'روف', storage: 'مخزن', studio: 'استوديو' }
const STATUS_LABEL = { available: 'متاحة', reserved: 'محجوزة', sold: 'مبيوعة' }

const todayISO = () => new Date().toISOString().slice(0, 10)

function isFileOk(file) {
  return file && ACCEPTED.includes(file.type) && file.size <= MAX_SIZE
}

function emptyCheque(i) {
  return { client_key: `chk_${i}`, amount: '', check_no: '', bank: '', branch: '', due_date: '', attachment: null, preview: null }
}

export default function UnitSaleWizard({ projectId, unit, preselectedParty = null, onClose, onSaved }) {
  const [step, setStep] = useState(0)
  const [parties, setParties] = useState([])
  const [partiesError, setPartiesError] = useState('')

  const [selectedParty, setSelectedParty] = useState(preselectedParty)
  const [buyerName, setBuyerName] = useState(preselectedParty ? preselectedParty.name : '')
  const [buyerPhone, setBuyerPhone] = useState(preselectedParty ? (preselectedParty.phone || '') : '')
  const [showMatches, setShowMatches] = useState(false)

  const [salePrice, setSalePrice] = useState('')
  const [downPayment, setDownPayment] = useState('')
  const [saleDate, setSaleDate] = useState(todayISO())
  const [notes, setNotes] = useState('')

  const [chequeCount, setChequeCount] = useState('')
  const [cheques, setCheques] = useState([])
  const [contractFile, setContractFile] = useState(null)
  const [contractPreview, setContractPreview] = useState(null)

  const [errors, setErrors] = useState({})
  const [submitError, setSubmitError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  useEffect(() => {
    let active = true
    listParties({ project_id: projectId })
      .then((rows) => { if (active) setParties(rows || []) })
      .catch(() => { if (active) setPartiesError('تعذّر تحميل قائمة الأطراف') })
    return () => { active = false }
  }, [projectId])

  const matches = useMemo(() => {
    const q = buyerName.trim()
    if (!q || selectedParty) return []
    return parties
      .filter((p) => p.name.includes(q) || (p.phone || '').includes(q))
      .slice(0, 6)
  }, [buyerName, parties, selectedParty])

  const priceNum = salePrice === '' ? null : Number(salePrice)
  const downNum = downPayment === '' ? null : Number(downPayment)
  const remaining = (priceNum != null && downNum != null) ? priceNum - downNum : null

  const chequesTotal = cheques.reduce((sum, c) => {
    const v = Number(c.amount)
    return sum + (Number.isFinite(v) && v > 0 ? v : 0)
  }, 0)
  const unscheduled = remaining != null ? remaining - chequesTotal : null

  const chequesOk = (chequeCount.trim() === '' || parseInt(chequeCount, 10) === 0) || cheques.length > 0

  const validations = {
    0: () => {
      const errs = {}
      if (!selectedParty && !buyerName.trim()) errs.buyer = 'اسم المشتري مطلوب'
      return errs
    },
    1: () => {
      const errs = {}
      if (salePrice === '' || priceNum == null || !(priceNum > 0)) errs.sale_price = 'يجب إدخال سعر بيع أكبر من صفر'
      if (downPayment !== '' && (downNum == null || downNum < 0)) errs.down_payment = 'الدفعة الأولى لا يمكن أن تكون سالبة'
      if (downNum != null && priceNum != null && downNum > priceNum) errs.down_payment = 'الدفعة الأولى لا يمكن أن تتجاوز سعر البيع'
      if (!saleDate) errs.sale_date = 'تاريخ البيع مطلوب'
      return errs
    },
    2: () => {
      const errs = {}
      const count = chequeCount.trim() === '' ? 0 : parseInt(chequeCount, 10)
      if (count > 0) {
        cheques.forEach((c, i) => {
          const v = Number(c.amount)
          if (c.amount === '' || !(v > 0)) errs[`amount_${i}`] = 'مبلغ الشيك مطلوب وأكبر من صفر'
        })
        if (downNum != null && downNum + chequesTotal > priceNum) errs.total = 'مجموع الدفعة الأولى والشيكات يتجاوز سعر البيع'
      }
      return errs
    },
    3: () => {
      const errs = {}
      if (!contractFile) errs.contract = 'يجب رفع ملف عقد البيع (JPG/PNG/PDF حتى 10MB)'
      return errs
    },
    4: () => ({}),
  }

  const canNext = () => {
    const errs = validations[step]()
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const next = () => {
    if (!canNext()) return
    if (step === 1) {
      const count = chequeCount.trim() === '' ? 0 : parseInt(chequeCount, 10)
      if (count === 0) setCheques([])
    }
    setErrors({})
    setStep((s) => s + 1)
  }

  const back = () => {
    setErrors({})
    setStep((s) => Math.max(0, s - 1))
  }

  const onBuyerName = (value) => {
    setSelectedParty(null)
    setBuyerName(value)
    setShowMatches(true)
  }

  const chooseParty = (p) => {
    setSelectedParty(p)
    setBuyerName(p.name)
    setBuyerPhone(p.phone || '')
    setShowMatches(false)
    setErrors((e) => ({ ...e, buyer: '' }))
  }

  const clearParty = () => {
    setSelectedParty(null)
    setBuyerName('')
    setBuyerPhone('')
  }

  const onChequeCountChange = (value) => {
    setChequeCount(value.replace(/\D/g, ''))
    const n = value.replace(/\D/g, '')
    const count = n === '' ? 0 : parseInt(n, 10)
    setCheques((prev) => {
      const next = []
      for (let i = 0; i < count; i++) next.push(prev[i] || emptyCheque(i))
      return next
    })
  }

  const onChequeCountBlur = () => {
    if (chequeCount.trim() === '') setChequeCount('0')
  }

  const setChequeField = (index, field, value) => {
    setCheques((prev) => prev.map((c, i) => (i === index ? { ...c, [field]: value } : c)))
  }

  const onChequeFile = (index, file) => {
    if (!file) return
    if (!isFileOk(file)) {
      setErrors((e) => ({ ...e, [`file_${index}`]: 'النوع مسموح: JPG/PNG/PDF · الحد الأقصى 10MB' }))
      return
    }
    setErrors((e) => ({ ...e, [`file_${index}`]: '' }))
    const preview = file.type.startsWith('image/') ? URL.createObjectURL(file) : null
    setChequeField(index, 'attachment', file)
    setChequeField(index, 'preview', preview)
  }

  const onContractFile = (file) => {
    if (!file) return
    if (!isFileOk(file)) {
      setErrors((e) => ({ ...e, contract: 'النوع مسموح: JPG/PNG/PDF · الحد الأقصى 10MB' }))
      return
    }
    setErrors((e) => ({ ...e, contract: '' }))
    setContractFile(file)
    setContractPreview(file.type.startsWith('image/') ? URL.createObjectURL(file) : null)
  }

  const handleConfirm = async () => {
    if (submitting) return
    setSubmitting(true)
    setSubmitError('')
    try {
      const fd = new FormData()
      const payload = {
        unit_id: unit.id,
        buyer_party_id: selectedParty ? selectedParty.id : null,
        buyer_name: selectedParty ? null : buyerName.trim(),
        buyer_phone: selectedParty ? null : (buyerPhone.trim() || null),
        sale_price: String(priceNum),
        down_payment: downPayment === '' ? '0' : String(downNum),
        sale_date: saleDate,
        notes: notes.trim() || null,
        cheques: cheques
          .filter((c) => c.amount !== '' && Number(c.amount) > 0)
          .map((c) => ({
            client_key: c.client_key,
            amount: String(Number(c.amount)),
            check_no: c.check_no.trim() || null,
            bank: c.bank.trim() || null,
            branch: c.branch.trim() || null,
            due_date: c.due_date || null,
          })),
      }
      fd.append('payload', JSON.stringify(payload))
      if (contractFile) fd.append('files', contractFile, `contract::${contractFile.name}`)
      cheques.forEach((c) => {
        if (c.attachment) fd.append('files', c.attachment, `${c.client_key}::${c.attachment.name}`)
      })
      await createUnitSale(projectId, fd)
      if (onSaved) onSaved()
      onClose()
    } catch (err) {
      setSubmitError(err?.message || 'فشل تنفيذ البيع')
    } finally {
      setSubmitting(false)
    }
  }

  const footer = (
    <>
      <Button variant="secondary" onClick={onClose} disabled={submitting}>إلغاء</Button>
      {step > 0 && <Button variant="secondary" onClick={back} disabled={submitting}>رجوع</Button>}
      {step < STEPS.length - 1 && (
        <Button variant="primary" onClick={next}>التالي</Button>
      )}
      {step === STEPS.length - 1 && (
        <Button variant="primary" onClick={handleConfirm} disabled={submitting}>
          {submitting ? 'جارٍ تنفيذ البيع...' : 'تأكيد البيع'}
        </Button>
      )}
    </>
  )

  const chequeCountValue = parseInt(chequeCount, 10) || 0
  const chequeImagesCount = cheques.filter((c) => c.attachment).length

  return (
    <Modal
      title={`بيع الوحدة — ${TYPE_LABEL[unit.unit_type] || 'وحدة'} ${unit.no}`}
      subtitle={step < STEPS.length - 1 ? `الخطوة ${step + 1} من ${STEPS.length}` : 'راجع كل التفاصيل قبل التأكيد'}
      onClose={onClose}
      width={680}
      footer={footer}
    >
      <div className="usw">
        <div className="usw__steps">
          {STEPS.map((label, i) => (
            <div key={label} className={`usw__step ${i === step ? 'is-active' : ''} ${i < step ? 'is-done' : ''}`}>
              <span className="usw__step-dot">{i < step ? '✓' : i + 1}</span>
              <span className="usw__step-label">{label}</span>
            </div>
          ))}
        </div>

        <div className="usw__unit">
          <div className="usw__unit-name">{unit.no}</div>
          <div className="usw__unit-meta">
            <span>{TYPE_LABEL[unit.unit_type] || unit.unit_type}</span>
            {unit.area != null && <span>{unit.area} م²</span>}
            <span>الطابق {unit.floor}</span>
            <span className={`usw__pill usw__pill--${unit.status}`}>{STATUS_LABEL[unit.status] || unit.status}</span>
          </div>
        </div>

        {step === 0 && (
          <div className="usw__body">
            {partiesError && <div className="usw__error">{partiesError}</div>}
            <Field label="اسم المشتري">
              <Input
                value={buyerName}
                placeholder="ابحث عن طرف موجود أو اكتب اسمًا جديدًا"
                onChange={(e) => onBuyerName(e.target.value)}
                onFocus={() => setShowMatches(true)}
                onBlur={() => setTimeout(() => setShowMatches(false), 150)}
              />
            </Field>
            {selectedParty && (
              <div className="usw__selected">
                <span>تم اختيار الطرف: <b>{selectedParty.name}</b>{selectedParty.phone ? ` • ${selectedParty.phone}` : ''}</span>
                <button type="button" onClick={clearParty}>تغيير</button>
              </div>
            )}
            {showMatches && !selectedParty && matches.length > 0 && (
              <div className="usw__matches">
                {matches.map((p) => (
                  <button type="button" key={p.id} className="usw__match" onMouseDown={(e) => { e.preventDefault(); chooseParty(p) }}>
                    <span className="usw__match-name">{p.name}</span>
                    <span className="usw__match-phone">{p.phone || '—'}</span>
                  </button>
                ))}
              </div>
            )}
            <Field label="رقم الهاتف">
              <Input value={buyerPhone} placeholder="مثال: 0599 123 456" onChange={(e) => setBuyerPhone(e.target.value)} inputMode="tel" />
            </Field>
            {errors.buyer && <div className="usw__error">{errors.buyer}</div>}
            <div className="usw__hint">{selectedParty ? 'سيتم استخدام هذا الطرف كما هو دون إنشاء طرف جديد.' : 'إذا كان الاسم جديدًا سيتم إنشاء طرف واحد فقط عند تأكيد البيع.'}</div>
          </div>
        )}

        {step === 1 && (
          <div className="usw__body">
            <div className="usw__grid2">
              <Field label="سعر البيع (₪)">
                <Input inputMode="decimal" value={salePrice} placeholder="0" onChange={(e) => setSalePrice(e.target.value.replace(/[^\d.]/g, ''))} />
              </Field>
              <Field label="الدفعة الأولى (₪)">
                <Input inputMode="decimal" value={downPayment} placeholder="0" onChange={(e) => setDownPayment(e.target.value.replace(/[^\d.]/g, ''))} />
              </Field>
            </div>
            <Field label="تاريخ البيع">
              <Input type="date" value={saleDate} onChange={(e) => setSaleDate(e.target.value)} />
            </Field>
            <Field label="ملاحظات (اختياري)">
              <Textarea rows={3} value={notes} placeholder="أي تفاصيل إضافية عن البيع..." onChange={(e) => setNotes(e.target.value)} />
            </Field>
            <div className="usw__totals">
              <div className="usw__totals-row"><span>سعر البيع</span><b>{priceNum != null ? priceNum.toLocaleString() : '—'} ₪</b></div>
              <div className="usw__totals-row"><span>الدفعة الأولى</span><b>{downNum != null ? downNum.toLocaleString() : '—'} ₪</b></div>
              <div className="usw__totals-row usw__totals-row--strong"><span>المبلغ المتبقي</span><b>{remaining != null ? remaining.toLocaleString() : '—'} ₪</b></div>
            </div>
            {errors.sale_price && <div className="usw__error">{errors.sale_price}</div>}
            {errors.down_payment && <div className="usw__error">{errors.down_payment}</div>}
            {errors.sale_date && <div className="usw__error">{errors.sale_date}</div>}
          </div>
        )}

        {step === 2 && (
          <div className="usw__body">
            <Field label="عدد شيكات القبض">
              <Input inputMode="numeric" value={chequeCount} placeholder="0" onChange={(e) => onChequeCountChange(e.target.value)} onBlur={onChequeCountBlur} />
            </Field>

            {chequeCountValue === 0 ? (
              <div className="usw__none">لا توجد شيكات ضمن خطة الدفع</div>
            ) : (
              <div className="usw__cheques">
                {cheques.map((c, i) => (
                  <div key={c.client_key} className="usw__cheque">
                    <div className="usw__cheque-head">شيك {i + 1}</div>
                    <div className="usw__grid2">
                      <Field label="المبلغ (₪)">
                        <Input inputMode="decimal" value={c.amount} placeholder="0" onChange={(e) => setChequeField(i, 'amount', e.target.value.replace(/[^\d.]/g, ''))} />
                      </Field>
                      <Field label="رقم الشيك">
                        <Input value={c.check_no} placeholder="مثال: 123456" onChange={(e) => setChequeField(i, 'check_no', e.target.value)} />
                      </Field>
                    </div>
                    <div className="usw__grid2">
                      <Field label="البنك">
                        <Input value={c.bank} placeholder="اسم البنك" onChange={(e) => setChequeField(i, 'bank', e.target.value)} />
                      </Field>
                      <Field label="الفرع">
                        <Input value={c.branch} placeholder="الفرع (اختياري)" onChange={(e) => setChequeField(i, 'branch', e.target.value)} />
                      </Field>
                    </div>
                    <Field label="تاريخ الاستحقاق">
                      <Input type="date" value={c.due_date} onChange={(e) => setChequeField(i, 'due_date', e.target.value)} />
                    </Field>
                    <Field label="صورة الشيك (اختياري)">
                      <label className="usw__file">
                        <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => onChequeFile(i, e.target.files[0])} />
                        {c.preview ? <img src={c.preview} alt="صورة الشيك" /> : <span className="usw__file-empty">📎 اختر صورة أو ملف الشيك</span>}
                      </label>
                      {c.attachment && <div className="usw__file-meta">{c.attachment.name} · {(c.attachment.size / 1024 / 1024).toFixed(2)}MB</div>}
                      {c.attachment && <button type="button" className="usw__file-clear" onClick={() => { setChequeField(i, 'attachment', null); setChequeField(i, 'preview', null) }}>إزالة الملف</button>}
                      {errors[`file_${i}`] && <div className="usw__error">{errors[`file_${i}`]}</div>}
                      {errors[`amount_${i}`] && <div className="usw__error">{errors[`amount_${i}`]}</div>}
                    </Field>
                  </div>
                ))}
              </div>
            )}

            <div className="usw__totals">
              <div className="usw__totals-row"><span>سعر البيع</span><b>{priceNum != null ? priceNum.toLocaleString() : '—'} ₪</b></div>
              <div className="usw__totals-row"><span>الدفعة الأولى</span><b>{downNum != null ? downNum.toLocaleString() : '—'} ₪</b></div>
              <div className="usw__totals-row"><span>إجمالي الشيكات</span><b>{chequesTotal.toLocaleString()} ₪</b></div>
              <div className={`usw__totals-row ${unscheduled != null && unscheduled > 0 ? 'is-warn' : ''}`}>
                <span>المتبقي غير المجدول</span>
                <b>{unscheduled != null ? unscheduled.toLocaleString() : '—'} ₪</b>
              </div>
            </div>
            {unscheduled != null && unscheduled > 0 && (
              <div className="usw__hint">متبقي غير مجدول: {unscheduled.toLocaleString()} ₪ — يمكن للعميل دفع باقي المبلغ لاحقًا.</div>
            )}
            {errors.total && <div className="usw__error">{errors.total}</div>}
          </div>
        )}

        {step === 3 && (
          <div className="usw__body">
            <div className="usw__contract-title">عقد البيع</div>
            <Field label="ملف العقد (مطلوب — ملف واحد على الأقل)">
              <label className={`usw__file usw__file--contract ${contractFile ? 'has-file' : ''}`}>
                <input type="file" accept="image/jpeg,image/png,application/pdf" onChange={(e) => onContractFile(e.target.files[0])} />
                {contractFile ? (
                  contractPreview
                    ? <img src={contractPreview} alt="عقد البيع" />
                    : <span className="usw__file-ok">📄 {contractFile.name}</span>
                ) : (
                  <span className="usw__file-empty">📄 اختر ملف العقد (JPG/PNG/PDF · حتى 10MB)</span>
                )}
              </label>
              {contractFile && (
                <div className="usw__file-meta">{contractFile.name} · {(contractFile.size / 1024 / 1024).toFixed(2)}MB</div>
              )}
              {contractFile && <button type="button" className="usw__file-clear" onClick={() => { setContractFile(null); setContractPreview(null) }}>حذف / استبدال</button>}
              {errors.contract && <div className="usw__error">{errors.contract}</div>}
            </Field>
          </div>
        )}

        {step === 4 && (
          <div className="usw__body">
            <div className="usw__review">
              <div className="usw__review-title">الوحدة</div>
              <div className="usw__review-grid">
                <div><span>النوع</span><b>{TYPE_LABEL[unit.unit_type] || unit.unit_type}</b></div>
                <div><span>الرقم</span><b>{unit.no}</b></div>
                {unit.area != null && <div><span>المساحة</span><b>{unit.area} م²</b></div>}
                <div><span>الطابق</span><b>{unit.floor}</b></div>
              </div>

              <div className="usw__review-title">المشتري</div>
              <div className="usw__review-grid">
                <div><span>الاسم</span><b>{selectedParty ? selectedParty.name : buyerName.trim()}</b></div>
                <div><span>الهاتف</span><b>{buyerPhone.trim() || '—'}</b></div>
              </div>

              <div className="usw__review-title">البيع</div>
              <div className="usw__review-grid">
                <div><span>سعر البيع</span><b>{priceNum != null ? priceNum.toLocaleString() : '—'} ₪</b></div>
                <div><span>الدفعة الأولى</span><b>{downNum != null ? downNum.toLocaleString() : '0'} ₪</b></div>
                <div><span>إجمالي الشيكات</span><b>{chequesTotal.toLocaleString()} ₪</b></div>
                <div><span>المتبقي غير المجدول</span><b>{unscheduled != null ? unscheduled.toLocaleString() : '—'} ₪</b></div>
                <div><span>عدد الشيكات</span><b>{chequeCountValue}</b></div>
                <div><span>تاريخ البيع</span><b>{saleDate}</b></div>
              </div>

              <div className="usw__review-title">المرفقات</div>
              <div className="usw__review-grid">
                <div><span>العقد</span><b>{contractFile ? contractFile.name : '—'}</b></div>
                <div><span>صور الشيكات</span><b>{chequeImagesCount}</b></div>
              </div>

              <div className="usw__review-title">الموقف المخصص</div>
              <div className="usw__review-grid">
                <div><span>الموقف</span><b>{unit.assigned_parking_no != null ? `موقف ${unit.assigned_parking_no}` : 'لا يوجد موقف مخصص'}</b></div>
              </div>
            </div>
            {submitError && <div className="usw__error">{submitError}</div>}
          </div>
        )}
      </div>
    </Modal>
  )
}
