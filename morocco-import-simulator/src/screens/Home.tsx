import { useRef, useState } from 'react';
import type { Mode } from '../engine/types';
import { MODE_INFO } from '../engine/game';
import { CATALOG } from '../data/scenarios';
import { saves, type SaveSlot } from '../engine/store';
import { SCENARIOS } from '../data/scenarios';

export default function Home({ onStart, onLoad }: { onStart: (scenarioId: string, mode: Mode, name: string) => void; onLoad: (s: SaveSlot) => void }) {
  const [name, setName] = useState('');
  const [mode, setMode] = useState<Mode>('decouverte');
  const [scenario, setScenario] = useState('canettes');
  const [slots, setSlots] = useState(saves.list());
  const [err, setErr] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_top,_#1b3358,_#0b1220_60%)]">
      <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
        <header className="text-center space-y-3">
          <div className="text-5xl"><span className="anim-bob inline-block">🚢</span> 🇲🇦 <span className="anim-bob inline-block" style={{ animationDelay: '.5s' }}>📦</span></div>
          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">MOROCCO IMPORT <span className="text-sand-400">SIMULATOR</span></h1>
          <p className="text-slate-300 text-lg">Académie du commerce international et du dédouanement marocain</p>
          <p className="text-xs text-slate-400 max-w-2xl mx-auto">Simulateur pédagogique. Toutes les entreprises, transactions et interfaces sont fictives ; aucune connexion aux systèmes réels (banques, PortNet, BADR). Chaque règle affiche sa source et son statut de vérification.</p>
        </header>

        <section className="grid lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)] gap-6">
          <div className="card p-5 space-y-4">
            <h2 className="text-xl font-bold">Nouvelle mission</h2>
            <label className="block"><span className="label">Ton nom (responsable import)</span>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Salma B." maxLength={40} />
            </label>
            <div>
              <div className="label mb-1">Scénario</div>
              <div className="grid gap-2">
                {CATALOG.map((c) => (
                  <button key={c.id} disabled={!c.available} onClick={() => setScenario(c.id)}
                    className={`text-left rounded-xl border p-3 flex gap-3 ${scenario === c.id ? 'border-sand-400 bg-sand-400/10' : 'border-ink-500 bg-ink-900/40'} ${!c.available ? 'opacity-50 cursor-not-allowed' : 'hover:border-sea-400'}`}>
                    <span className="text-3xl">{c.icon}</span>
                    <span className="flex-1">
                      <span className="font-semibold">{c.title}</span> <span className="chip bg-ink-600 ml-1">{c.level}</span>
                      {!c.available && <span className="chip bg-ink-500 ml-1">En préparation</span>}
                      <span className="block text-sm text-slate-400">{c.summary}</span>
                    </span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <div className="label mb-1">Mode pédagogique</div>
              <div className="grid sm:grid-cols-2 gap-2">
                {(Object.keys(MODE_INFO) as Mode[]).map((m) => (
                  <button key={m} onClick={() => setMode(m)} className={`text-left rounded-xl border p-3 ${mode === m ? 'border-sand-400 bg-sand-400/10' : 'border-ink-500 bg-ink-900/40 hover:border-sea-400'}`}>
                    <div className="font-semibold">{MODE_INFO[m].icon} {MODE_INFO[m].label}</div>
                    <div className="text-xs text-slate-400">{MODE_INFO[m].desc}</div>
                  </button>
                ))}
              </div>
            </div>
            <button className="btn-gold w-full text-lg" disabled={!SCENARIOS[scenario]} onClick={() => onStart(scenario, mode, name.trim() || 'Responsable import')}>▶ Commencer la mission</button>
          </div>

          <div className="card p-5 space-y-3">
            <h2 className="text-xl font-bold">Reprendre une partie</h2>
            {slots.length === 0 && <p className="text-sm text-slate-400">Aucune sauvegarde sur cet appareil.</p>}
            <ul className="space-y-2">
              {slots.map((s) => (
                <li key={s.id} className="rounded-lg border border-ink-500 p-3 flex items-center gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-slate-400">{MODE_INFO[s.state.mode].label} · J+{s.state.day} · {s.state.finished ? 'Terminée' : 'En cours'} · {new Date(s.state.updatedAt).toLocaleString('fr-FR')}</div>
                  </div>
                  <button className="btn-primary text-sm px-3" onClick={() => onLoad(s)}>Reprendre</button>
                  <button className="btn-ghost text-sm px-2" title="Exporter" onClick={() => saves.download(s)}>⬇️</button>
                  <button className="btn-ghost text-sm px-2" title="Supprimer" onClick={() => { saves.remove(s.id); setSlots(saves.list()); }}>🗑️</button>
                </li>
              ))}
            </ul>
            <input ref={fileRef} type="file" accept="application/json" className="hidden" onChange={async (e) => {
              const f = e.target.files?.[0]; if (!f) return;
              try { const s = await saves.importFile(f); setSlots(saves.list()); onLoad(s); } catch (x) { setErr((x as Error).message); }
            }} />
            <button className="btn-ghost w-full text-sm" onClick={() => fileRef.current?.click()}>📂 Importer une sauvegarde (.json)</button>
            {err && <p className="text-sm text-red-400">{err}</p>}
            <div className="pt-3 border-t border-ink-600 text-sm text-slate-300 space-y-1">
              <p className="font-semibold">Ce que tu vas apprendre</p>
              <p>Négociation et Incoterms · engagement d'importation et domiciliation · crédit documentaire · classement SH et origine · BADR/DUM et calcul des droits · BAD et sortie du port · réception, réserves et clôture.</p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
