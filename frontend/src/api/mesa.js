const BASE = 'http://localhost:8010'

async function _json(r, label) {
  if (!r.ok) throw new Error(`${label} failed: ${r.status}`)
  return r.json()
}

export async function getTickets() {
  return _json(await fetch(`${BASE}/tickets`), 'GET /tickets')
}

export async function submitTicket(text, userEmail = '') {
  return _json(
    await fetch(`${BASE}/tickets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, user_email: userEmail }),
    }),
    'POST /tickets'
  )
}

export async function getClusters() {
  return _json(await fetch(`${BASE}/clusters`), 'GET /clusters')
}

export async function triggerAgent2(clusterId) {
  return _json(
    await fetch(`${BASE}/clusters/trigger?cluster_id=${clusterId}`, { method: 'POST' }),
    'POST /clusters/trigger'
  )
}

export async function getDashboardStats() {
  return _json(await fetch(`${BASE}/dashboard-stats`), 'GET /dashboard-stats')
}

// uploadSchema returns r.json() directly — caller handles ferpa_flag, detail, and success cases
export async function uploadSchema(file, confirmed = false, triggeredByCluster = '', facultyEmail = '') {
  const form = new FormData()
  form.append('file', file)
  form.append('faculty_email', facultyEmail)
  const params = new URLSearchParams({ confirmed: String(confirmed), triggered_by_cluster: triggeredByCluster })
  const r = await fetch(`${BASE}/generate-dictionary?${params}`, { method: 'POST', body: form })
  return r.json()
}

export async function getDictJobs() {
  return _json(await fetch(`${BASE}/dict-jobs`), 'GET /dict-jobs')
}

export function getDictJobDownloadUrl(id) {
  return `${BASE}/dict-jobs/${id}/download`
}

export async function getDictJobEntries(id) {
  return _json(await fetch(`${BASE}/dict-jobs/${id}/entries`), `GET /dict-jobs/${id}/entries`)
}

export async function resendDictJob(id) {
  return _json(
    await fetch(`${BASE}/dict-jobs/${id}/resend`, { method: 'POST' }),
    `POST /dict-jobs/${id}/resend`
  )
}

export async function getDistressFlags() {
  return _json(await fetch(`${BASE}/distress-flags`), 'GET /distress-flags')
}

export async function approveFlag(id) {
  return _json(
    await fetch(`${BASE}/distress-flags/${id}/approve`, { method: 'POST' }),
    `POST /distress-flags/${id}/approve`
  )
}

export async function dismissFlag(id) {
  return _json(
    await fetch(`${BASE}/distress-flags/${id}/dismiss`, { method: 'POST' }),
    `POST /distress-flags/${id}/dismiss`
  )
}

export async function getSystemHealth() {
  return _json(await fetch(`${BASE}/system-health`), 'GET /system-health')
}

export async function getConfig() {
  return _json(await fetch(`${BASE}/config`), 'GET /config')
}

export async function notifyItTeam(clusterId) {
  return _json(
    await fetch(`${BASE}/clusters/notify-it?cluster_id=${clusterId}`, { method: 'POST' }),
    'POST /clusters/notify-it'
  )
}
