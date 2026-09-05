const REAL_ESTATE_MODULES = [
  { key: 'overview', label: 'نظرة عامة', path: 'overview' },
  { key: 'finance', label: 'المالية', path: 'finance' },
  { key: 'buildingParking', label: 'المبنى والمواقف', path: 'buildings' },
  { key: 'customers', label: 'العملاء', path: 'customers' },
  { key: 'reports', label: 'التقارير', path: 'reports' },
  { key: 'parties', label: 'الأطراف', path: 'parties' },
  { key: 'cheques', label: 'الشيكات', path: 'cheques' },
]

const TYPE_ALIASES = {
  'real estate': 'real_estate',
  realestate: 'real_estate',
  real_estate: 'real_estate',
  'real-estate': 'real_estate',
  عقار: 'real_estate',
  عقارات: 'real_estate',
  restaurant: 'restaurant',
  مطعم: 'restaurant',
  shop: 'shop',
  'محل تجاري': 'shop',
  cafe: 'cafe',
  مقهى: 'cafe',
}

export function normalizeProjectType(projectType) {
  if (typeof projectType !== 'string') return null
  const normalized = projectType
    .trim()
    .toLowerCase()
    .replace(/[_\-\s]+/g, ' ')
    .trim()

  return TYPE_ALIASES[normalized] ?? null
}

export function getProjectTypeLabel(typeKey) {
  if (typeKey === 'real_estate') return 'عقارات'
  if (typeKey === 'restaurant') return 'مطعم'
  if (typeKey === 'shop') return 'محل تجاري'
  if (typeKey === 'cafe') return 'مقهى'
  return null
}

export function getProjectModules(projectType) {
  const normalizedType = normalizeProjectType(projectType)

  if (normalizedType === 'real_estate') {
    return REAL_ESTATE_MODULES
  }

  return []
}
