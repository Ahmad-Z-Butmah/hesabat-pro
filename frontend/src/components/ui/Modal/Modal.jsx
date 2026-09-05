import './Modal.css'

/**
 * نافذة منبثقة مشتركة.
 * title / subtitle: نص الرأس
 * footer: عناصر التذييل (أزرار)
 * width: عرض البطاقة
 */
export default function Modal({ title, subtitle, onClose, footer, width = 560, children }) {
  return (
    <div className="modal" onClick={onClose}>
      <div className="modal__card" style={{ width }} onClick={(e) => e.stopPropagation()}>
        <div className="modal__head">
          <div>
            <h3 className="modal__title">{title}</h3>
            {subtitle && <p className="modal__subtitle">{subtitle}</p>}
          </div>
          <button className="modal__close" onClick={onClose}>×</button>
        </div>

        <div className="modal__body">{children}</div>

        {footer && <div className="modal__foot">{footer}</div>}
      </div>
    </div>
  )
}
