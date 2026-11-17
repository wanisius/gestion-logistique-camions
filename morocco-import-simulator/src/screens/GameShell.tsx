import { useState } from 'react';
import type { GameState, Scenario, SpaceId } from '../engine/types';
import { currentStep, MODE_INFO, totals, visibleSteps } from '../engine/game';
import { fmtMAD } from '../engine/calc';
import StepPlayer, { PHASES, Sources } from '../components/StepPlayer';
import Calculator from '../components/Calculator';
import WorldMap from '../components/WorldMap';
import { SPACES, SPACE_ORDER } from '../data/spaces';
import { Glossary, History, Inbox, Knowledge, Library, Quiz } from './Panels';
import Evaluation from './Evaluation';
import { supplierOf } from '../engine/game';
import type { Resolution } from '../engine/game';

type Tab = 'bureau' | 'mission' | 'messagerie' | 'documents' | 'calculateur' | 'carte' | 'glossaire' | 'quiz' | 'erreurs' | 'base';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'bureau', label: 'Bureau', icon: '🏢' },
  { id: 'mission', label: 'Mission', icon: '🎯' },
  { id: 'messagerie', label: 'Messagerie', icon: '✉️' },
  { id: 'documents', label: 'Documents', icon: '🗂️' },
  { id: 'calculateur', label: 'Calculateur', icon: '🧮' },
  { id: 'carte', label: 'Carte', icon: '🗺️' },
  { id: 'glossaire', label: 'Glossaire', icon: '📖' },
  { id: 'quiz', label: 'Quiz', icon: '❓' },
  { id: 'erreurs', label: 'Erreurs', icon: '⚠️' },
  { id: 'base', label: 'Réglementation', icon: '⚖️' },
];

function Hud({ sc, state, onSave, onQuit, saved }: { sc: Scenario; state: GameState; onSave: () => void; onQuit: () => void; saved: boolean }) {
  const t = totals(state);
  const budgetPct = Math.min(100, (t.spent / sc.budgetMAD) * 100);
  const dayPct = Math.min(100, (state.day / sc.deadlineDays) * 100);
  const late = state.day > sc.deadlineDays;
  return (
    <header className="bg-ink-800/95 backdrop-blur border-b border-ink-600 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-3 py-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div className="font-extrabold tracking-tight">🚢 MIS<span className="text-sand-400">·</span>MA</div>
        <div className="min-w-[150px] flex-1">
          <div className="flex justify-between text-[11px] text-slate-400"><span>💰 Dépenses</span><span>{fmtMAD(t.spent)} / {fmtMAD(sc.budgetMAD)}</span></div>
          <div className="h-1.5 rounded bg-ink-900"><div className={`h-1.5 rounded ${budgetPct > 95 ? 'bg-red-500' : 'bg-sea-400'}`} style={{ width: `${budgetPct}%` }} /></div>
        </div>
        <div className="min-w-[130px] flex-1">
          <div className="flex justify-between text-[11px] text-slate-400"><span>📅 Calendrier</span><span className={late ? 'text-red-400 font-bold' : ''}>J+{state.day} / J+{sc.deadlineDays}{late ? ` (retard ${state.day - sc.deadlineDays} j)` : ''}</span></div>
          <div className="h-1.5 rounded bg-ink-900"><div className={`h-1.5 rounded ${late ? 'bg-red-500' : dayPct > 80 ? 'bg-amber-400' : 'bg-emerald-500'}`} style={{ width: `${dayPct}%` }} /></div>
        </div>
        <div className="text-sm" title="Score de conformité">🛡️ <b>{Math.round(state.compliance)} %</b></div>
        <div className="text-sm" title="Points">⭐ <b>{state.mode === 'examen' && !state.finished ? '—' : `${state.points}/${state.maxPoints}`}</b></div>
        <div className="text-xs chip bg-ink-600">{MODE_INFO[state.mode].icon} {MODE_INFO[state.mode].label}</div>
        <button className="btn-ghost text-xs px-2 py-1" onClick={onSave}>{saved ? '✓ Sauvé' : '💾 Sauver'}</button>
        <button className="btn-ghost text-xs px-2 py-1" onClick={onQuit}>⏏ Menu</button>
      </div>
    </header>
  );
}

