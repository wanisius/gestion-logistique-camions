import React, { useCallback, useEffect, useState } from 'react'
import { api, fmtDate, isPaired, UnpairedError } from './api.js'
import { Dashboard, Devices, Security, Actions, History, Alerts, Settings } from './views.jsx'

const TABS = [
  ['dashboard', 'Tableau de bord'], ['devices', 'Appareils'], ['security', 'Sécurité'],
  ['actions', 'Actions'], ['history', 'Historique'], ['alerts', 'Alertes'], ['settings', 'Réglages'],
]

export default function App() {
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('wsm-tab') || 'dashboard' } catch { return 'dashboard' } })
  const [state, setState] = useState(null)
  const [devices, setDevices] = useState([])
  const [events, setEvents] = useState([])
  const [alerts, setAlerts] = useState([])
  const [error, setError] = useState('')
  const [paired, setPaired] = useState(isPaired())

  const refresh = useCallback(async () => {
    try {
      const [s, d, e, a] = await Promise.all([api.state(), api.devices(), api.events(2000), api.alerts()])
      setState(s); setDevices(d); setEvents(e); setAlerts(a); setError('')
    } catch (err) {
      if (err instanceof UnpairedError) setPaired(false)
      else setError(err.message)
    }
  }, [])

  useEffect(() => { if (paired) refresh() }, [refresh, paired])
  useEffect(() => {
    if (!paired) return undefined
    const id = setInterval(refresh, state?.scanning ? 2500 : 20000)
    return () => clearInterval(id)
  }, [refresh, state?.scanning, paired])
  useEffect(() => { try { localStorage.setItem('wsm-tab', tab) } catch { /* stockage indisponible */ } }, [tab])

  const scan = async (full) => { await api.scan(full); setState((s) => ({ ...s, scanning: true })); setTimeout(refresh, 800) }

  if (!paired) {
    return (
      <div className="pairing">
        <svg viewBox="0 0 24 24" width="40" height="40" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /></svg>
        <h1>Appareil non associé</h1>
        <p>Pour consulter WiFi Security Manager sur ce téléphone :</p>
        <ol>
          <li>Sur le PC, ouvrez le tableau de bord, onglet <strong>Réglages</strong>.</li>
          <li>Dans « Accès depuis Android », activez l'accès.</li>
          <li>Scannez le QR code affiché avec l'appareil photo de ce téléphone.</li>
        </ol>
        <p className="muted small">Si l'accès a été révoqué ou désactivé depuis le PC, il faut scanner un nouveau QR code.</p>
      </div>
    )
  }
  if (!state) {
    return <div className="loading">{error ? `Connexion au service local impossible : ${error}` : 'Chargement…'}</div>
  }
  const ctx = { state, devices, events, alerts, refresh, scan, setState, goto: setTab }

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true"><path fill="currentColor" d="M12 2 4 5v6c0 5 3.4 9.7 8 11 4.6-1.3 8-6 8-11V5z" /></svg>
          <span>WiFi Security Manager</span>
        </div>
        <div className="topbar-right">
          <span className="muted small">
            {state.scanning ? 'Analyse en cours…' : `Dernière analyse : ${fmtDate(state.last_scan)}`}
          </span>
          <button className="btn primary" disabled={state.scanning} onClick={() => scan(true)}>
            {state.scanning ? 'Analyse…' : 'Analyser maintenant'}
          </button>
        </div>
      </header>
      <nav className="tabs" role="tablist">
        {TABS.map(([id, label]) => (
          <button key={id} role="tab" aria-selected={tab === id} className={tab === id ? 'tab active' : 'tab'} onClick={() => setTab(id)}>
            {label}
            {id === 'alerts' && state.unread_alerts > 0 && <span className="count">{state.unread_alerts}</span>}
            {id === 'actions' && state.actions.filter((a) => a.status === 'proposée').length > 0 &&
              <span className="count">{state.actions.filter((a) => a.status === 'proposée').length}</span>}
          </button>
        ))}
      </nav>
      {error && <div className="banner">⚠ {error}</div>}
      <main className="content">
        {tab === 'dashboard' && <Dashboard {...ctx} />}
        {tab === 'devices' && <Devices {...ctx} />}
        {tab === 'security' && <Security {...ctx} />}
        {tab === 'actions' && <Actions {...ctx} />}
        {tab === 'history' && <History {...ctx} />}
        {tab === 'alerts' && <Alerts {...ctx} />}
        {tab === 'settings' && <Settings {...ctx} />}
      </main>
      <footer className="footer muted small">
        Analyse locale et non destructive · aucune modification sans votre confirmation · aucune clé Wi-Fi lue · v{state.version}
      </footer>
    </div>
  )
}
