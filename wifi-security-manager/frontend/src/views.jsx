import React, { useMemo, useState } from 'react'
import qrcode from 'qrcode-generator'
import { api, deviceLabel, fmtDate } from './api.js'
import { Card, Category, Confirm, Empty, FindingStatus, Severity, Stat } from './ui.jsx'
import { ConnectionsPerDay, ScoreHistory, ScoreRing } from './charts.jsx'

const SEV_ORDER = { critique: 0, 'élevé': 1, moyen: 2, faible: 3, info: 4 }
const STATUS_ORDER = { risque: 0, 'à_vérifier': 1, ok: 2 }
const sortFindings = (f) => [...f].sort((a, b) =>
  STATUS_ORDER[a.status] - STATUS_ORDER[b.status] || SEV_ORDER[a.severity] - SEV_ORDER[b.severity])

const ipKey = (ip) => (ip || '0.0.0.0').split('.').map((n) => n.padStart(3, '0')).join('.')

// ===================================================================== Tableau de bord
export function Dashboard({ state, devices, events, alerts, goto }) {
  const sc = state.score || {}
  const online = devices.filter((d) => d.online)
  const count = (c) => online.filter((d) => d.category === c).length
  const top = sortFindings(state.findings).filter((f) => f.status !== 'ok').slice(0, 5)
  const n = state.network, w = state.wifi, r = state.router
  if (!state.last_scan) {
    return (
      <Card title="Bienvenue">
        <p>Aucune analyse n'a encore été effectuée. Cliquez sur <strong>Analyser maintenant</strong> pour lancer le
          diagnostic : configuration réseau, routeur, appareils connectés et premiers constats.</p>
        <p className="muted">L'analyse est non destructive : lecture de la table ARP, un ping par adresse du réseau local,
          découverte UPnP et quelques tests de connexion vers la passerelle uniquement.</p>
      </Card>
    )
  }
  return (
    <div className="grid">
      <Card title="Score de sécurité" className="span-1">
        <div className="score-block">
          <ScoreRing value={sc.value} grade={sc.grade} />
          <div className="score-legend">
            <div><span className="badge serious">✗ {sc.risks}</span> risque(s)</div>
            <div><span className="badge warning">? {sc.to_check}</span> à vérifier</div>
            <div><span className="badge good">✓ {sc.ok}</span> conforme(s)</div>
          </div>
        </div>
      </Card>
      <Card title="Appareils en ligne" className="span-1">
        <div className="stats">
          <Stat label="Total" value={online.length} />
          <Stat label="Connus" value={count('connu')} />
          <Stat label="Nouveaux" value={count('nouveau')} />
          <Stat label="Inconnus" value={count('inconnu')} />
        </div>
        <button className="btn ghost" onClick={() => goto('devices')}>Gérer les appareils →</button>
      </Card>
      <Card title="Réseau" className="span-1">
        <dl className="kv">
          <dt>Wi-Fi</dt><dd>{w.connected ? `${w.ssid} · ${w.authentication}` : 'non connecté en Wi-Fi'}</dd>
          <dt>Sous-réseau</dt><dd>{n.subnet || '—'}</dd>
          <dt>Passerelle</dt><dd>{n.gateway || '—'}</dd>
          <dt>Routeur</dt><dd>{[r.brand, r.model].filter(Boolean).join(' · ') || r.vendor || 'non identifié'}</dd>
          <dt>Ce PC</dt><dd>{n.ip} ({n.interface})</dd>
        </dl>
      </Card>
      <Card title="Priorités" className="span-2" actions={<button className="btn ghost" onClick={() => goto('security')}>Tout voir →</button>}>
        {top.length === 0 ? <Empty>Aucun risque en attente. 🎉</Empty> : (
          <ul className="list">
            {top.map((f) => (
              <li key={f.id} className="list-row">
                <Severity level={f.severity} /><FindingStatus status={f.status} />
                <span className="grow">{f.title}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Alertes récentes" className="span-1" actions={<button className="btn ghost" onClick={() => goto('alerts')}>Tout voir →</button>}>
        {alerts.filter((a) => !a.acknowledged).length === 0 ? <Empty>Aucune alerte non lue.</Empty> : (
          <ul className="list">
            {alerts.filter((a) => !a.acknowledged).slice(0, 5).map((a) => (
              <li key={a.id} className="list-row col">
                <span><Severity level={a.severity} /> <strong>{a.title}</strong></span>
                <span className="muted small">{fmtDate(a.ts)} · {a.message}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="Évolution du score" className="span-2"><ScoreHistory points={state.score_history} /></Card>
      <Card title="Appareils connectés par jour" className="span-1"><ConnectionsPerDay events={events} compact /></Card>
    </div>
  )
}

// ===================================================================== Appareils
function DeviceRow({ d, onSave, onForget }) {
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(d.custom_name || '')
  const save = async () => { await onSave(d.mac, { name }); setEditing(false) }
  const role = d.is_gateway ? 'Passerelle' : d.is_self ? 'Ce PC' : ''
  return (
    <tr className={d.online ? '' : 'offline'}>
      <td className="cell-name">
        {editing ? (
          <form className="inline" onSubmit={(e) => { e.preventDefault(); save() }}>
            <input autoFocus value={name} maxLength={80} onChange={(e) => setName(e.target.value)} placeholder="Ex. : Téléphone de Sara" />
            <button className="btn small primary" type="submit">OK</button>
            <button className="btn small ghost" type="button" onClick={() => setEditing(false)}>×</button>
          </form>
        ) : (
          <button className="link" onClick={() => setEditing(true)} title="Renommer">
            <strong>{deviceLabel(d)}</strong> <span aria-hidden="true">✎</span>
          </button>
        )}
        <div className="muted small">{[role, d.custom_name && d.hostname, d.model].filter(Boolean).join(' · ')}</div>
      </td>
      <td data-label="IP" className="mono">{d.ip}</td>
      <td data-label="MAC" className="mono">{d.mac}</td>
      <td data-label="Fabricant">{d.vendor || <span className="muted">—</span>}</td>
      <td data-label="Statut"><Category value={d.category} /></td>
      <td data-label="État">{d.online ? <span className="badge good">● En ligne</span> : <span className="badge neutral">○ Hors ligne</span>}</td>
      <td data-label="Détection" className="small"><div>{fmtDate(d.first_seen)}<br /><span className="muted">vu {fmtDate(d.last_seen)}</span></div></td>
      <td className="nowrap cell-actions">
        {d.authorized
          ? <button className="btn small ghost" onClick={() => onSave(d.mac, { authorized: false })}>Retirer l'autorisation</button>
          : <button className="btn small primary" onClick={() => onSave(d.mac, { authorized: true })}>Autoriser</button>}
        {!d.online && <button className="btn small ghost" onClick={() => onForget(d)}>Oublier</button>}
      </td>
    </tr>
  )
}

export function Devices({ devices, refresh }) {
  const [filter, setFilter] = useState('tous')
  const [q, setQ] = useState('')
  const [onlineOnly, setOnlineOnly] = useState(true)
  const [forget, setForget] = useState(null)
  const list = useMemo(() => devices
    .filter((d) => filter === 'tous' || d.category === filter)
    .filter((d) => !onlineOnly || d.online)
    .filter((d) => !q || [d.custom_name, d.hostname, d.vendor, d.ip, d.mac, d.model].join(' ').toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (ipKey(a.ip) < ipKey(b.ip) ? -1 : 1)), [devices, filter, q, onlineOnly])
  const save = async (mac, patch) => { await api.updateDevice(mac, patch); refresh() }
  return (
    <Card title={`Appareils (${list.length})`}>
      <div className="filters">
        {['tous', 'connu', 'nouveau', 'inconnu'].map((f) => (
          <button key={f} className={filter === f ? 'chip active' : 'chip'} onClick={() => setFilter(f)}>
            {f === 'tous' ? 'Tous' : f[0].toUpperCase() + f.slice(1) + 's'} ({devices.filter((d) => (f === 'tous' || d.category === f) && (!onlineOnly || d.online)).length})
          </button>
        ))}
        <label className="check"><input type="checkbox" checked={onlineOnly} onChange={(e) => setOnlineOnly(e.target.checked)} /> En ligne uniquement</label>
        <input className="search" type="search" placeholder="Rechercher (nom, IP, MAC, fabricant)…" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <p className="muted small">
        Cliquez sur un nom pour le modifier, puis « Autoriser » les appareils que vous reconnaissez. Les adresses MAC
        « privées » (aléatoires) des smartphones récents n'indiquent pas de fabricant : c'est normal.
      </p>
      {list.length === 0 ? <Empty>Aucun appareil ne correspond.</Empty> : (
        <div className="table-wrap">
          <table className="devices-table">
            <thead><tr><th>Nom</th><th>IP</th><th>MAC</th><th>Fabricant</th><th>Statut</th><th>État</th><th>Première / dernière détection</th><th /></tr></thead>
            <tbody>{list.map((d) => <DeviceRow key={d.mac} d={d} onSave={save} onForget={setForget} />)}</tbody>
          </table>
        </div>
      )}
      <Confirm open={!!forget} title="Oublier cet appareil ?" confirmLabel="Oublier"
        onCancel={() => setForget(null)}
        onConfirm={async () => { await api.forgetDevice(forget.mac); setForget(null); refresh() }}>
        <p>« {forget && deviceLabel(forget)} » sera retiré de l'inventaire local (son nom et son autorisation sont perdus).
          Cela n'a <strong>aucun effet sur le réseau</strong> : l'appareil n'est pas bloqué. S'il se reconnecte, il sera
          signalé comme nouveau.</p>
      </Confirm>
    </Card>
  )
}

// ===================================================================== Sécurité
const ANSWERS = [['oui', 'Oui'], ['non', 'Non'], ['inconnu', 'Je ne sais pas']]

export function Security({ state, setState }) {
  const r = state.router, w = state.wifi, comp = r.compatibility || {}
  const [open, setOpen] = useState(null)
  const answer = async (key, value) => setState(await api.answer(key, value))
  return (
    <div className="grid">
      <Card title="Routeur et compatibilité" className="span-2">
        <dl className="kv">
          <dt>Marque</dt><dd>{r.brand || 'non identifiée'}</dd>
          <dt>Fabricant / modèle</dt><dd>{[r.vendor, r.model].filter(Boolean).join(' · ') || 'non publié'}</dd>
          <dt>Identifié via</dt><dd>{(r.identification_sources || []).join(', ') || '—'}</dd>
          <dt>Interface d'administration</dt>
          <dd>{r.https?.reachable ? `HTTPS ✓ (port ${r.https.port || 443})` : r.http?.reachable ? `HTTP seulement (port ${r.http.port || 80})` : 'non détectée'}
            {(r.https?.title || r.http?.title) && ` — « ${r.https?.title || r.http?.title} »`}</dd>
          <dt>Ports ouverts (passerelle)</dt>
          <dd>{Object.entries(r.open_ports || {}).map(([p, v]) => `${p} ${v}`).join(' · ') || 'aucun parmi ceux testés'}</dd>
          <dt>UPnP</dt><dd>{r.upnp_igd ? `actif (IGD) · ${r.port_mappings?.length || 0} redirection(s)` : r.upnp_enabled ? 'annonces UPnP, sans IGD' : 'non détecté'}</dd>
          <dt>DNS</dt><dd>{(r.dns?.servers || []).map((s) => `${s.server} (${s.type})`).join(' · ') || '—'}</dd>
          <dt>Compatibilité</dt><dd><strong>{comp.level || '—'}</strong></dd>
        </dl>
        {comp.note && <p className="note">{comp.note}</p>}
      </Card>
      <Card title="Wi-Fi" className="span-1">
        {w.connected ? (
          <dl className="kv">
            <dt>SSID</dt><dd>{w.ssid}</dd>
            <dt>Sécurité</dt><dd>{w.authentication} / {w.cipher}</dd>
            <dt>Radio</dt><dd>{w.radio} {w.band && `· ${w.band}`} {w.channel && `· canal ${w.channel}`}</dd>
            <dt>Signal</dt><dd>{w.signal != null ? `${w.signal} %` : '—'}</dd>
            <dt>Clé Wi-Fi</dt><dd className="muted">jamais lue ni stockée</dd>
          </dl>
        ) : <Empty>Ce PC n'est pas connecté en Wi-Fi.</Empty>}
        {r.port_mappings?.length > 0 && (<>
          <h3 className="sub">Redirections UPnP</h3>
          <ul className="list small">
            {r.port_mappings.map((m, i) => <li key={i} className="mono">{m.protocol} {m.external_port} → {m.internal_client}:{m.internal_port} <span className="muted">{m.description}</span></li>)}
          </ul>
        </>)}
      </Card>
      <Card title="Liste de contrôle du routeur" className="span-3">
        <p className="muted small">Ces réglages ne sont lisibles qu'avec vos identifiants administrateur, que le logiciel ne demande
          jamais. Vérifiez-les dans l'interface de votre routeur et indiquez la réponse : le score est recalculé aussitôt.</p>
        <ul className="list">
          {state.checklist.map((c) => (
            <li key={c.key} className="list-row wrap">
              <div className="grow"><div>{c.question}</div><div className="muted small">{c.where}</div></div>
              <div className="segmented" role="radiogroup" aria-label={c.question}>
                {ANSWERS.map(([v, l]) => (
                  <button key={v} role="radio" aria-checked={c.answer === v} className={c.answer === v ? 'active' : ''} onClick={() => answer(c.key, v)}>{l}</button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      </Card>
      <Card title="Constats et corrections expliquées" className="span-3">
        <ul className="list">
          {sortFindings(state.findings).map((f) => (
            <li key={f.id} className="finding">
              <button className="finding-head" aria-expanded={open === f.id} onClick={() => setOpen(open === f.id ? null : f.id)}>
                <FindingStatus status={f.status} /><Severity level={f.severity} />
                <span className="grow">{f.title}</span><span className="muted small">{f.category}</span>
                <span aria-hidden="true">{open === f.id ? '▾' : '▸'}</span>
              </button>
              {open === f.id && (
                <div className="finding-body">
                  <p><strong>Pourquoi :</strong> {f.detail}</p>
                  {f.status !== 'ok' && f.recommendation && <p><strong>Correction proposée :</strong> {f.recommendation}</p>}
                  {f.status !== 'ok' && f.steps?.length > 0 && <ol>{f.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>}
                  {f.router_change && f.status !== 'ok' && <p className="muted small">Cette correction concerne le routeur : elle apparaît dans l'onglet Actions et attend votre décision.</p>}
                </div>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}

// ===================================================================== Actions
const ACTION_LABEL = { 'proposée': 'Proposée', 'autorisée': 'Autorisée par vous', 'refusée': 'Refusée', 'appliquée': 'Appliquée' }

export function Actions({ state, refresh }) {
  const [confirm, setConfirm] = useState(null)
  const set = async (id, status, ok = false) => { await api.setAction(id, status, ok); refresh() }
  const adminUrl = state.admin_url || null
  const actions = [...state.actions].sort((a, b) => SEV_ORDER[a.severity] - SEV_ORDER[b.severity])
  return (
    <Card title="Actions de sécurisation proposées">
      <div className="note">
        <strong>Rien n'est modifié automatiquement.</strong> Le logiciel ne se connecte jamais à l'administration de votre routeur,
        ne bloque aucun appareil, ne change aucun mot de passe et ne redémarre rien. Lorsque vous autorisez une action, il vous
        guide pas à pas : c'est vous qui l'appliquez dans l'interface du routeur, avec vos propres identifiants.
      </div>
      {actions.length === 0 ? <Empty>Aucune action proposée pour le moment.</Empty> : (
        <ul className="list">
          {actions.map((a) => (
            <li key={a.id} className="action">
              <div className="action-head">
                <Severity level={a.severity} /><strong className="grow">{a.title}</strong>
                <span className={`badge ${a.status === 'appliquée' ? 'good' : a.status === 'autorisée' ? 'warning' : 'neutral'}`}>{ACTION_LABEL[a.status]}</span>
              </div>
              <p>{a.recommendation}</p>
              {a.status === 'autorisée' && (
                <div className="guide">
                  <ol>{a.steps.map((s, i) => <li key={i}>{s}</li>)}</ol>
                  {adminUrl && <p><a className="btn ghost" href={adminUrl} target="_blank" rel="noreferrer noopener">Ouvrir l'interface du routeur ({adminUrl}) ↗</a></p>}
                  <p className="muted small">Une fois la modification faite, mettez à jour la liste de contrôle (onglet Sécurité) puis relancez une analyse.</p>
                </div>
              )}
              <div className="row">
                {a.status === 'proposée' && <>
                  <button className="btn primary" onClick={() => setConfirm(a)}>Autoriser…</button>
                  <button className="btn ghost" onClick={() => set(a.id, 'refusée')}>Refuser</button>
                </>}
                {a.status === 'autorisée' && <button className="btn primary" onClick={() => set(a.id, 'appliquée')}>J'ai appliqué la modification</button>}
                {a.status !== 'proposée' && <button className="btn ghost" onClick={() => set(a.id, 'proposée')}>Réinitialiser</button>}
              </div>
            </li>
          ))}
        </ul>
      )}
      <Confirm open={!!confirm} title="Autoriser cette action ?" confirmLabel="Oui, j'autorise"
        onCancel={() => setConfirm(null)}
        onConfirm={async () => { await set(confirm.id, 'autorisée', true); setConfirm(null) }}>
        {confirm && <>
          <p><strong>{confirm.title}</strong></p>
          <p>{confirm.recommendation}</p>
          <p className="muted">En confirmant, vous recevrez les étapes détaillées. Le logiciel n'effectuera lui-même aucune
            modification : certaines opérations (changement de clé Wi-Fi, mise à jour) peuvent déconnecter vos appareils —
            choisissez le bon moment.</p>
        </>}
      </Confirm>
    </Card>
  )
}

// ===================================================================== Historique
const EVENT_LABEL = { connexion: 'Connexion', 'déconnexion': 'Déconnexion', nouvel_appareil: 'Nouvel appareil', 'ip_changée': 'IP modifiée' }

export function History({ events, devices }) {
  const [type, setType] = useState('tous')
  const [mac, setMac] = useState('')
  const byMac = useMemo(() => Object.fromEntries(devices.map((d) => [d.mac, d])), [devices])
  const list = events.filter((e) => (type === 'tous' || e.type === type) && (!mac || e.mac === mac)).slice(0, 500)
  return (
    <div className="grid">
      <Card title="Appareils connectés par jour (14 jours)" className="span-3"><ConnectionsPerDay events={events} /></Card>
      <Card title="Journal des connexions" className="span-3">
        <div className="filters">
          {['tous', ...Object.keys(EVENT_LABEL)].map((t) => (
            <button key={t} className={type === t ? 'chip active' : 'chip'} onClick={() => setType(t)}>{t === 'tous' ? 'Tous' : EVENT_LABEL[t]}</button>
          ))}
          <select value={mac} onChange={(e) => setMac(e.target.value)} aria-label="Filtrer par appareil">
            <option value="">Tous les appareils</option>
            {devices.map((d) => <option key={d.mac} value={d.mac}>{deviceLabel(d)}</option>)}
          </select>
        </div>
        {list.length === 0 ? <Empty>Aucun évènement.</Empty> : (
          <div className="table-wrap">
            <table>
              <thead><tr><th>Date</th><th>Évènement</th><th>Appareil</th><th>IP</th><th>Détail</th></tr></thead>
              <tbody>
                {list.map((e, i) => (
                  <tr key={i}>
                    <td className="nowrap">{fmtDate(e.ts)}</td><td>{EVENT_LABEL[e.type] || e.type}</td>
                    <td>{byMac[e.mac] ? deviceLabel(byMac[e.mac]) : e.mac}</td><td className="mono">{e.ip}</td>
                    <td className="muted">{e.detail}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  )
}

// ===================================================================== Alertes
export function Alerts({ alerts, refresh }) {
  const [showAll, setShowAll] = useState(false)
  const list = alerts.filter((a) => showAll || !a.acknowledged)
  const ack = async (id) => { await api.ackAlert(id); refresh() }
  return (
    <Card title="Alertes" actions={<>
      <label className="check"><input type="checkbox" checked={showAll} onChange={(e) => setShowAll(e.target.checked)} /> Afficher les alertes lues</label>
      {alerts.some((a) => !a.acknowledged) && <button className="btn ghost" onClick={() => ack('*')}>Tout marquer comme lu</button>}
    </>}>
      {list.length === 0 ? <Empty>Aucune alerte.</Empty> : (
        <ul className="list">
          {list.map((a) => (
            <li key={a.id} className={`list-row ${a.acknowledged ? 'read' : ''}`}>
              <Severity level={a.severity} />
              <div className="grow"><strong>{a.title}</strong><div className="small">{a.message}</div><div className="muted small">{fmtDate(a.ts)}</div></div>
              {!a.acknowledged && <button className="btn small ghost" onClick={() => ack(a.id)}>Marquer comme lu</button>}
            </li>
          ))}
        </ul>
      )}
    </Card>
  )
}

// ===================================================================== Réglages
function QrCode({ text }) {
  const src = useMemo(() => {
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()
    return qr.createDataURL(5, 4)
  }, [text])
  return <img className="qr" src={src} alt="QR code d'appairage du téléphone" width="220" height="220" />
}

function MobileAccess({ mobile, refresh }) {
  const [busy, setBusy] = useState(false)
  const [confirmOn, setConfirmOn] = useState(false)
  const run = async (fn) => { setBusy(true); try { await fn() } finally { setBusy(false); refresh() } }
  return (
    <Card title="Accès depuis Android">
      <p className="muted small">Consultez et gérez le tableau de bord depuis votre téléphone, connecté au même Wi-Fi.
        Les analyses restent faites par ce PC, qui doit rester allumé avec le logiciel lancé.</p>
      {!mobile.enabled ? (
        <button className="btn primary" disabled={busy} onClick={() => setConfirmOn(true)}>Activer l'accès depuis le téléphone…</button>
      ) : (
        <div className="mobile-access">
          {mobile.listening ? (<>
            <QrCode text={mobile.url} />
            <div className="grow">
              <ol className="steps">
                <li>Connectez le téléphone au même réseau Wi-Fi que ce PC.</li>
                <li>Scannez ce QR code avec l'appareil photo (ou Google Lens), puis ouvrez le lien.</li>
                <li>Dans Chrome : menu <strong>⋮</strong> → <strong>Ajouter à l'écran d'accueil</strong> pour retrouver l'application comme une app.</li>
              </ol>
              <p className="small">Adresse : <code>http://{mobile.ip}:{mobile.port}/</code></p>
              <p className="muted small">Si la page ne s'ouvre pas : à la première activation, Windows demande d'autoriser Python
                dans le pare-feu. Acceptez pour les <strong>réseaux privés</strong> uniquement, et vérifiez que votre Wi-Fi est
                bien défini comme réseau privé dans Windows.</p>
            </div>
          </>) : <p className="banner">⚠ Accès activé mais indisponible : {mobile.error || 'erreur inconnue'}</p>}
          <div className="row">
            <button className="btn ghost" disabled={busy} onClick={() => run(api.revokeMobile)}>Révoquer les téléphones associés</button>
            <button className="btn ghost" disabled={busy} onClick={() => run(() => api.setMobile(false))}>Désactiver l'accès</button>
          </div>
          <p className="muted small">Ce QR code contient une clé d'accès : ne le partagez pas. « Révoquer » génère une nouvelle clé :
            les téléphones déjà associés devront scanner le nouveau QR code.</p>
        </div>
      )}
      <Confirm open={confirmOn} title="Activer l'accès depuis le téléphone ?" confirmLabel="Activer"
        onCancel={() => setConfirmOn(false)}
        onConfirm={() => { setConfirmOn(false); run(() => api.setMobile(true)) }}>
        <p>Le tableau de bord deviendra joignable depuis votre réseau local (pas depuis Internet), uniquement par les
          appareils qui ont scanné le QR code. Windows peut afficher une demande d'autorisation du pare-feu : acceptez-la
          pour les réseaux privés seulement.</p>
        <p className="muted">Vous pourrez désactiver cet accès ou révoquer les téléphones à tout moment.</p>
      </Confirm>
    </Card>
  )
}

export function Settings({ state, refresh }) {
  const [s, setS] = useState(state.settings)
  const [saved, setSaved] = useState(false)
  const save = async () => { await api.settings(s); setSaved(true); refresh(); setTimeout(() => setSaved(false), 2000) }
  return (<div className="stack">
    {state.is_local ? (state.mobile && <MobileAccess mobile={state.mobile} refresh={refresh} />) : (
      <Card title="Accès depuis Android">
        <p className="small">Ce téléphone est associé. L'accès se gère depuis le PC (onglet Réglages).</p>
        <p className="muted small">Les notifications de nouveaux appareils s'affichent sur le PC ; ici, consultez l'onglet Alertes.</p>
      </Card>
    )}
    <Card title="Surveillance et notifications">
      <div className="form">
        <label className="check"><input type="checkbox" checked={s.monitoring} onChange={(e) => setS({ ...s, monitoring: e.target.checked })} /> Surveillance périodique activée</label>
        <label>Intervalle entre deux analyses (minutes)
          <input type="number" min="2" max="1440" value={s.scan_interval_minutes} onChange={(e) => setS({ ...s, scan_interval_minutes: Number(e.target.value) })} />
        </label>
        <label className="check"><input type="checkbox" checked={s.notifications} onChange={(e) => setS({ ...s, notifications: e.target.checked })} /> Notification Windows à chaque nouvel appareil</label>
        <label className="check"><input type="checkbox" checked={s.ping_sweep} onChange={(e) => setS({ ...s, ping_sweep: e.target.checked })} /> Ping léger du sous-réseau (un paquet par adresse) pour un inventaire plus complet</label>
        <div className="row"><button className="btn primary" onClick={save}>Enregistrer</button>{saved && <span className="muted">Enregistré ✓</span>}</div>
      </div>
      <p className="muted small">Pour surveiller même quand ce tableau de bord est fermé, lancez <code>scripts\installer_surveillance.bat</code> :
        il crée une tâche planifiée Windows (à votre ouverture de session) que vous pouvez retirer avec <code>scripts\desinstaller_surveillance.bat</code>.
        L'accès depuis le téléphone fonctionne aussi dans ce mode.</p>
    </Card>
  </div>)
}
