import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'
import { useEffect, useState } from 'react'
import {
  listProjectUnits,
  listProjectParkingSpots,
  propertySetup,
  createUnit,
  updateUnit,
  deleteUnitApi,
  createParkingSpot,
  updateParkingSpot,
  deleteParkingSpotApi,
} from '../../utils/api.js'
import Field from '../../components/ui/Field/Field.jsx'
import { Input, Select } from '../../components/ui/Input/Input.jsx'
import Button from '../../components/ui/Button/Button.jsx'
import Modal from '../../components/ui/Modal/Modal.jsx'
import UnitSaleWizard from '../../components/modals/UnitSaleWizard/UnitSaleWizard.jsx'
import './BuildingParking.css'

const UNIT_TYPE_LABEL = { apartment: 'شقة', roof: 'روف', storage: 'مخزن', studio: 'استوديو' }
const UNIT_STATUS_LABEL = { available: 'متاحة', reserved: 'محجوزة', sold: 'مبيوعة' }
const UNIT_TYPE_OPTIONS = [
  { value: 'apartment', label: 'شقة' },
  { value: 'roof', label: 'روف' },
  { value: 'storage', label: 'مخزن' },
  { value: 'studio', label: 'استوديو' },
]
const UNIT_STATUS_OPTIONS = [
  { value: 'available', label: 'متاحة' },
  { value: 'reserved', label: 'محجوزة' },
  { value: 'sold', label: 'مبيوعة' },
]
const TYPE_SECTIONS = [
  { key: 'apartment', label: 'الشقق' },
  { key: 'roof', label: 'الروفات' },
  { key: 'storage', label: 'المخازن' },
  { key: 'studio', label: 'الاستوديوهات' },
]
const TYPE_TONES = { apartment: 'blue', roof: 'amber', storage: 'green', studio: 'purple' }

const EMPTY_SETUP = { apartments: '', roofs: '', storages: '', studios: '', parking: '', area: '' }
const EMPTY_UNIT = { unit_type: 'apartment', no: '', floor: '', area: '', status: 'available' }
const EMPTY_PARKING = { code: '', is_visitor: false, is_sold: false, unit_id: '' }

function TypeSummaryCard({ emoji, tone, label, total, available, reserved, sold }) {
  return (
    <div className={`bp-sum bp-sum--${tone}`}>
      <div className="bp-sum__head">
        <span className="bp-sum__icon">{emoji}</span>
        <span className="bp-sum__title">{label}</span>
      </div>
      <div className="bp-sum__total">{total} إجمالي</div>
      <div className="bp-sum__rows">
        <span className="is-ok">{available} متاحة</span>
        <span className="is-warn">{reserved} محجوزة</span>
        <span className="is-danger">{sold} مبيوعة</span>
      </div>
    </div>
  )
}

function ParkingSummaryCard({ total, linked, free }) {
  return (
    <div className="bp-sum bp-sum--parking">
      <div className="bp-sum__head">
        <span className="bp-sum__icon">🅿️</span>
        <span className="bp-sum__title">مواقف السيارات</span>
      </div>
      <div className="bp-sum__total">{total} إجمالي</div>
      <div className="bp-sum__rows">
        <span className="is-ok">{free} فارغة</span>
        <span className="is-warn">{linked} مرتبطة بوحدات</span>
      </div>
    </div>
  )
}

