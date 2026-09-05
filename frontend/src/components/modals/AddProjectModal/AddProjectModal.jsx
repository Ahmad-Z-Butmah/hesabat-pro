import { useMemo, useState } from 'react'
import { Plus } from '../../icons/Icons.jsx'
import { projectTypes } from '../../../data/mockData.js'
import Modal from '../../ui/Modal/Modal.jsx'
import Field from '../../ui/Field/Field.jsx'
import { Input, Select } from '../../ui/Input/Input.jsx'
import Button from '../../ui/Button/Button.jsx'
import { createProject, ApiError } from '../../../utils/api.js'
import './AddProjectModal.css'

export default function AddProjectModal({ onClose, onProjectCreated }) {
  const [type, setType] = useState('restaurant')
  const [name, setName] = useState('')
  const [location, setLocation] = useState('')
  const [address, setAddress] = useState('')
  const [openingBalance, setOpeningBalance] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedType = useMemo(() => projectTypes.find((item) => item.key === type) ?? projectTypes[0], [type])

  const handleCreate = async () => {
    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('يرجى إدخال اسم المشروع')
      return
    }

    setSubmitting(true)
    setError('')

    try {
      const payload = {
        name: trimmedName,
        type: selectedType?.key || type,
        location: [location, address].filter(Boolean).join(' — ') || null,
        mono: trimmedName.slice(0, 2).toUpperCase(),
        gradient_start: '#38bdf8',
        gradient_end: '#0284c7',
      }

      const newProject = await createProject(payload)
      if (!newProject?.id || !Number.isFinite(Number(newProject.id))) {
        setError('استجابة الخادم لا تحتوي على معرف مشروع صالح')
        return
      }

      onProjectCreated?.(newProject)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'تعذّر إنشاء المشروع')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Modal
      title="إضافة مشروع جديد"
      subtitle="أدخل بيانات المشروع الذي تريد إدارة حساباته."
      onClose={onClose}
      width={600}
      footer={<>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button variant="primary" iconRight={<Plus size={20} />} onClick={handleCreate} disabled={submitting}>
          {submitting ? 'جارٍ إنشاء المشروع...' : 'إنشاء المشروع'}
        </Button>
      </>}
    >
      <div className="apm">
        {error && <div className="apm__error">{error}</div>}

        <Field label="اسم المشروع">
          <Input placeholder="مثال: انفينتي" value={name} onChange={(e) => setName(e.target.value)} />
        </Field>

        <Field label="نوع المشروع">
          <div className="apm__types">
            {projectTypes.map(({ key, label, Icon }) => (
              <button
                key={key}
                type="button"
                className={`apm__type ${type === key ? 'is-active' : ''}`}
                onClick={() => setType(key)}
              >
                <Icon size={26} /><span>{label}</span>
              </button>
            ))}
          </div>
        </Field>

        <Field label="الموقع">
          <div className="apm__two">
            <Select options={[{ value: '', label: 'المحافظة' }]} value={location} onChange={(e) => setLocation(e.target.value)} />
            <Input placeholder="العنوان التفصيلي" value={address} onChange={(e) => setAddress(e.target.value)} />
          </div>
        </Field>

        <Field label="الرصيد الافتتاحي (اختياري)">
          <Input placeholder="0.00  ₪" value={openingBalance} onChange={(e) => setOpeningBalance(e.target.value)} />
        </Field>
      </div>
    </Modal>
  )
}
