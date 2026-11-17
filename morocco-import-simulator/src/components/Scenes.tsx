import { useEffect, useState } from 'react';

const C_COLORS = ['#c1440e', '#1f7ab8', '#e9c46a', '#2a9d8f', '#8d5fd3', '#d9a23a'];

export function PortScene({ containers = 20 }: { containers?: number }) {
  const [unloaded, setUnloaded] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setUnloaded((u) => (u < containers ? u + 1 : u)), 220);
    return () => clearInterval(id);
  }, [containers]);
  return (
    <div className="rounded-xl overflow-hidden border border-ink-600">
      <svg viewBox="0 0 600 260" className="w-full h-auto block" role="img" aria-label="Port de Casablanca : déchargement des conteneurs">
        <rect width="600" height="260" fill="#9cc9e8" />
        <rect y="150" width="600" height="110" fill="#1f5f8b" />
        <g className="anim-wave" opacity={0.5}>
          {Array.from({ length: 12 }).map((_, i) => <path key={i} d={`M${i * 80} 175 q20 -8 40 0 t40 0`} stroke="#cfe7f7" fill="none" />)}
        </g>
        {/* quai */}
        <rect x="330" y="140" width="270" height="30" fill="#6b7280" />
        {/* navire */}
        <g className="anim-bob">
          <path d="M20 150 L300 150 L280 185 L40 185 Z" fill="#22304f" />
          <rect x="250" y="110" width="40" height="40" fill="#e5e7eb" />
          {Array.from({ length: Math.max(0, containers - unloaded) }).slice(0, 18).map((_, i) => (
            <rect key={i} x={40 + (i % 9) * 22} y={130 - Math.floor(i / 9) * 14} width="20" height="12" fill={C_COLORS[i % C_COLORS.length]} />
          ))}
        </g>
        {/* portique */}
        <g>
          <rect x="300" y="40" width="8" height="110" fill="#e9c46a" />
          <rect x="400" y="40" width="8" height="110" fill="#e9c46a" />
          <rect x="140" y="36" width="280" height="8" fill="#e9c46a" />
          <g className="anim-crane">
            <rect x="200" y="44" width="16" height="10" fill="#374151" />
            <g className="anim-lift"><line x1="208" y1="54" x2="208" y2="84" stroke="#111" /><rect x="198" y="84" width="22" height="12" fill="#c1440e" /></g>
          </g>
        </g>
        {/* terminal */}
        {Array.from({ length: unloaded }).map((_, i) => (
          <rect key={i} x={430 + (i % 6) * 26} y={128 - Math.floor(i / 6) * 13} width="24" height="12" fill={C_COLORS[i % C_COLORS.length]} stroke="#0b1220" strokeWidth={0.5} />
        ))}
        <text x="440" y="20" fontSize="13" fill="#0b1220" fontWeight={600}>Terminal : {unloaded}/{containers} conteneurs</text>
      </svg>
    </div>
  );
}

export function TrucksScene({ count = 5 }: { count?: number }) {
  return (
    <div className="rounded-xl overflow-hidden border border-ink-600 bg-[#b9d7a8]">
      <svg viewBox="0 0 600 160" className="w-full h-auto block" role="img" aria-label="Camions en route vers l'usine">
        <rect y="90" width="600" height="50" fill="#4b5563" />
        <line x1="0" y1="115" x2="600" y2="115" stroke="#fde68a" strokeDasharray="20 14" strokeWidth={3} />
        <rect x="500" y="30" width="90" height="60" fill="#e5e7eb" /><text x="508" y="66" fontSize="11" fill="#111">USINE</text>
        {Array.from({ length: count }).map((_, i) => (
          <g key={i} className="anim-drive" style={{ animationDelay: `${i * 1.3}s` }}>
            <rect x="0" y="80" width="70" height="24" fill={C_COLORS[i % C_COLORS.length]} />
            <rect x="70" y="86" width="20" height="18" fill="#1f2937" />
            <circle cx="15" cy="108" r="6" fill="#111" /><circle cx="60" cy="108" r="6" fill="#111" /><circle cx="82" cy="108" r="6" fill="#111" />
          </g>
        ))}
      </svg>
    </div>
  );
}

