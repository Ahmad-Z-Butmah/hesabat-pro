import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, Outlet } from 'react-router-dom'
import { getProject, ApiError } from '../../utils/api.js'
import TopNav from '../../components/TopNav/TopNav.jsx'
import ProjectHeader from '../../components/ProjectHeader/ProjectHeader.jsx'
import AddTransactionModal from '../../components/modals/AddTransactionModal/AddTransactionModal.jsx'
import { getProjectModules } from '../../config/projectModules.js'
import './Project.css'

export default function Project() {
  const { projectId } = useParams()
  const navigate = useNavigate()
  const [project, setProject] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [txnOpen, setTxnOpen] = useState(false)

  const parsedProjectId = Number(projectId)
  const projectType = project?.project_type || project?.type || ''
  const projectModules = useMemo(() => getProjectModules(projectType), [projectType])
  const projectContext = useMemo(
    () => ({
      project,
      projectId: Number.isFinite(parsedProjectId) ? parsedProjectId : null,
      projectType,
      projectModules,
    }),
    [project, parsedProjectId, projectType, projectModules],
  )

  useEffect(() => {
    if (!projectId || !Number.isFinite(parsedProjectId) || parsedProjectId <= 0) {
      setLoading(false)
      setError('معرف المشروع غير صالح')
      return
    }

    let mounted = true
    setLoading(true)
    setError('')

    getProject(parsedProjectId)
      .then((data) => {
        if (!mounted) return
        setProject({
          ...data,
          gradient: [data.gradient_start ?? '#38bdf8', data.gradient_end ?? '#0284c7'],
        })
      })
      .catch((err) => {
        if (!mounted) return
        if (err instanceof ApiError && err.status === 401) {
          navigate('/')
          return
        }
        if (err instanceof ApiError && err.status === 404) {
          setError('المشروع غير موجود')
          return
        }
        setError(err.message || 'تعذّر تحميل بيانات المشروع')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [projectId, parsedProjectId, navigate])

  return (
    <div className="page">
      <TopNav active="المشاريع" />

      {loading && <div className="project__status">جارٍ تحميل المشروع...</div>}
      {error && <div className="project__status project__status--error">{error}</div>}

      {project && (
        <>
          <ProjectHeader project={project} tabs={projectModules} onAddTransaction={() => setTxnOpen(true)} />

          <main className="container project__main">
            {projectModules.length > 0 ? (
              <Outlet context={projectContext} />
            ) : (
              <div className="project__status">هذا النوع من المشاريع قيد التجهيز</div>
            )}
          </main>

          {txnOpen && <AddTransactionModal onClose={() => setTxnOpen(false)} />}
        </>
      )}
    </div>
  )
}