function Office({ sc, state, onGo }: { sc: Scenario; state: GameState; onGo: () => void }) {
  const step = currentStep(sc, state);
  const [info, setInfo] = useState<SpaceId | null>(null);
  const steps = visibleSteps(sc, state);
  const doneIds = new Set(state.log.map((l) => l.stepId));
  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-4">
      <div className="space-y-4">
        <div className="card p-4 space-y-2">
          <div className="label">Mission</div>
          <p className="text-sm">{sc.summary}</p>
          <p className="text-xs text-slate-400">Entreprise : {sc.company.name} — {sc.company.activity}, {sc.company.city}</p>
        </div>
        {step ? (
          <div className="card p-4 space-y-2 border-sand-400/60">
            <div className="label">Tâche en cours</div>
            <div className="font-semibold text-lg">{step.title}</div>
            <div className="text-sm text-slate-300">Lieu : {SPACES[step.location].icon} {SPACES[step.location].name}</div>
            <div className="text-sm text-slate-300">Interlocuteur : {sc.characters[step.actor]?.avatar} {sc.characters[step.actor]?.name}</div>
            <button className="btn-gold w-full anim-pulse" onClick={onGo}>Aller au {SPACES[step.location].name.toLowerCase()} ▶</button>
          </div>
        ) : (
          <div className="card p-4"><button className="btn-gold w-full" onClick={onGo}>📊 Voir l'évaluation finale</button></div>
        )}
        <div className="card p-4">
          <div className="label mb-2">Tableau de missions</div>
          <ol className="space-y-2">
            {Object.keys(PHASES).map((ph) => {
              const ps = steps.filter((s) => s.phase === ph);
              const done = ps.filter((s) => doneIds.has(s.id)).length;
              const active = step?.phase === ph;
              return (
                <li key={ph} className={`text-sm ${active ? 'text-sand-400 font-semibold' : done === ps.length && ps.length ? 'text-emerald-400' : 'text-slate-400'}`}>
                  <div className="flex justify-between"><span>{done === ps.length && ps.length ? '✅' : active ? '▶' : '○'} {ph}. {PHASES[ph]}</span><span>{done}/{ps.length}</span></div>
                  <div className="h-1 rounded bg-ink-900 mt-0.5"><div className="h-1 rounded bg-current" style={{ width: `${ps.length ? (done / ps.length) * 100 : 0}%` }} /></div>
                </li>
              );
            })}
          </ol>
        </div>
      </div>
      <div className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {SPACE_ORDER.map((id) => {
            const sp = SPACES[id];
            const here = step?.location === id;
            return (
              <button key={id} onClick={() => (here ? onGo() : setInfo(id))}
                className={`relative rounded-xl p-3 min-h-[110px] text-left bg-gradient-to-br ${sp.bg} border ${here ? 'border-sand-400 anim-pulse' : 'border-white/10 hover:border-white/40'} transition`}>
                <div className="text-3xl anim-bob" style={{ animationDelay: `${(SPACE_ORDER.indexOf(id) % 5) * 0.3}s` }}>{sp.icon}</div>
                <div className="font-semibold text-sm mt-1 leading-tight">{sp.name}</div>
                {here && <span className="absolute top-2 right-2 chip bg-sand-400 text-ink-900">Mission ici</span>}
              </button>
            );
          })}
        </div>
        {info && (
          <div className="card p-4 anim-pop space-y-2">
            <div className="flex justify-between items-start"><h3 className="font-semibold">{SPACES[info].icon} {SPACES[info].name}</h3><button className="text-slate-400" onClick={() => setInfo(null)}>✕</button></div>
            <p className="text-sm">{SPACES[info].desc}</p>
            <p className="text-sm text-slate-400">Intervenants : {SPACES[info].actors}</p>
            <p className="text-sm text-slate-400">Étapes réalisées ici : {state.log.filter((l) => sc.steps.find((s) => s.id === l.stepId)?.location === info).map((l) => l.title).join(' · ') || 'aucune pour l’instant'}</p>
            <Sources ids={SPACES[info].knowledge} />
          </div>
        )}
      </div>
    </div>
  );
}

