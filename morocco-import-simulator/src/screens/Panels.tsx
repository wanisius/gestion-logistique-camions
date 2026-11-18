import { useMemo, useState } from 'react';
import type { GameState, Scenario, Step } from '../engine/types';
import { docsFor } from '../data/documents';
import DocViewer from '../components/DocViewer';
import { GLOSSARY, QUIZ } from '../data/glossary';
import { K, KNOWLEDGE, STATUS_LABEL, type KStatus } from '../data/knowledge';
import { PHASES, QUALITY_UI } from '../components/StepPlayer';
import { tpl } from '../engine/game';

export function Library({ sc, state }: { sc: Scenario; state: GameState }) {
  const [open, setOpen] = useState<string | null>(null);
  const [filter, setFilter] = useState<'tous' | 'obtenus' | 'exemples'>('tous');
  const DOCUMENTS = docsFor(sc);
  const docs = DOCUMENTS.filter((d) => filter === 'tous' || (filter === 'obtenus' ? state.docs.includes(d.id) : d.usage === 'exemple'));
  const cur = DOCUMENTS.find((d) => d.id === open);
  return (
    <div className="grid lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)] gap-4">
      <div className="space-y-2">
        <div className="flex gap-1">{(['tous', 'obtenus', 'exemples'] as const).map((f) => <button key={f} onClick={() => setFilter(f)} className={`btn text-xs px-2 py-1 ${filter === f ? 'bg-sea-500' : 'bg-ink-700'}`}>{f}</button>)}</div>
        <ul className="space-y-1 max-h-[70vh] overflow-auto pr-1">
          {docs.map((d) => {
            const have = state.docs.includes(d.id);
            return (
              <li key={d.id}>
                <button onClick={() => setOpen(d.id)} className={`w-full text-left rounded-lg px-3 py-2 flex gap-2 items-center ${open === d.id ? 'bg-sea-500/30 border border-sea-400' : 'bg-ink-800 hover:bg-ink-700'}`}>
                  <span className="text-xl">{d.icon}</span>
                  <span className="flex-1 text-sm">{d.title}</span>
                  {d.usage === 'exemple' ? <span className="chip bg-ink-500">modèle</span> : have ? <span className="chip bg-emerald-600">✓</span> : <span className="chip bg-ink-600">🔒</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </div>
      <div>
        {cur ? (
          cur.usage === 'scenario' && !state.docs.includes(cur.id)
            ? <div className="card p-6 text-slate-300"><div className="text-3xl mb-2">🔒 {cur.icon}</div><b>{cur.title}</b><p className="mt-2 text-sm">Pas encore obtenu dans ton dossier. Moment d'apparition : {cur.when}.</p><p className="text-sm mt-1">Rôle : {cur.purpose}</p></div>
            : <DocViewer doc={cur} sc={sc} state={state} />
        ) : <div className="card p-6 text-slate-400">Sélectionne un document pour l'ouvrir : émetteur, destinataire, utilité, moment, statut réglementaire, liens avec les autres pièces, et export PDF pédagogique.</div>}
      </div>
    </div>
  );
}

export function Glossary() {
  const [q, setQ] = useState('');
  const list = GLOSSARY.filter((g) => (g.term + g.def).toLowerCase().includes(q.toLowerCase())).sort((a, b) => a.term.localeCompare(b.term, 'fr'));
  return (
    <div className="space-y-3">
      <input className="input" placeholder="Rechercher un terme…" value={q} onChange={(e) => setQ(e.target.value)} />
      <dl className="grid md:grid-cols-2 gap-2">
        {list.map((g) => <div key={g.term} className="card p-3"><dt className="font-semibold text-sand-400">{g.term}</dt><dd className="text-sm text-slate-300">{g.def}</dd></div>)}
      </dl>
    </div>
  );
}

export function Quiz() {
  const order = useMemo(() => [...QUIZ.keys()].sort(() => Math.random() - 0.5).slice(0, 10), []);
  const [i, setI] = useState(0);
  const [ans, setAns] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  if (i >= order.length) return (
    <div className="card p-6 text-center space-y-3">
      <div className="text-5xl">{score >= 8 ? '🏆' : score >= 5 ? '👍' : '📚'}</div>
      <div className="text-2xl font-bold">{score} / {order.length}</div>
      <button className="btn-primary" onClick={() => { setI(0); setScore(0); setAns(null); }}>Recommencer</button>
    </div>
  );
  const q = QUIZ[order[i]];
  return (
    <div className="card p-5 space-y-3 max-w-2xl">
      <div className="text-sm text-slate-400">Question {i + 1}/{order.length} · score {score}</div>
      <h3 className="text-lg font-semibold">{q.q}</h3>
      <div className="grid gap-2">
        {q.choices.map((c, k) => (
          <button key={k} disabled={ans !== null} onClick={() => { setAns(k); if (k === q.answer) setScore((s) => s + 1); }}
            className={`text-left rounded-lg border p-3 ${ans === null ? 'border-ink-500 hover:border-sea-400' : k === q.answer ? 'border-emerald-500 bg-emerald-600/20' : k === ans ? 'border-red-500 bg-red-600/20' : 'border-ink-600 opacity-60'}`}>{c}</button>
        ))}
      </div>
      {ans !== null && <div className="text-sm bg-ink-900/60 rounded p-3">{q.why} {q.ref && K[q.ref] && <span className="text-slate-400">— 📚 {K[q.ref].title}</span>}</div>}
      {ans !== null && <button className="btn-gold" onClick={() => { setI(i + 1); setAns(null); }}>Suivante ▶</button>}
    </div>
  );
}

export function Knowledge() {
  const [st, setSt] = useState<KStatus | 'all'>('all');
  const [q, setQ] = useState('');
  const list = KNOWLEDGE.filter((k) => (st === 'all' || k.status === st) && (k.title + k.summary + k.theme).toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="space-y-3">
      <div className="card p-3 text-sm text-slate-300">
        Base de connaissances sourcée. Chaque fiche indique son fondement juridique, ses sources, sa date de vérification et un statut. <b>Aucune règle n'est inventée</b> : ce qui n'a pas pu être vérifié est marqué « À vérifier » ou « Hypothèse pédagogique ».
        <div className="flex flex-wrap gap-2 mt-2">
          <button onClick={() => setSt('all')} className={`chip ${st === 'all' ? 'bg-sea-500' : 'bg-ink-600'}`}>Toutes</button>
          {(Object.keys(STATUS_LABEL) as KStatus[]).map((s) => <button key={s} onClick={() => setSt(s)} className={`chip ${st === s ? STATUS_LABEL[s].color : 'bg-ink-600'}`}>{STATUS_LABEL[s].label}</button>)}
        </div>
      </div>
      <input className="input" placeholder="Rechercher…" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="grid md:grid-cols-2 gap-3">
        {list.map((k) => (
          <article key={k.id} className="card p-4 space-y-2">
            <div className="flex flex-wrap gap-2 items-center"><span className="chip bg-ink-600">{k.theme}</span><span className={`chip ${STATUS_LABEL[k.status].color}`}>{STATUS_LABEL[k.status].label}</span><span className="text-xs text-slate-500">vérifié le {new Date(k.checked).toLocaleDateString('fr-FR')}</span></div>
            <h3 className="font-semibold">{k.title}</h3>
            <p className="text-sm">{k.summary}</p>
            <ul className="text-sm text-slate-300 list-disc pl-5 space-y-1">{k.details.map((d) => <li key={d}>{d}</li>)}</ul>
            <p className="text-xs text-slate-400"><b>Fondement :</b> {k.legalBasis}</p>
            {k.sources.length > 0 && <p className="text-xs"><b>Sources :</b> {k.sources.map((s, i) => <span key={i}>{i > 0 && ' · '}{s.url ? <a className="text-sea-300 underline" href={s.url} target="_blank" rel="noreferrer">{s.name}</a> : s.name}</span>)}</p>}
          </article>
        ))}
      </div>
    </div>
  );
}

export function History({ state }: { state: GameState }) {
  const errors = state.log.filter((l) => l.quality !== 'best' && l.max > 0);
  if (state.mode === 'examen' && !state.finished) return <div className="card p-6 text-slate-300">📝 Mode examen : l'historique des erreurs sera disponible à la fin de l'examen.</div>;
  return (
    <div className="space-y-2">
      {errors.length === 0 && <div className="card p-6 text-slate-300">Aucune erreur pour l'instant. 👏</div>}
      {errors.map((l, i) => (
        <div key={i} className="card p-3 space-y-1">
          <div className="flex flex-wrap gap-2 items-center text-sm"><span className={`chip ${QUALITY_UI[l.quality].cls}`}>{QUALITY_UI[l.quality].icon} {QUALITY_UI[l.quality].label}</span><span className="text-slate-400">Phase {l.phase} · J+{l.day} · {l.points}/{l.max}</span></div>
          <div className="font-semibold">{l.title}</div>
          <p className="text-sm">{l.message}</p>
          <p className="text-sm text-slate-400">{l.explanation}</p>
        </div>
      ))}
    </div>
  );
}

export function Inbox({ sc, state, current, onOpen }: { sc: Scenario; state: GameState; current?: Step; onOpen: () => void }) {
  const exam = state.mode === 'examen' && !state.finished;
  const mails = [...state.log].reverse();
  return (
    <div className="space-y-2">
      {current && (
        <button onClick={onOpen} className="w-full text-left card p-3 border-sand-400 anim-pop">
          <div className="flex gap-2 items-center"><span className="chip bg-sand-400 text-ink-900">Nouveau</span><span className="font-semibold">{sc.characters[current.actor]?.avatar} {sc.characters[current.actor]?.name}</span><span className="text-xs text-slate-400 ml-auto">J+{state.day}</span></div>
          <div className="font-medium mt-1">Objet : {current.title}</div>
          <div className="text-sm text-slate-400 line-clamp-2">{tpl(current.intro, sc, { ...state.vars, day: state.day })}</div>
        </button>
      )}
      {mails.map((l, i) => (
        <div key={i} className="card p-3 opacity-80">
          <div className="flex gap-2 text-sm"><span className="font-semibold">{PHASES[l.phase]}</span><span className="text-xs text-slate-400 ml-auto">J+{l.day}</span></div>
          <div>{l.title}</div>
          {!exam && <div className="text-sm text-slate-400">{l.message}</div>}
        </div>
      ))}
    </div>
  );
}
