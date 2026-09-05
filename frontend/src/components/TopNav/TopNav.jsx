import { useNavigate } from 'react-router-dom'
import { Bars, Bell, ChevronDown } from '../icons/Icons.jsx'
import Avatar from '../ui/Avatar/Avatar.jsx'
import './TopNav.css'

/** الهيدر العلوي العام (ثابت في كل الصفحات) */
export default function TopNav({ active = 'المشاريع' }) {
  const navigate = useNavigate()
  const items = ['لوحة التحكم', 'المشاريع', 'التقارير', 'الإعدادات']
  return (
    <header className="topnav no-print">
      <div className="topnav__inner container">
        <div className="topnav__user">
          <button className="topnav__icon-btn"><Bell size={20} /></button>
          <span className="topnav__divider" />
          <Avatar initials="أ" size={38} />
          <span className="topnav__user-name">أحمد زكي</span>
          <span className="topnav__chevron"><ChevronDown size={18} /></span>
        </div>

        <nav className="topnav__nav">
          {items.map((it) => (
            <button
              key={it}
              className={`topnav__link ${it === active ? 'is-active' : ''}`}
              onClick={() => it === 'المشاريع' && navigate('/projects')}
            >
              {it}
            </button>
          ))}
        </nav>

        <div className="topnav__brand" onClick={() => navigate('/projects')}>
          <span className="topnav__logo"><Bars size={22} /></span>
          <span className="topnav__brand-name">حسابات برو</span>
        </div>
      </div>
    </header>
  )
}
