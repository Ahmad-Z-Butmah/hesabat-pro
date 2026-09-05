import { useState } from 'react'
import { TXN_TYPES } from '../../../data/mockData.js'
import Modal from '../../ui/Modal/Modal.jsx'
import Field from '../../ui/Field/Field.jsx'
import { Input, Textarea } from '../../ui/Input/Input.jsx'
import Button from '../../ui/Button/Button.jsx'
import DropZone from '../../ui/DropZone/DropZone.jsx'
import './AddTransactionModal.css'

export default function AddTransactionModal({ onClose }) {
  const [type, setType] = useState('check_in')
  const isCheck = type === 'check_in' || type === 'check_out'
  const uploadLabel = isCheck ? 'صورة الشيك' : 'صورة الفاتورة / الإيصال'

  return (
    <Modal
      title="إضافة حركة مالية"
      subtitle="سجّل قبضاً أو دفعاً — شيكاً كان أو كاش."
      onClose={onClose}
      width={560}
      footer={<>
        <Button variant="secondary" onClick={onClose}>إلغاء</Button>
        <Button variant="primary" onClick={onClose}>حفظ الحركة</Button>
      </>}
    >
      <div className="atm">
        <label className="atm__label">نوع الحركة</label>
        <div className="atm__types">
          {TXN_TYPES.map((t) => {
            const on = type === t.id
            return (
              <div
                key={t.id}
                className="atm__type"
                onClick={() => setType(t.id)}
                style={{ borderColor: on ? t.color : 'var(--line)', background: on ? t.color + '12' : '#fff' }}
              >
                <div className="atm__type-icon" style={{ background: t.color + '1f' }}>{t.icon}</div>
                <div>
                  <div className="atm__type-label">{t.label}</div>
                  <div className="atm__type-sub">{t.sub}</div>
                </div>
                {on && <span className="atm__type-check" style={{ background: t.color }}>✓</span>}
              </div>
            )
          })}
        </div>

        <div className="atm__two">
          <Field label="المبلغ (₪)"><Input placeholder="0" /></Field>
          <Field label="التاريخ"><Input type="date" /></Field>
        </div>

        <Field label="الطرف (اسم الشخص/الجهة)"><Input placeholder="مثال: سامر الحاج" /></Field>

        {isCheck && (
          <div className="atm__check-box">
            <div className="atm__check-title">تفاصيل الشيك</div>
            <div className="atm__two">
              <Input placeholder="رقم الشيك" />
              <Input placeholder="اسم البنك" />
            </div>
            <Input type="date" className="atm__check-date" />
          </div>
        )}

        <Field label="ملاحظات (اختياري)"><Textarea placeholder="أي تفاصيل إضافية…" /></Field>

        <div>
          <label className="atm__label">{uploadLabel}</label>
          <DropZone icon="🖼" text="اسحب الصورة هنا أو اضغط للرفع" hint="JPG / PNG · حتى 10MB" />
        </div>
      </div>
    </Modal>
  )
}
