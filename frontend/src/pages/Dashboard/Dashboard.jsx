import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ChevronDown } from '../../components/icons/Icons.jsx'
import { ApiError, deleteProject, getProjects } from '../../utils/api.js'
import { getProjectTypeLabel, normalizeProjectType } from '../../config/projectModules.js'
import TopNav from '../../components/TopNav/TopNav.jsx'
import Button from '../../components/ui/Button/Button.jsx'
import Modal from '../../components/ui/Modal/Modal.jsx'
import AddProjectModal from '../../components/modals/AddProjectModal/AddProjectModal.jsx'
import ProjectCard from './ProjectCard.jsx'
import './Dashboard.css'

export default function Dashboard() {
  const navigate = useNavigate()
  const [modalOpen, setModalOpen] = useState(false)
  const [projects, setProjects] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedType, setSelectedType] = useState('all')
  const [selectedLocation, setSelectedLocation] = useState('all')
  const [projectToDelete, setProjectToDelete] = useState(null)
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setError('')

    getProjects()
      .then((data) => {
        if (!mounted) return
        setProjects(data || [])
      })
      .catch((err) => {
        if (!mounted) return
        setError(err instanceof Error ? err.message : 'فشل تحميل المشاريع')
      })
      .finally(() => {
        if (!mounted) return
        setLoading(false)
      })

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    if (!projectToDelete) return

    const handleKeyDown = (event) => {
      if (event.key === 'Escape') {
        setProjectToDelete(null)
        setDeleteError('')
      }
    }

    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [projectToDelete])

  const projectCount = projects.length
  const locationOptions = useMemo(() => {
    const values = projects
      .map((project) => project.location?.trim())
      .filter((loc) => loc)
    return Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'ar'))
  }, [projects])

  const filteredProjects = useMemo(() => {
    const search = searchTerm.trim().toLowerCase()
    return [...projects]
      .filter((project) => {
        if (!search) return true
        const name = project.name?.trim().toLowerCase() ?? ''
        const location = project.location?.trim().toLowerCase() ?? ''
        const typeKey = normalizeProjectType(project.type)
        const typeLabel = getProjectTypeLabel(typeKey) ?? project.type ?? ''
        return (
          name.includes(search) ||
          location.includes(search) ||
          project.type?.trim().toLowerCase().includes(search) ||
          typeLabel.trim().toLowerCase().includes(search)
        )
      })
      .filter((project) => {
        if (selectedType === 'all') return true
        return normalizeProjectType(project.type) === selectedType
      })
      .filter((project) => {
        if (selectedLocation === 'all') return true
        return project.location?.trim().toLowerCase() === selectedLocation
      })
  }, [projects, searchTerm, selectedType, selectedLocation])

  const resetFilters = () => {
    setSearchTerm('')
    setSelectedType('all')
    setSelectedLocation('all')
  }

  const handleDeleteProject = async (project) => {
    setDeleteError('')
    setDeleteLoading(true)
    try {
      await deleteProject(project.id)
      setProjects((prev) => prev.filter((item) => item.id !== project.id))
      setProjectToDelete(null)
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setDeleteError('انتهت جلسة تسجيل الدخول')
        } else if (err.status === 403) {
          setDeleteError('لا تملك صلاحية حذف هذا المشروع')
        } else if (err.status === 404) {
          setDeleteError('المشروع غير موجود')
        } else {
          setDeleteError('تعذّر حذف المشروع، يرجى المحاولة مرة أخرى')
        }
      } else {
        setDeleteError('تعذّر حذف المشروع، يرجى المحاولة مرة أخرى')
      }
    } finally {
      setDeleteLoading(false)
    }
  }

  return (
    <div className="page">
      <TopNav active="المشاريع" />
      <main className="container dashboard">
        <div className="dashboard__head">
          <Button variant="primary" size="md" iconRight={<Plus size={20} />} onClick={() => setModalOpen(true)}>
            إضافة مشروع جديد
          </Button>
          <div>
            <div className="dashboard__title-row">
              <h1>المشاريع</h1>
              <span className="dashboard__count">{projectCount} مشاريع</span>
            </div>
            <p className="dashboard__subtitle">إدارة وتتبّع الأداء المالي لمطاعمك ومحلاتك وعقاراتك في مكان واحد.</p>
          </div>
        </div>

        <div className="dashboard__toolbar">
          <div className="dashboard__search">
            <Search size={20} />
            <input
              placeholder="ابحث باسم المشروع أو الموقع…"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
            />
          </div>
          <div className="dashboard__filters">
            <div className="dashboard__filter">
              <select
                value={selectedLocation}
                onChange={(event) => setSelectedLocation(event.target.value)}
              >
                <option value="all">كل المواقع</option>
                {locationOptions.map((location) => (
                  <option key={location} value={location.trim().toLowerCase()}>{location}</option>
                ))}
              </select>
              <ChevronDown size={16} />
            </div>
            <div className="dashboard__filter">
              <select
                value={selectedType}
                onChange={(event) => setSelectedType(event.target.value)}
              >
                <option value="all">كل الأنواع</option>
                <option value="real_estate">عقارات</option>
                <option value="restaurant">مطعم</option>
                <option value="shop">محل تجاري</option>
                <option value="cafe">مقهى</option>
              </select>
              <ChevronDown size={16} />
            </div>
          </div>
        </div>

        {loading && <div className="dashboard__message">جارٍ تحميل المشاريع...</div>}
        {error && <div className="dashboard__error">{error}</div>}
        {!loading && !error && filteredProjects.length === 0 && (
          <div className="dashboard__message">
            لا توجد مشاريع مطابقة لبحثك
            {(searchTerm || selectedType !== 'all' || selectedLocation !== 'all') && (
              <button className="dashboard__reset" onClick={resetFilters}>إعادة تعيين الفلتر</button>
            )}
          </div>
        )}

        <div className="dashboard__grid">
          {filteredProjects.map((p) => (
            <ProjectCard
              key={p.id}
              project={p}
              onRequestDelete={() => setProjectToDelete(p)}
            />
          ))}
        </div>
      </main>

      {modalOpen && (
        <AddProjectModal
          onClose={() => setModalOpen(false)}
          onProjectCreated={(project) => {
            if (!project?.id || !Number.isFinite(Number(project.id))) return
            setModalOpen(false)
            navigate(`/projects/${Number(project.id)}/overview`)
          }}
        />
      )}

      {projectToDelete && (
        <Modal
          title="حذف المشروع"
          subtitle={`هل أنت متأكد من حذف مشروع «${projectToDelete.name}»؟ سيتم حذف جميع البيانات المرتبطة بهذا المشروع نهائيًا ولا يمكن التراجع عن هذه العملية.`}
          onClose={() => {
            if (!deleteLoading) {
              setProjectToDelete(null)
              setDeleteError('')
            }
          }}
          width={560}
          footer={
            <>
              <Button variant="secondary" onClick={() => setProjectToDelete(null)} disabled={deleteLoading}>إلغاء</Button>
              <Button variant="danger" onClick={() => handleDeleteProject(projectToDelete)} disabled={deleteLoading}>
                {deleteLoading ? 'جارٍ الحذف...' : 'حذف المشروع'}
              </Button>
            </>
          }
        >
          {deleteError && <div className="dashboard__error">{deleteError}</div>}
        </Modal>
      )}
    </div>
  )
}

