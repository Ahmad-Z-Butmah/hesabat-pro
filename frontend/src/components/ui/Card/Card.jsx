import './Card.css'

/** بطاقة بيضاء بحواف دائرية وظل ناعم */
export default function Card({ children, className = '', ...rest }) {
  return <div className={`card ${className}`} {...rest}>{children}</div>
}
