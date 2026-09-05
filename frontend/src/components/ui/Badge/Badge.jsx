import './Badge.css'

/** شارة ملوّنة: green | amber | blue | red | gray */
export default function Badge({ children, tone = 'gray', dot = false, className = '' }) {
  return (
    <span className={`badge badge--${tone} ${className}`}>
      {dot && <span className="badge__dot" />}
      {children}
    </span>
  )
}
