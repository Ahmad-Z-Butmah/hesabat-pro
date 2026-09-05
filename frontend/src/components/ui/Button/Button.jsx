import './Button.css'

/** زر متعدد الأنماط: primary | secondary | danger | ghost */
export default function Button({
  children, variant = 'primary', size = 'md', full = false,
  iconLeft = null, iconRight = null, className = '', ...rest
}) {
  const cls = ['btn', `btn--${variant}`, `btn--${size}`, full ? 'btn--full' : '', className]
    .filter(Boolean).join(' ')
  return (
    <button className={cls} {...rest}>
      {iconLeft && <span className="btn__icon">{iconLeft}</span>}
      {children && <span>{children}</span>}
      {iconRight && <span className="btn__icon">{iconRight}</span>}
    </button>
  )
}