export function WarehouseScene() {
  return (
    <div className="rounded-xl overflow-hidden border border-ink-600 bg-[#d6d3d1]">
      <svg viewBox="0 0 600 180" className="w-full h-auto block" role="img" aria-label="Entrepôt de réception">
        <rect y="140" width="600" height="40" fill="#a8a29e" />
        {Array.from({ length: 24 }).map((_, i) => (
          <g key={i} transform={`translate(${30 + (i % 12) * 42},${100 - Math.floor(i / 12) * 34})`}>
            <rect width="36" height="30" fill={i === 5 ? '#b91c1c' : '#cbd5e1'} stroke="#64748b" />
            <rect y="30" width="36" height="5" fill="#92400e" />
          </g>
        ))}
        <g className="anim-drive" style={{ animationDuration: '9s' }}>
          <rect x="0" y="118" width="40" height="20" fill="#f59e0b" /><rect x="40" y="98" width="4" height="40" fill="#111" />
          <circle cx="10" cy="140" r="5" /><circle cx="32" cy="140" r="5" />
        </g>
        <text x="20" y="20" fontSize="12" fill="#111">Zone de réception — contrôle des SSCC et des scellés</text>
      </svg>
    </div>
  );
}

export function LabScene() {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-700 p-4 flex items-center justify-around text-5xl">
      <span className="anim-bob">🧪</span><span className="anim-bob" style={{ animationDelay: '.4s' }}>🔬</span><span className="anim-bob" style={{ animationDelay: '.8s' }}>📋</span>
    </div>
  );
}

export function FactoryScene({ days }: { days: number }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setP((x) => Math.min(100, x + 4)), 80);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-700 p-4 space-y-2">
      <div className="flex items-center gap-3 text-3xl"><span className="anim-spin">⚙️</span><span>🏭</span>
        <div className="flex gap-1 text-xl">{Array.from({ length: Math.round(p / 10) }).map((_, i) => <span key={i}>🥫</span>)}</div>
      </div>
      <div className="h-2 rounded bg-ink-900"><div className="h-2 rounded bg-sand-400 transition-all" style={{ width: `${p}%` }} /></div>
      <div className="text-xs text-slate-400">Production prévue : {days} jours</div>
    </div>
  );
}

export const CIRCUITS = {
  sans: { label: 'Sans contrôle', color: 'bg-emerald-600', desc: 'Mainlevée possible dès le paiement des droits et taxes.' },
  documentaire: { label: 'Contrôle documentaire', color: 'bg-amber-500', desc: "L'inspecteur examine les pièces justificatives." },
  visite: { label: 'Visite physique', color: 'bg-red-600', desc: 'Contrôle documentaire + examen physique de la marchandise.' },
} as const;
export type CircuitId = keyof typeof CIRCUITS;

export function CircuitScene({ result }: { result?: CircuitId }) {
  return (
    <div className="rounded-xl border border-ink-600 bg-ink-700 p-4">
      <div className="grid grid-cols-3 gap-2">
        {(Object.keys(CIRCUITS) as CircuitId[]).map((k) => (
          <div key={k} className={`rounded-lg p-3 text-center text-sm transition ${result === k ? CIRCUITS[k].color + ' scale-105 ring-4 ring-white/40' : 'bg-ink-800 opacity-60'}`}>
            <div className="font-semibold">{CIRCUITS[k].label}</div>
            <div className="text-xs mt-1 opacity-90">{CIRCUITS[k].desc}</div>
          </div>
        ))}
      </div>
      {!result && <div className="text-center mt-3 text-sm text-slate-400"><span className="inline-block anim-spin">⏳</span> Analyse de risque en cours…</div>}
    </div>
  );
}
