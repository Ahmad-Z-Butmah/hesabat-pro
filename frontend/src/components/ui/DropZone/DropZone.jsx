import './DropZone.css'

/** منطقة رفع ملف (سحب وإفلات) — تصميم فقط */
export default function DropZone({ icon = '🖼', text, hint, variant = 'block' }) {
  return (
    <div className={`dropzone dropzone--${variant}`}>
      <span className="dropzone__icon">{icon}</span>
      <span className="dropzone__text">{text}</span>
      {hint && <span className="dropzone__hint">{hint}</span>}
    </div>
  )
}
