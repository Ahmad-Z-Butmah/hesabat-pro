import { forwardRef } from 'react'
import './Input.css'

/** حقل إدخال نصّي */
export const Input = forwardRef(function Input({ className = '', ...rest }, ref) {
  return <input ref={ref} className={`inp ${className}`} {...rest} />
})

/** قائمة منسدلة */
export function Select({ options = [], className = '', ...rest }) {
  return (
    <select className={`inp inp--select ${className}`} {...rest}>
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

/** منطقة نص */
export function Textarea({ className = '', ...rest }) {
  return <textarea className={`inp inp--area ${className}`} {...rest} />
}

/** حقل صغير (يُستخدم داخل صفوف الشيكات) */
export function SmallInput({ className = '', ...rest }) {
  return <input className={`inp inp--sm ${className}`} {...rest} />
}
