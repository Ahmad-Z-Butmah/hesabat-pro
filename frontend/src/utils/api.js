// ============================================================
// دوال الاتصال بالباك اند (FastAPI) — تُستخدم عبر الصفحات
// ============================================================

const API_BASE = '/api/v1'

export class ApiError extends Error {
  constructor(message, status, detail) {
    super(message)
    this.status = status
    this.detail = detail
  }
}

export function saveToken(token) {
  localStorage.setItem('access_token', token)
}

export function getToken() {
  return localStorage.getItem('access_token')
}

export function clearToken() {
  localStorage.removeItem('access_token')
}

function authHeaders() {
  const token = getToken()
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, options = {}) {
  const headers = {
    ...authHeaders(),
    ...options.headers,
  }

  if (options.body != null && !(options.body instanceof FormData) && !('Content-Type' in headers)) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  })

  const data = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) {
    const detail = data?.detail
    const message = typeof detail === 'string' ? detail : (detail?.message || 'حدث خطأ في الاتصال بالباك-اند')
    throw new ApiError(message, res.status, detail)
  }

  return data
}

/** تسجيل الدخول: يرجع { access_token, token_type } أو يرمي ApiError */
export async function login(username, password) {
  const body = new URLSearchParams({ username, password })

  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  })

  const data = await res.json().catch(() => ({}))

  if (!res.ok) {
    throw new ApiError(data.detail || 'حدث خطأ أثناء تسجيل الدخول', res.status)
  }

  return data
}

export async function getProjects() {
  return request('/projects')
}

export async function getProject(projectId) {
  return request(`/projects/${projectId}`)
}

export async function listParties(params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/parties${query ? `?${query}` : ''}`)
}

export async function getPartiesSummary(projectId) {
  return request(`/projects/${projectId}/parties/summary`)
}

export async function getPartyTransactions(projectId, partyId) {
  return request(`/projects/${projectId}/parties/${partyId}/transactions`)
}

export async function updateParty(partyId, payload) {
  return request(`/parties/${partyId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deletePartyApi(partyId) {
  return request(`/parties/${partyId}`, {
    method: 'DELETE',
  })
}

export async function createProject(projectPayload) {
  return request('/projects', {
    method: 'POST',
    body: JSON.stringify(projectPayload),
  })
}

export async function createProjectTransaction(projectId, transactionPayload, attachmentFile) {
  const formData = new FormData()
  Object.entries(transactionPayload).forEach(([key, value]) => {
    if (value != null) {
      formData.append(key, value)
    }
  })
  formData.append('has_attachment', attachmentFile ? 'true' : String(transactionPayload.has_attachment ?? false))
  if (attachmentFile) {
    formData.append('attachment', attachmentFile)
  }

  return request(`/projects/${projectId}/transactions`, {
    method: 'POST',
    body: formData,
  })
}

export async function createTransaction(projectId, formData) {
  return request(`/projects/${projectId}/transactions`, {
    method: 'POST',
    body: formData,
  })
}

/** حفظ عدة شيكات لنفس الطرف في حركة واحدة منسقة (Atomic) */
export async function createTransactionsBatch(projectId, body) {
  return request(`/projects/${projectId}/transactions/batch`, {
    method: 'POST',
    body: body instanceof FormData ? body : JSON.stringify(body),
  })
}

export async function listProjectTransactions(projectId, params = {}) {
  const query = new URLSearchParams({ project_id: projectId, ...params }).toString()
  return request(`/transactions?${query}`)
}

/** جلب حركات المشروع الحالي (مصدر الشيكات) من الباك-اند مباشرة */
export async function listProjectCheques(projectId) {
  return request(`/projects/${projectId}/transactions`)
}

export async function getFinanceSummary(projectId) {
  return request(`/projects/${projectId}/finance/summary`)
}

export async function getProjectOverview(projectId) {
  return request(`/projects/${projectId}/overview`)
}

export async function getProjectReports(projectId, params = {}) {
  const query = new URLSearchParams(params).toString()
  return request(`/projects/${projectId}/reports${query ? `?${query}` : ''}`)
}

export async function updateTransaction(transactionId, payload) {
  return request(`/transactions/${transactionId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteTransactionApi(transactionId) {
  return request(`/transactions/${transactionId}`, {
    method: 'DELETE',
  })
}

export async function deleteProject(projectId) {
  return request(`/projects/${projectId}`, {
    method: 'DELETE',
  })
}

export async function listProjectUnits(projectId) {
  return request(`/units?project_id=${projectId}`)
}

export async function createUnit(projectId, payload) {
  return request('/units', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, ...payload }),
  })
}

export async function updateUnit(unitId, payload) {
  return request(`/units/${unitId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteUnitApi(unitId) {
  return request(`/units/${unitId}`, {
    method: 'DELETE',
  })
}

export async function listProjectParkingSpots(projectId) {
  return request(`/parking-spots?project_id=${projectId}`)
}

export async function createParkingSpot(projectId, payload) {
  return request('/parking-spots', {
    method: 'POST',
    body: JSON.stringify({ project_id: projectId, ...payload }),
  })
}

export async function updateParkingSpot(spotId, payload) {
  return request(`/parking-spots/${spotId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function deleteParkingSpotApi(spotId) {
  return request(`/parking-spots/${spotId}`, {
    method: 'DELETE',
  })
}

export async function propertySetup(projectId, payload) {
  return request(`/projects/${projectId}/property-setup`, {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function getTransactionAttachmentBlob(transactionId, attachmentId) {
  const token = getToken()
  const url = `${API_BASE}/transactions/${transactionId}/attachments/${attachmentId}/download`
  const res = await fetch(url, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  })
  if (!res.ok) {
    const data = await res.json().catch(() => null)
    throw new ApiError(data?.detail || 'تعذّر تحميل المرفق', res.status)
  }
  return res.blob()
}

/** بيع وحدة (Workflow متكامل Atomic) — يرسل JSON في حقل payload + ملفات مرتبطة */
export async function createUnitSale(projectId, formData) {
  return request(`/projects/${projectId}/unit-sales`, {
    method: 'POST',
    body: formData,
  })
}

export async function getCustomers(projectId) {
  return request(`/projects/${projectId}/customers`)
}

export async function getCustomer(projectId, customerId) {
  return request(`/projects/${projectId}/customers/${customerId}`)
}

export async function updateCustomer(projectId, customerId, payload) {
  return request(`/projects/${projectId}/customers/${customerId}`, {
    method: 'PATCH',
    body: JSON.stringify(payload),
  })
}

export async function getCustomerTransactions(projectId, customerId) {
  return request(`/projects/${projectId}/customers/${customerId}/transactions`)
}

export async function createCustomerTransaction(projectId, customerId, formData) {
  return request(`/projects/${projectId}/customers/${customerId}/transactions`, {
    method: 'POST',
    body: formData,
  })
}
