import React, { useMemo, useRef, useState } from 'react'

// Courbe du score (série unique, 0–100) avec réticule et info-bulle au survol.
export function ScoreHistory({ points }) {
  const ref = useRef(null)
  const [hover, setHover] = useState(null)
  const W = 640, H = 180, P = { l: 34, r: 12, t: 12, b: 24 }
  const data = useMemo(() => points.map((p) => ({ t: new Date(p.ts).getTime(), v: p.value })), [points])
  if (data.length < 2) return <p className="empty">La courbe apparaîtra après plusieurs analyses.</p>
  const t0 = data[0].t, t1 = data[data.length - 1].t || t0 + 1
  const x = (t) => P.l + ((t - t0) / Math.max(1, t1 - t0)) * (W - P.l - P.r)
  const y = (v) => P.t + (1 - v / 100) * (H - P.t - P.b)
  const path = data.map((d, i) => `${i ? 'L' : 'M'}${x(d.t).toFixed(1)},${y(d.v).toFixed(1)}`).join('')
  const last = data[data.length - 1]

  const onMove = (e) => {
    const r = ref.current.getBoundingClientRect()
    const px = ((e.clientX - r.left) / r.width) * W
    let best = data[0]
    for (const d of data) if (Math.abs(x(d.t) - px) < Math.abs(x(best.t) - px)) best = d
    setHover(best)
  }
  const fmt = (t) => new Date(t).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="chart-wrap">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="chart" role="img"
        aria-label={`Évolution du score de sécurité, dernière valeur ${last.v} sur 100`}
        onMouseMove={onMove} onMouseLeave={() => setHover(null)}>
        {[0, 50, 100].map((v) => (
          <g key={v}>
            <line x1={P.l} x2={W - P.r} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
            <text x={P.l - 6} y={y(v) + 4} className="tick" textAnchor="end">{v}</text>
          </g>
        ))}
        <text x={P.l} y={H - 6} className="tick">{fmt(t0)}</text>
        <text x={W - P.r} y={H - 6} className="tick" textAnchor="end">{fmt(t1)}</text>
        <path d={path} className="line" />
        <circle cx={x(last.t)} cy={y(last.v)} r="4" className="dot" />
        {hover && (
          <g>
            <line x1={x(hover.t)} x2={x(hover.t)} y1={P.t} y2={H - P.b} className="crosshair" />
            <circle cx={x(hover.t)} cy={y(hover.v)} r="5" className="dot" />
          </g>
        )}
        <rect x={P.l} y={P.t} width={W - P.l - P.r} height={H - P.t - P.b} fill="transparent" />
      </svg>
      {hover && (
        <div className="tooltip" style={{ left: `${(x(hover.t) / W) * 100}%` }}>
          <strong>{hover.v}/100</strong><span>{fmt(hover.t)}</span>
        </div>
      )}
    </div>
  )
}

// Jauge du score : anneau unique, valeur en chiffre héros au centre.
export function ScoreRing({ value, grade }) {
  const r = 52, c = 2 * Math.PI * r
  const pct = Math.max(0, Math.min(100, value ?? 0)) / 100
  const cls = value >= 75 ? 'good' : value >= 60 ? 'warning' : value >= 40 ? 'serious' : 'critical'
  return (
    <svg viewBox="0 0 128 128" className="ring" role="img" aria-label={`Score ${value} sur 100, note ${grade}`}>
      <circle cx="64" cy="64" r={r} className="ring-track" />
      <circle cx="64" cy="64" r={r} className={`ring-value ${cls}`} strokeDasharray={`${c * pct} ${c}`}
        transform="rotate(-90 64 64)" />
      <text x="64" y="66" textAnchor="middle" className="ring-num">{value ?? '–'}</text>
      <text x="64" y="88" textAnchor="middle" className="ring-sub">note {grade ?? '–'}</text>
    </svg>
  )
}

// Connexions par jour (barres, série unique) sur les 14 derniers jours.
export function ConnectionsPerDay({ events, compact = false }) {
  const [hover, setHover] = useState(null)
  const days = useMemo(() => {
    const out = []
    const today = new Date(); today.setHours(0, 0, 0, 0)
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today); d.setDate(d.getDate() - i)
      out.push({ key: d.toDateString(), label: d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit' }), n: 0, macs: new Set() })
    }
    const idx = Object.fromEntries(out.map((d, i) => [d.key, i]))
    for (const e of events) {
      if (e.type !== 'connexion' && e.type !== 'nouvel_appareil') continue
      const k = new Date(e.ts); k.setHours(0, 0, 0, 0)
      const i = idx[k.toDateString()]
      if (i !== undefined) out[i].macs.add(e.mac)
    }
    out.forEach((d) => { d.n = d.macs.size })
    return out
  }, [events])
  const W = compact ? 360 : 640, H = compact ? 200 : 160, P = { l: 28, r: 8, t: 10, b: 22 }
  const max = Math.max(1, ...days.map((d) => d.n))
  const bw = (W - P.l - P.r) / days.length
  const y = (v) => P.t + (1 - v / max) * (H - P.t - P.b)
  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Appareils distincts connectés par jour, 14 derniers jours">
        <line x1={P.l} x2={W - P.r} y1={y(max)} y2={y(max)} className="grid" />
        <text x={P.l - 6} y={y(max) + 4} className="tick" textAnchor="end">{max}</text>
        <text x={P.l - 6} y={y(0) + 4} className="tick" textAnchor="end">0</text>
        {days.map((d, i) => {
          const h = y(0) - y(d.n)
          const bx = P.l + i * bw + 2
          return (
            <g key={d.key} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <rect x={P.l + i * bw} y={P.t} width={bw} height={H - P.t - P.b} fill="transparent" />
              {d.n > 0 && <path className={`bar ${hover === i ? 'active' : ''}`}
                d={`M${bx},${y(0)} V${y(d.n) + Math.min(4, h)} q0,-4 4,-4 H${bx + bw - 8} q4,0 4,4 V${y(0)} Z`} />}
              {(compact ? i % 3 === 1 : i % 2 === 1) && <text x={bx + (bw - 4) / 2} y={H - 6} className="tick" textAnchor="middle">{d.label}</text>}
            </g>
          )
        })}
        <line x1={P.l} x2={W - P.r} y1={y(0)} y2={y(0)} className="axis" />
      </svg>
      {hover !== null && (
        <div className="tooltip" style={{ left: `${((P.l + (hover + 0.5) * bw) / W) * 100}%` }}>
          <strong>{days[hover].n} appareil(s)</strong><span>{days[hover].label}</span>
        </div>
      )}
    </div>
  )
}
