import { formatMoney, formatDateAr } from '../../../utils/format.js'
import './ChequeDetailModal.css'

/** تفاصيل شيك صُرف خلال الفترة — يوضّح إن كان مؤجَّلاً من فترة سابقة */
export default function ChequeDetailModal({ cheque, onClose }) {
  const isIn = cheque.dir === 'in'
  const rows = [
    { k: 'الطرف / الجهة', v: cheque.party },
    { k: 'العقار / الوحدة', v: cheque.unit },
    { k: 'التصنيف', v: cheque.cat },
    { k: 'السبب', v: cheque.reason },
    { k: 'تاريخ إصدار الشيك', v: formatDateAr(cheque.issued) },
    { k: 'تاريخ الصرف الفعلي', v: formatDateAr(cheque.cashed) },
    { k: 'الحالة', v: cheque.deferred ? 'شيك مؤجَّل — صدر في فترة سابقة وصُرف خلال هذه الفترة' : 'صدر وصُرف ضمن نفس الفترة' },
  ]

  return (
    <div className="cdm" onClick={onClose}>
      <div className="cdm__card" onClick={(e) => e.stopPropagation()}>
        <div className="cdm__head">
          <div className="cdm__head-left">
            <div className="cdm__icon">{isIn ? '📥' : '🧾'}</div>
            <div>
              <h2 className="cdm__title">شيك #{cheque.no}</h2>
              <p className="cdm__subtitle">{isIn ? 'شيك وارد — استلمته وتم صرفه' : 'شيك صادر — أنا أصدرته وتم صرفه'}</p>
            </div>
          </div>
          <div className="cdm__head-right">
            <div className="cdm__total"><span>القيمة</span><b>{formatMoney(cheque.amount)}</b></div>
            <button className="cdm__close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="cdm__body">
          {rows.map((r, i) => (
            <div key={i} className="cdm__row"><span className="cdm__key">{r.k}</span><span className="cdm__val">{r.v}</span></div>
          ))}
        </div>
      </div>
    </div>
  )
}
