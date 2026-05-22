const BASE = 'http://localhost:8000'

export async function getTickets() {
  const r = await fetch(`${BASE}/tickets`)
  return r.json()
}

export async function submitTicket(text, userEmail = '') {
  const r = await fetch(`${BASE}/tickets`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, user_email: userEmail }),
  })
  return r.json()
}

export async function getClusters() {
  const r = await fetch(`${BASE}/clusters`)
  return r.json()
}

export async function triggerAgent2(clusterId) {
  const r = await fetch(`${BASE}/clusters/trigger?cluster_id=${clusterId}`, { method: 'POST' })
  return r.json()
}

export async function getDashboardStats() {
  const r = await fetch(`${BASE}/dashboard-stats`)
  return r.json()
}

export async function uploadSchema(file, confirmed = false, triggeredByCluster = '') {
  const form = new FormData()
  form.append('file', file)
  const params = new URLSearchParams({ confirmed: String(confirmed), triggered_by_cluster: triggeredByCluster })
  const r = await fetch(`${BASE}/generate-dictionary?${params}`, { method: 'POST', body: form })
  return r.json()
}

export async function getDictJobs() {
  const r = await fetch(`${BASE}/dict-jobs`)
  return r.json()
}

export async function getDistressFlags() {
  const r = await fetch(`${BASE}/distress-flags`)
  return r.json()
}

export async function approveFlag(id) {
  const r = await fetch(`${BASE}/distress-flags/${id}/approve`, { method: 'POST' })
  return r.json()
}

export async function dismissFlag(id) {
  const r = await fetch(`${BASE}/distress-flags/${id}/dismiss`, { method: 'POST' })
  return r.json()
}

export async function getSystemHealth() {
  const r = await fetch(`${BASE}/system-health`)
  return r.json()
}
