import React from 'react'

// Gravité → couleur d'état réservée + icône + libellé (jamais la couleur seule).
const SEV = {
  critique: { cls: 'critical', icon: '⛔', label: 'Critique' },
  'élevé': { cls: 'serious', icon: '▲', label: 'Élevé' },
  moyen: { cls: 'warning', icon: '●', label: 'Moyen' },
  faible: { cls: 'neutral', icon: '○', label: 'Faible' },
  info: { cls: 'neutral', icon: 'i', label: 'Info' },
}

export function Severity({ level }) {
  const s = SEV[level] || SEV.info
  return <span className={`badge ${s.cls}`}><span aria-hidden="true">{s.icon}</span> {s.label}</span>
}

const STATUS = {
  risque: { cls: 'serious', icon: '✗', label: 'Risque' },
  'à_vérifier': { cls: 'warning', icon: '?', label: 'À vérifier' },
  ok: { cls: 'good', icon: '✓', label: 'Conforme' },
}

export function FindingStatus({ status }) {
  const s = STATUS[status]
  return <span className={`badge ${s.cls}`}><span aria-hidden="true">{s.icon}</span> {s.label}</span>
}

const CAT = {
  connu: { cls: 'good', icon: '✓', label: 'Connu' },
  nouveau: { cls: 'warning', icon: '★', label: 'Nouveau' },
  inconnu: { cls: 'serious', icon: '?', label: 'Inconnu' },
}

export function Category({ value }) {
  const c = CAT[value] || CAT.inconnu
  return <span className={`badge ${c.cls}`}><span aria-hidden="true">{c.icon}</span> {c.label}</span>
}

export function Card({ title, children, actions, className = '' }) {
  return (
    <section className={`card ${className}`}>
      {(title || actions) && (
        <header className="card-head">
          {title && <h2>{title}</h2>}
          {actions && <div className="card-actions">{actions}</div>}
        </header>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub }) {
  return (
    <div className="stat">
      <div className="stat-label">{label}</div>
      <div className="stat-value">{value}</div>
      {sub && <div className="stat-sub">{sub}</div>}
    </div>
  )
}

export function Confirm({ open, title, children, confirmLabel, onConfirm, onCancel }) {
  if (!open) return null
  return (
    <div className="modal-backdrop" role="presentation" onClick={onCancel}>
      <div className="modal" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <h3>{title}</h3>
        <div className="modal-body">{children}</div>
        <div className="modal-actions">
          <button className="btn ghost" onClick={onCancel}>Annuler</button>
          <button className="btn primary" onClick={onConfirm}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  )
}

export function Empty({ children }) {
  return <p className="empty">{children}</p>
}