export default function GameShell({ sc, state, onResolve, onSave, onQuit, onRestart, saved }: {
  sc: Scenario; state: GameState; onResolve: (r: Resolution, explanation: string) => void; onSave: () => void; onQuit: () => void; onRestart: () => void; saved: boolean;
}) {
  const [tab, setTab] = useState<Tab>('bureau');
  const [calcOpen, setCalcOpen] = useState(false);
  const step = currentStep(sc, state);

  return (
    <div className="min-h-full flex flex-col">
      <Hud sc={sc} state={state} onSave={onSave} onQuit={onQuit} saved={saved} />
      <nav className="bg-ink-800 border-b border-ink-600 overflow-x-auto">
        <div className="max-w-7xl mx-auto px-2 flex gap-1">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)} className={`px-3 py-2 text-sm whitespace-nowrap border-b-2 ${tab === t.id ? 'border-sand-400 text-white' : 'border-transparent text-slate-400 hover:text-white'}`}>
              {t.icon} {t.label}{t.id === 'messagerie' && step ? <span className="ml-1 chip bg-red-600">1</span> : null}
            </button>
          ))}
        </div>
      </nav>
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 py-4">
        {tab === 'bureau' && <Office sc={sc} state={state} onGo={() => setTab('mission')} />}
        {tab === 'mission' && (
          state.finished || !step
            ? <Evaluation sc={sc} state={state} onRestart={onRestart} />
            : <div className="max-w-3xl mx-auto"><StepPlayer key={step.id} sc={sc} state={state} step={step} onResolve={onResolve} onOpenCalc={() => setCalcOpen(true)} /></div>
        )}
        {tab === 'messagerie' && <div className="max-w-3xl"><Inbox sc={sc} state={state} current={step} onOpen={() => setTab('mission')} /></div>}
        {tab === 'documents' && <Library sc={sc} state={state} />}
        {tab === 'calculateur' && <Calculator sc={sc} state={state} />}
        {tab === 'carte' && (
          <div className="space-y-3">
            <WorldMap supplier={state.vars.supplier ? supplierOf(sc, state.vars) : undefined} animate={false} startDay={state.day} />
            <div className="grid sm:grid-cols-3 gap-3">
              {sc.suppliers.map((s) => (
                <div key={s.id} className={`card p-3 text-sm ${state.vars.supplier === s.id ? 'border-sand-400' : ''}`}>
                  <div className="font-semibold">{s.flag} {s.port} → Casablanca</div>
                  <div>Transit : {s.transitDays} j · fret {s.freightPerContainer} {s.currency}/ctr</div>
                  <div className="text-slate-400">Franchise terminal : {sc.fees.freeDaysPort} j · surestaries {sc.fees.demurragePerContainerDay} MAD/ctr/j (fictif)</div>
                </div>
              ))}
            </div>
          </div>
        )}
        {tab === 'glossaire' && <Glossary />}
        {tab === 'quiz' && <Quiz />}
        {tab === 'erreurs' && <History state={state} />}
        {tab === 'base' && <Knowledge />}
      </main>
      {calcOpen && (
        <div className="fixed inset-0 z-40 bg-black/70 p-3 overflow-auto" onClick={() => setCalcOpen(false)}>
          <div className="max-w-6xl mx-auto mt-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-2"><h2 className="font-bold text-lg">🧮 Calculateur financier et douanier</h2><button className="btn-ghost" onClick={() => setCalcOpen(false)}>Fermer ✕</button></div>
            <Calculator sc={sc} state={state} />
          </div>
        </div>
      )}
    </div>
  );
}
