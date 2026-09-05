import { NavLink, useNavigate } from 'react-router-dom'
import { ChevronRight, Pin, Edit, Plus } from '../icons/Icons.jsx'
import Avatar from '../ui/Avatar/Avatar.jsx'
import Badge from '../ui/Badge/Badge.jsx'
import Button from '../ui/Button/Button.jsx'
import './ProjectHeader.css'

/** شريط المشروع: مسار + العنوان + الإجراءات + التبويبات */
export default function ProjectHeader({ project, tabs = [], onAddTransaction }) {
  const navigate = useNavigate()
  return (
    <div className="pheader no-print">
      <div className="pheader__inner container">
        <div className="pheader__crumb">
          <button onClick={() => navigate('/projects')} className="pheader__crumb-link">المشاريع</button>
          <ChevronRight size={16} />
          <span className="pheader__crumb-current">{project.name}</span>
        </div>

        <div className="pheader__row">
          <div className="pheader__title">
            <Avatar initials={project.mono} size={56} radius={16} gradient={project.gradient} />
            <div>
              <h1 className="pheader__name">{project.name}</h1>
              <div className="pheader__meta">
                <Badge tone="green" dot>نشط</Badge>
                <Badge tone="blue">{project.type}</Badge>
                <span className="pheader__loc"><Pin size={16} /> {project.location}</span>
              </div>
            </div>
          </div>
          <div className="pheader__actions">
            <Button variant="secondary" size="sm" iconRight={<Edit size={18} />}>تعديل المشروع</Button>
            <Button variant="primary" size="sm" iconRight={<Plus size={18} />} onClick={onAddTransaction}>
              إضافة حركة مالية
            </Button>
          </div>
        </div>

        <nav className="pheader__tabs">
          {tabs.map((tab) => (
            <NavLink
              key={tab.key}
              to={tab.path}
              className={({ isActive }) => `pheader__tab${isActive ? ' is-active' : ''}`}
              end
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </div>
  )
}
