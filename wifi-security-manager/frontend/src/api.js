// Jeton d'accès à l'API :
// - sur le PC, injecté par le serveur local dans index.html ;
// - sur un téléphone, reçu une fois via le QR code (#k=…) puis mémorisé sur l'appareil.
const STORAGE_KEY = 'wsm-mobile-token'
const meta = document.querySelector('meta[name="wsm-token"]')
const pageToken = meta && !meta.content.startsWith('__') ? meta.content : ''

function initialToken() {
  if (pageToken) return pageToken
  const m = location.hash.match(/[#&]k=([\w-]+)/)
  if (m) {
    try { localStorage.setItem(STORAGE_KEY, m[1]) } catch { /* stockage indisponible */ }
    history.replaceState(null, '', location.pathname + location.search)   // retire le jeton de l'URL
    return m[1]
  }
  try { return localStorage.getItem(STORAGE_KEY) || import.meta.env.VITE_WSM_TOKEN || '' } catch { return '' }
}

let TOKEN = initialToken()

export const isPaired = () => !!TOKEN
export class UnpairedError extends Error {}

export function forgetPairing() {
  TOKEN = ''
  try { localStorage.removeItem(STORAGE_KEY) } catch { /* stockage indisponible */ }
}

async function call(path, body) {
  const res = await fetch(path, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'X-WSM-Token': TOKEN, 'Content-Type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  })
  const data = await res.json().catch(() => null)
  if (res.status === 401 && !pageToken) { forgetPairing(); throw new UnpairedError('appairage requis') }
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
  setMobile: (enabled) => call('/api/mobile', { enabled }),
  revokeMobile: () => call('/api/mobile/revoke', {}),
}

export const fmtDate = (ts) => (ts ? new Date(ts).toLocaleString('fr-FR', { dateStyle: 'short', timeStyle: 'short' }) : '—')

export const deviceLabel = (d) => d.custom_name || d.hostname || d.model || d.vendor || d.mac
