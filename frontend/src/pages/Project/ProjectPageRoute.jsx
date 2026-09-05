import { Navigate } from 'react-router-dom'
import { useCurrentProject } from '../../hooks/useCurrentProject.jsx'

export default function ProjectPageRoute({ pageKey, element }) {
  const { projectModules } = useCurrentProject()
  if (!projectModules.length) {
    return <div className="project__status">هذا النوع من المشاريع قيد التجهيز</div>
  }

  const allowedModule = projectModules.find((module) => module.key === pageKey)
  if (!allowedModule) {
    return <Navigate to={projectModules[0].path} replace />
  }

  return element
}
