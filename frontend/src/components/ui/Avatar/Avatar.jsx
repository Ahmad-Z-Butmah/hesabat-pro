import './Avatar.css'

/** دائرة أحرف أولى بخلفية متدرّجة */
export default function Avatar({ initials, size = 40, radius, gradient = ['#3b82f6', '#1d4ed8'], className = '' }) {
  const style = {
    width: size, height: size,
    borderRadius: radius ?? size / 2,
    fontSize: size * 0.42,
    backgroundImage: `linear-gradient(120deg, ${gradient[0]} 0%, ${gradient[1]} 100%)`,
  }
  return <span className={`avatar ${className}`} style={style}>{initials}</span>
}