export default function BuildingParking() {
  const { projectId } = useCurrentProject()
  const [units, setUnits] = useState([])
  const [parkingSpots, setParkingSpots] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [reload, setReload] = useState(0)

  const [setupOpen, setSetupOpen] = useState(false)
  const [setupForm, setSetupForm] = useState(EMPTY_SETUP)
  const [savingSetup, setSavingSetup] = useState(false)
  const [setupError, setSetupError] = useState('')

  const [unitModal, setUnitModal] = useState(null)
  const [unitForm, setUnitForm] = useState(EMPTY_UNIT)
  const [savingUnit, setSavingUnit] = useState(false)
  const [unitError, setUnitError] = useState('')

  const [parkingModal, setParkingModal] = useState(null)
  const [parkingForm, setParkingForm] = useState(EMPTY_PARKING)
  const [savingParking, setSavingParking] = useState(false)
  const [parkingError, setParkingError] = useState('')

  const [deleteTarget, setDeleteTarget] = useState(null)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  const [saleTarget, setSaleTarget] = useState(null)

  useEffect(() => {
    if (!projectId) return
    let active = true
    setLoading(true)
    setError('')
    Promise.all([listProjectUnits(projectId), listProjectParkingSpots(projectId)])
      .then(([u, p]) => {
        if (!active) return
        setUnits(u || [])
        setParkingSpots(p || [])
      })
      .catch((err) => {
        if (active) setError(err?.message || 'تعذّر تحميل بيانات العقار')
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => { active = false }
  }, [projectId, reload])

  const refetch = () => setReload((r) => r + 1)

  const countOnly = (value) => (/^\d*$/.test(value) ? value : null)
  const areaOnly = (value) => (/^\d*\.?\d*$/.test(value) ? value : null)

  const empty = units.length === 0 && parkingSpots.length === 0

  const countByType = (type) => {
    const list = units.filter((u) => u.unit_type === type)
    return {
      total: list.length,
      available: list.filter((u) => u.status === 'available').length,
      reserved: list.filter((u) => u.status === 'reserved').length,
      sold: list.filter((u) => u.status === 'sold').length,
    }
  }

  const typeSummary = {
    apartment: countByType('apartment'),
    roof: countByType('roof'),
    storage: countByType('storage'),
    studio: countByType('studio'),
  }

  const parkingSummary = {
    total: parkingSpots.length,
    linked: parkingSpots.filter((p) => p.unit_id != null).length,
    free: parkingSpots.filter((p) => p.unit_id == null).length,
  }

  const unitById = (id) => units.find((u) => u.id === id)
  const parkingForUnit = (unitId) => parkingSpots.find((p) => p.unit_id === unitId) || null

  const numberFromNo = (no) => {
    const m = String(no == null ? '' : no).match(/\d+/)
    return m ? Number(m[0]) : Infinity
  }

  const onSetupChange = (field) => (e) => {
    const raw = e.target.value
    if (field === 'area') {
      const next = areaOnly(raw)
      if (next !== null) setSetupForm((f) => ({ ...f, area: next }))
    } else {
      const next = countOnly(raw)
      if (next !== null) setSetupForm((f) => ({ ...f, [field]: next }))
    }
  }

  const handleSetup = async () => {
    setSavingSetup(true)
    setSetupError('')
    try {
      const payload = {
        apartments_count: setupForm.apartments === '' ? 0 : parseInt(setupForm.apartments, 10),
        roofs_count: setupForm.roofs === '' ? 0 : parseInt(setupForm.roofs, 10),
        storages_count: setupForm.storages === '' ? 0 : parseInt(setupForm.storages, 10),
        studios_count: setupForm.studios === '' ? 0 : parseInt(setupForm.studios, 10),
        parking_count: setupForm.parking === '' ? 0 : parseInt(setupForm.parking, 10),
        default_apartment_area: setupForm.area === '' ? null : Number(setupForm.area),
      }
      await propertySetup(projectId, payload)
      setSetupOpen(false)
      setSetupForm(EMPTY_SETUP)
      refetch()
    } catch (err) {
      setSetupError(err?.message || 'فشل إعداد العقار')
    } finally {
      setSavingSetup(false)
    }
  }

  const openAddUnit = () => {
    setUnitForm({ ...EMPTY_UNIT })
    setUnitError('')
    setUnitModal({ mode: 'add' })
  }

  const openEditUnit = (item) => {
    setUnitForm({
      unit_type: item.unit_type || 'apartment',
      no: item.no || '',
      floor: item.floor != null ? String(item.floor) : '',
      area: item.area != null ? String(item.area) : '',
      status: item.status || 'available',
    })
    setUnitError('')
    setUnitModal({ mode: 'edit', item })
  }

  const handleUnitSave = async () => {
    const no = unitForm.no.trim()
    if (!no) {
      setUnitError('الاسم أو رقم الوحدة مطلوب')
      return
    }
    setSavingUnit(true)
    setUnitError('')
    try {
      const payload = {
        unit_type: unitForm.unit_type,
        no,
        floor: unitForm.floor === '' ? 0 : parseInt(unitForm.floor, 10),
        area: unitForm.area === '' ? null : Number(unitForm.area),
        status: unitForm.status,
      }
      if (unitModal.mode === 'edit') {
        await updateUnit(unitModal.item.id, payload)
      } else {
        await createUnit(projectId, payload)
      }
      setUnitModal(null)
      refetch()
    } catch (err) {
      setUnitError(err?.message || 'تعذّر حفظ الوحدة')
    } finally {
      setSavingUnit(false)
    }
  }

  const openAddParking = () => {
    setParkingForm({ ...EMPTY_PARKING })
    setParkingError('')
    setParkingModal({ mode: 'add' })
  }

  const openEditParking = (item) => {
    setParkingForm({
      code: item.code || '',
      is_visitor: !!item.is_visitor,
      is_sold: !!item.is_sold,
      unit_id: item.unit_id != null ? String(item.unit_id) : '',
    })
    setParkingError('')
    setParkingModal({ mode: 'edit', item })
  }

  const handleParkingSave = async () => {
    const code = parkingForm.code.trim()
    if (!code) {
      setParkingError('رمز الموقف مطلوب')
      return
    }
    setSavingParking(true)
    setParkingError('')
    try {
      const payload = {
        code,
        is_visitor: parkingForm.is_visitor,
        is_sold: parkingForm.is_sold,
        unit_id: parkingForm.unit_id === '' ? null : parseInt(parkingForm.unit_id, 10),
      }
      if (parkingModal.mode === 'edit') {
        await updateParkingSpot(parkingModal.item.id, payload)
      } else {
        await createParkingSpot(projectId, payload)
      }
      setParkingModal(null)
      refetch()
    } catch (err) {
      setParkingError(err?.message || 'تعذّر حفظ الموقف')
    } finally {
      setSavingParking(false)
    }
  }

  const openDelete = (kind, item) => {
    setDeleteError('')
    setDeleteTarget({ kind, item })
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    setDeleteError('')
    try {
      if (deleteTarget.kind === 'unit') {
        await deleteUnitApi(deleteTarget.item.id)
      } else {
        await deleteParkingSpotApi(deleteTarget.item.id)
      }
      setDeleteTarget(null)
      refetch()
    } catch (err) {
      setDeleteError(err?.message || 'تعذّر حذف السجل')
    } finally {
      setDeleting(false)
    }
  }

  const unitOptions = units.map((u) => ({ value: String(u.id), label: `${UNIT_TYPE_LABEL[u.unit_type] || 'وحدة'} ${u.no}` }))

  return (
    <div className="bp animate-fade" data-project-id={projectId}>
      {loading && (
        <div className="bp-card bp-state">
          <div className="bp-state__icon">⏳</div>
          <div>جارٍ تحميل بيانات العقار…</div>
        </div>
      )}

      {!loading && error && (
        <div className="bp-card bp-state bp-state--error">
          <div className="bp-state__icon">⚠️</div>
          <div>{error}</div>
          <Button variant="secondary" size="sm" onClick={refetch}>إعادة المحاولة</Button>
        </div>
      )}

      {!loading && !error && empty && (
        <div className="bp-card bp-state">
          <div className="bp-state__icon">🏗️</div>
          <div className="bp-empty__title">لم تتم إضافة مكونات العقار بعد</div>
          <div className="bp-empty__hint">أنشئ الشقق والروفات والمخازن والاستوديوهات والمواقف لهذا المشروع</div>
          <Button variant="primary" onClick={() => { setSetupError(''); setSetupForm(EMPTY_SETUP); setSetupOpen(true) }}>
            إعداد العقار
          </Button>
        </div>
      )}

      {!loading && !error && !empty && (
        <>
          <div className="bp-toolbar">
            <div>
              <h3 className="bp-card__title">مكونات العقار</h3>
              <p className="bp-card__sub">الوحدات والمواقف الفعلية المسجلة لهذا المشروع</p>
            </div>
            <div className="bp-toolbar__btns">
              <Button variant="secondary" size="sm" onClick={openAddUnit}>إضافة وحدة</Button>
              <Button variant="secondary" size="sm" onClick={openAddParking}>إضافة موقف</Button>
            </div>
          </div>

          <div className="bp-summary">
            <TypeSummaryCard emoji="🏢" tone="blue" label="الشقق" {...typeSummary.apartment} />
            <TypeSummaryCard emoji="🏠" tone="amber" label="الروفات" {...typeSummary.roof} />
            <TypeSummaryCard emoji="📦" tone="green" label="المخازن" {...typeSummary.storage} />
            <TypeSummaryCard emoji="🛋️" tone="purple" label="الاستوديوهات" {...typeSummary.studio} />
            <ParkingSummaryCard {...parkingSummary} />
          </div>

          <div className="bp-sections">
            {TYPE_SECTIONS.map((sec) => {
              const items = units.filter((u) => u.unit_type === sec.key)
              if (items.length === 0) return null
              const ordered = [...items].sort((a, b) => numberFromNo(a.no) - numberFromNo(b.no))
              return (
                <div key={sec.key} className="bp-card">
                  <div className="bp-card__head">
                    <div>
                      <h3 className="bp-card__title">{sec.label}</h3>
                      <p className="bp-card__sub">{items.length} وحدة</p>
                    </div>
                  </div>
                  <div className="bp-list">
                    {ordered.map((u) => {
                      const linkedSpot = parkingForUnit(u.id)
                      return (
                        <div key={u.id} className={`bp-item bp-item--${TYPE_TONES[sec.key] || 'blue'}`}>
                          <div className="bp-item__top">
                            <span className="bp-item__no">{u.no}</span>
                            <span className={`bp-pill bp-pill--${u.status}`}>{UNIT_STATUS_LABEL[u.status] || u.status}</span>
                          </div>
                          <div className="bp-item__meta">
                            <span>{UNIT_TYPE_LABEL[u.unit_type] || u.unit_type}</span>
                            {u.area != null && <span>المساحة: {u.area} م²</span>}
                            <span>الطابق: {u.floor}</span>
                          </div>
                          <div className={`bp-item__parking ${linkedSpot ? 'is-linked' : ''}`}>
                            {u.assigned_parking_no != null
                              ? (linkedSpot
                                ? `الموقف: موقف ${u.assigned_parking_no} — مرتبط`
                                : `الموقف المخصص: موقف ${u.assigned_parking_no} — غير مرتبط`)
                              : 'لا يوجد موقف مخصص'}
                          </div>
                          {u.buyer_name && <div className="bp-item__buyer">المشتري: {u.buyer_name}</div>}
                          <div className="bp-item__actions">
                            {u.status !== 'sold' && (
                              <button type="button" className="is-sale" onClick={() => setSaleTarget(u)}>بيع الوحدة</button>
                            )}
                            <button type="button" onClick={() => openEditUnit(u)}>تعديل</button>
                            <button type="button" className="is-danger" onClick={() => openDelete('unit', u)}>حذف</button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </div>

          <div className="bp-card">
            <div className="bp-card__head">
              <div>
                <h3 className="bp-card__title">مواقف السيارات</h3>
                <p className="bp-card__sub">{parkingSpots.length} موقف</p>
              </div>
            </div>
            {parkingSpots.length === 0 ? (
              <div className="bp-empty__hint">لا توجد مواقف مسجلة لهذا المشروع بعد</div>
            ) : (
              <div className="bp-list bp-list--parking">
                {[...parkingSpots].sort((a, b) => numberFromNo(a.code) - numberFromNo(b.code)).map((p) => {
                  const linkedUnit = p.unit_id != null ? unitById(p.unit_id) : null
                  return (
                    <div key={p.id} className={`bp-park-item ${p.is_sold ? 'is-sold' : 'is-free'}`}>
                      <div className="bp-item__top">
                        <span className="bp-item__no">{p.code}</span>
                        <span className={`bp-pill ${p.is_sold ? 'bp-pill--sold' : 'bp-pill--plain'}`}>{p.is_visitor ? 'زوار' : p.is_sold ? 'مبيع' : 'فارغ'}</span>
                      </div>
                      <div className="bp-item__meta">
                        {linkedUnit
                          ? <span>الوحدة: {linkedUnit.no} ({UNIT_TYPE_LABEL[linkedUnit.unit_type] || linkedUnit.unit_type})</span>
                          : <span>فارغ</span>}
                        {p.is_visitor && <span>موقف زوّار</span>}
                      </div>
                      <div className="bp-item__actions">
                        <button type="button" onClick={() => openEditParking(p)}>تعديل</button>
                        <button type="button" className="is-danger" onClick={() => openDelete('parking', p)}>حذف</button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {setupOpen && (
        <Modal
          title="إعداد العقار"
          subtitle="حدد عدد المكونات التي تريد إنشاءها لهذا المشروع"
          onClose={() => setSetupOpen(false)}
          width={520}
          footer={
            <>
              <Button variant="secondary" onClick={() => setSetupOpen(false)}>إلغاء</Button>
              <Button variant="primary" onClick={handleSetup} disabled={savingSetup}>{savingSetup ? 'جارٍ الإنشاء...' : 'إنشاء المكونات'}</Button>
            </>
          }
        >
          <div className="bp-form">
            {setupError && <div className="bp-form__error">{setupError}</div>}
            <div className="bp-form__grid">
              <Field label="عدد الشقق">
                <Input inputMode="numeric" value={setupForm.apartments} onChange={onSetupChange('apartments')} placeholder="0" />
              </Field>
              <Field label="عدد الروفات">
                <Input inputMode="numeric" value={setupForm.roofs} onChange={onSetupChange('roofs')} placeholder="0" />
              </Field>
              <Field label="عدد المخازن">
                <Input inputMode="numeric" value={setupForm.storages} onChange={onSetupChange('storages')} placeholder="0" />
              </Field>
              <Field label="عدد الاستوديوهات">
                <Input inputMode="numeric" value={setupForm.studios} onChange={onSetupChange('studios')} placeholder="0" />
              </Field>
              <Field label="عدد مواقف السيارات">
                <Input inputMode="numeric" value={setupForm.parking} onChange={onSetupChange('parking')} placeholder="0" />
              </Field>
              <Field label="مساحة الشقة الافتراضية (م²) — اختيارية">
                <Input inputMode="decimal" value={setupForm.area} onChange={onSetupChange('area')} placeholder="مثال: 120" />
              </Field>
            </div>
          </div>
        </Modal>
      )}

      {unitModal && (
        <Modal
          title={unitModal.mode === 'edit' ? 'تعديل الوحدة' : 'إضافة وحدة'}
          subtitle={unitModal.mode === 'edit' ? unitModal.item.no : 'أدخل بيانات الوحدة الجديدة'}
          onClose={() => setUnitModal(null)}
          width={480}
          footer={
            <>
              <Button variant="secondary" onClick={() => setUnitModal(null)}>إلغاء</Button>
              <Button variant="primary" onClick={handleUnitSave} disabled={savingUnit}>{savingUnit ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
            </>
          }
        >
          <div className="bp-form">
            {unitError && <div className="bp-form__error">{unitError}</div>}
            <Field label="النوع">
              <Select value={unitForm.unit_type} onChange={(e) => setUnitForm((f) => ({ ...f, unit_type: e.target.value }))} options={UNIT_TYPE_OPTIONS} />
            </Field>
            <Field label="الاسم أو الرقم">
              <Input value={unitForm.no} onChange={(e) => setUnitForm((f) => ({ ...f, no: e.target.value }))} placeholder="مثال: شقة 12" />
            </Field>
            <div className="bp-form__grid">
              <Field label="الطابق">
                <Input inputMode="numeric" value={unitForm.floor} onChange={(e) => { const next = countOnly(e.target.value); if (next !== null) setUnitForm((f) => ({ ...f, floor: next })) }} placeholder="0" />
              </Field>
              <Field label="المساحة (م²)">
                <Input inputMode="decimal" value={unitForm.area} onChange={(e) => { const next = areaOnly(e.target.value); if (next !== null) setUnitForm((f) => ({ ...f, area: next })) }} placeholder="اختياري" />
              </Field>
            </div>
            <Field label="الحالة">
              <Select value={unitForm.status} onChange={(e) => setUnitForm((f) => ({ ...f, status: e.target.value }))} options={UNIT_STATUS_OPTIONS} />
            </Field>
          </div>
        </Modal>
      )}

      {parkingModal && (
        <Modal
          title={parkingModal.mode === 'edit' ? 'تعديل الموقف' : 'إضافة موقف'}
          subtitle={parkingModal.mode === 'edit' ? parkingModal.item.code : 'أدخل بيانات الموقف الجديد'}
          onClose={() => setParkingModal(null)}
          width={480}
          footer={
            <>
              <Button variant="secondary" onClick={() => setParkingModal(null)}>إلغاء</Button>
              <Button variant="primary" onClick={handleParkingSave} disabled={savingParking}>{savingParking ? 'جارٍ الحفظ...' : 'حفظ'}</Button>
            </>
          }
        >
          <div className="bp-form">
            {parkingError && <div className="bp-form__error">{parkingError}</div>}
            <Field label="رمز الموقف">
              <Input value={parkingForm.code} onChange={(e) => setParkingForm((f) => ({ ...f, code: e.target.value }))} placeholder="مثال: موقف 16" />
            </Field>
            <Field label="الوحدة المرتبطة (اختياري)">
              <Select value={parkingForm.unit_id} onChange={(e) => setParkingForm((f) => ({ ...f, unit_id: e.target.value }))} options={[{ value: '', label: '— بدون وحدة —' }, ...unitOptions]} />
            </Field>
            <div className="bp-check">
              <label>
                <input type="checkbox" checked={parkingForm.is_visitor} onChange={(e) => setParkingForm((f) => ({ ...f, is_visitor: e.target.checked }))} />
                موقف زوّار
              </label>
              <label>
                <input type="checkbox" checked={parkingForm.is_sold} onChange={(e) => setParkingForm((f) => ({ ...f, is_sold: e.target.checked }))} />
                مبيع
              </label>
            </div>
          </div>
        </Modal>
      )}

      {deleteTarget && (
        <Modal
          title="تأكيد الحذف"
          onClose={() => { setDeleteTarget(null); setDeleteError('') }}
          width={420}
          footer={
            <>
              <Button variant="secondary" onClick={() => { setDeleteTarget(null); setDeleteError('') }}>إلغاء</Button>
              <Button variant="danger" onClick={handleDelete} disabled={deleting}>{deleting ? 'جارٍ الحذف...' : 'حذف'}</Button>
            </>
          }
        >
          <div className="bp-form">
            <p className="bp-delete-text">
              {deleteTarget.kind === 'unit' ? 'هل أنت متأكد من حذف هذه الوحدة؟' : 'هل أنت متأكد من حذف هذا الموقف؟'}
            </p>
            {deleteError && <div className="bp-form__error">{deleteError}</div>}
          </div>
        </Modal>
      )}

      {saleTarget && (
        <UnitSaleWizard
          projectId={projectId}
          unit={saleTarget}
          onClose={() => setSaleTarget(null)}
          onSaved={refetch}
        />
      )}
    </div>
  )
}
