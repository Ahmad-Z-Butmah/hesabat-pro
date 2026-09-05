import { useNavigate } from 'react-router-dom'
import { Pin, TrendUp, TrendDown, ArrowLeft, Dots } from '../../components/icons/Icons.jsx'
import './ProjectCard.css'

/** بطاقة مشروع في لوحة المشاريع */
export default function ProjectCard({ project, onRequestDelete }) {
  const navigate = useNavigate()
  const Icon = project.Icon ?? TrendUp
  const gradient = project.gradient ?? [project.gradient_start ?? '#4B6CF7', project.gradient_end ?? '#62D5C7']
  const mono = project.mono ?? (project.name ? project.name.slice(0, 2).toUpperCase() : '')
  const revenue = project.revenue ?? '-'
  const trend = project.trend ?? 0
  const up = typeof project.up === 'boolean' ? project.up : trend >= 0
  const projectId = Number(project?.id)

  const handleOpenProject = () => {
    if (!Number.isFinite(projectId)) return
    navigate(`/projects/${projectId}/overview`)
  }

  const handleMenuClick = (event) => {
    event.preventDefault()
    event.stopPropagation()
    onRequestDelete?.()
  }

  return (
    <article className="pcard" onClick={handleOpenProject}>
      <div className="pcard__banner" style={{ backgroundImage: `linear-gradient(120deg, ${gradient[0]}, ${gradient[1]})` }}>
        <span className="pcard__status"><span className="pcard__status-dot" /> نشط</span>
        <span className="pcard__type">{project.type ?? 'مشروع'} <Icon size={15} /></span>
        <span className="pcard__banner-icon"><Icon size={120} /></span>
      </div>

      <span className="pcard__mono" style={{ color: gradient[1] }}>{mono}</span>

      <div className="pcard__body">
        <h3 className="pcard__name">{project.name}</h3>
        <div className="pcard__loc">{project.location ?? 'غير محدد'} <Pin size={16} /></div>
        <div className="pcard__divider" />
        <div className="pcard__stats">
          <div className="pcard__stat">
            <span className="pcard__stat-label">الإيرادات هذا الشهر</span>
            <span className="pcard__stat-value">{typeof revenue === 'number' ? `${revenue} ₪` : revenue}</span>
          </div>
          <div className="pcard__stat pcard__stat--left">
            <span className="pcard__stat-label">نسبة النموّ</span>
            <span className={`pcard__trend ${up ? 'is-up' : 'is-down'}`}>
              {trend}%{up ? <TrendUp size={14} /> : <TrendDown size={14} />}
            </span>
          </div>
        </div>
        <div className="pcard__actions">
          <button
            className="pcard__more"
            onClick={handleMenuClick}
          ><Dots size={20} /></button>
          <span className="pcard__manage">إدارة الحسابات <ArrowLeft size={18} /></span>
        </div>
      </div>
    </article>
  )
}
