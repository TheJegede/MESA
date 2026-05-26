const BASE = 'http://localhost:8010'

async function _json(r, label) {
  if (!r.ok) throw new Error(`${label} failed: ${r.status}`)
  return r.json()
}

export async function getTickets(userEmail = '') {
  const url = userEmail ? `${BASE}/tickets?user_email=${encodeURIComponent(userEmail)}` : `${BASE}/tickets`
  return _json(await fetch(url), 'GET /tickets')
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

export async function getClusterTickets(clusterId) {
  return _json(await fetch(`${BASE}/clusters/${clusterId}/tickets`), `GET /clusters/${clusterId}/tickets`)
}

export async function getClusterEvents(clusterId) {
  return _json(await fetch(`${BASE}/clusters/${clusterId}/events`), `GET /clusters/${clusterId}/events`)
}

export async function getClusterHistory() {
  return _json(await fetch(`${BASE}/clusters/history`), 'GET /clusters/history')
}

export async function getDashboardStats() {
  return _json(await fetch(`${BASE}/dashboard-stats`), 'GET /dashboard-stats')
}

export async function uploadSchema(file, confirmed = false, triggeredByCluster = '', facultyEmail = '', system = '') {
  const form = new FormData()
  form.append('file', file)
  form.append('faculty_email', facultyEmail)
  if (system) form.append('system', system)
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

export async function setBaseline(jobId) {
  return _json(
    await fetch(`${BASE}/dict-jobs/${jobId}/set-baseline`, { method: 'POST' }),
    `POST /dict-jobs/${jobId}/set-baseline`
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

export async function getEmailLog(limit = 10) {
  return _json(await fetch(`${BASE}/email-log?limit=${limit}`), 'GET /email-log')
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

export async function getTicketMessages(ticketId) {
  return _json(await fetch(`${BASE}/tickets/${ticketId}/messages`), `GET /tickets/${ticketId}/messages`)
}

export async function sendTicketMessage(ticketId, content) {
  return _json(
    await fetch(`${BASE}/tickets/${ticketId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }),
    `POST /tickets/${ticketId}/messages`
  )
}

export async function resolveTicket(ticketId) {
  return _json(
    await fetch(`${BASE}/tickets/${ticketId}/resolve`, { method: 'POST' }),
    `POST /tickets/${ticketId}/resolve`
  )
}

export async function getEscalatedThreads() {
  return _json(await fetch(`${BASE}/admin/escalated-threads`), 'GET /admin/escalated-threads')
}

export async function sendAdminReply(ticketId, content) {
  return _json(
    await fetch(`${BASE}/admin/tickets/${ticketId}/reply`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ content }),
    }),
    `POST /admin/tickets/${ticketId}/reply`
  )
}
