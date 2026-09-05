import './Field.css'

/** غلاف حقل: عنوان فوق العنصر */
export default function Field({ label, children, className = '' }) {
  return (
    <div className={`field ${className}`}>
      {label && <label className="field__label">{label}</label>}
      {children}
    </div>
  )
}
