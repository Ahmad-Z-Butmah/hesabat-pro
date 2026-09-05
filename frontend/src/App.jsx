import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login/Login.jsx'
import Dashboard from './pages/Dashboard/Dashboard.jsx'
import Project from './pages/Project/Project.jsx'
import ProjectOverview from './pages/ProjectOverview/ProjectOverview.jsx'
import Finance from './pages/Finance/Finance.jsx'
import BuildingParking from './pages/BuildingParking/BuildingParking.jsx'
import Customers from './pages/Customers/Customers.jsx'
import Reports from './pages/Reports/Reports.jsx'
import Parties from './pages/Parties/Parties.jsx'
import Cheques from './pages/Cheques/Cheques.jsx'
import ProjectPageRoute from './pages/Project/ProjectPageRoute.jsx'

function LegacyProjectRedirect() {
  const { id } = useParams()
  return <Navigate to={`/projects/${encodeURIComponent(id)}/overview`} replace />
}

/**
 * توجيه الصفحات:
 *  /                            تسجيل الدخول
 *  /projects                    لوحة المشاريع
 *  /projects/:projectId         إعادة توجيه إلى نظرة عامة المشروع
 *  /projects/:projectId/overview صفحة المشروع (نظرة عامة)
 */
export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/projects" element={<Dashboard />} />
      <Route path="/projects/:projectId" element={<Project />}>
        <Route index element={<Navigate to="overview" replace />} />
        <Route path="overview" element={<ProjectPageRoute pageKey="overview" element={<ProjectOverview />} />} />
        <Route path="finance" element={<ProjectPageRoute pageKey="finance" element={<Finance />} />} />
        <Route path="buildings" element={<ProjectPageRoute pageKey="buildingParking" element={<BuildingParking />} />} />
        <Route path="customers" element={<ProjectPageRoute pageKey="customers" element={<Customers />} />} />
        <Route path="reports" element={<ProjectPageRoute pageKey="reports" element={<Reports />} />} />
        <Route path="parties" element={<ProjectPageRoute pageKey="parties" element={<Parties />} />} />
        <Route path="cheques" element={<ProjectPageRoute pageKey="cheques" element={<Cheques />} />} />
        <Route path="*" element={<Navigate to="overview" replace />} />
      </Route>
      <Route path="/dashboard" element={<Navigate to="/projects" replace />} />
      <Route path="/project/:id" element={<LegacyProjectRedirect />} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
