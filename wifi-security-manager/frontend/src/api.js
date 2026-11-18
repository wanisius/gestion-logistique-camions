// Jeton injecté par le serveur local dans index.html (protège l'API des autres sites).
const meta = document.querySelector('meta[name="wsm-token"]')
const TOKEN = meta && !meta.content.startsWith('__') ? meta.content : (import.meta.env.VITE_WSM_TOKEN || '')

async function call(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-WSM-Token': TOKEN, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok && res.status !== 409) throw new Error((data && data.error) || `Erreur ${res.status}`)
  return data
}

export const api = {
  state: () => call('/api/state'),
  devices: () => call('/api/devices'),
  events: (limit = 1000) => call(`/api/events?limit=${limit}`),
  alerts: () => call('/api/alerts'),
  scan: (full) => call('/api/scan', { full }),
  updateDevice: (mac, patch) => call(`/api/devices/${mac}`, patch),
  forgetDevice: (mac) => call(`/api/devices/${mac}/forget`, {}),
  ackAlert: (id) => call(`/api/alerts/${id}/ack`, {}),
  answer: (key, value) => call('/api/checklist', { key, value }),
  setAction: (id, status, confirm = false) => call(`/api/actions/${id}`, { status, confirm }),
  settings: (values) => call('/api/settings', values),
}

export const fmtDate = (ts) => (ts ? new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export const deviceLabel = (d) => d.custom_name || d.hostname || d.model || d.vendor || d.mac
