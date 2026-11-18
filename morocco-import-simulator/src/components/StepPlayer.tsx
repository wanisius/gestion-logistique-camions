import { useCallback, useEffect, useMemo, useState } from 'react';
import type { Effects, GameState, Option, Quality, Scenario, Step } from '../engine/types';
import { calcFromVars, POINTS, resolveQuality, supplierOf, tpl, type Resolution } from '../engine/game';
import { fmtMAD } from '../engine/calc';
import { docOf } from '../data/documents';
import { K, STATUS_LABEL } from '../data/knowledge';
import DocViewer from './DocViewer';
import WorldMap from './WorldMap';
import { CircuitScene, CIRCUITS, FactoryScene, LabScene, OnssaScene, PortScene, TrucksScene, WarehouseScene, type CircuitId } from './Scenes';
import { IncotermTable, PaymentCompare, SupplierCompare } from './Widgets';

export const PHASES: Record<string, string> = {
  A: 'Préparation commerciale', B: 'Réglementation et autorisations', C: 'PortNet et domiciliation bancaire', D: "Préparation de l'expédition",
  E: 'Transport international', F: 'Arrivée au Maroc', G: 'Dédouanement', H: 'Contrôle sanitaire et technique', I: 'Sortie du port et livraison',
};

export const QUALITY_UI: Record<Quality, { label: string; cls: string; icon: string }> = {
  best: { label: 'Excellente décision', cls: 'bg-emerald-600', icon: '✅' },
  ok: { label: 'Décision acceptable', cls: 'bg-amber-500 text-ink-900', icon: '⚠️' },
  bad: { label: 'Mauvaise décision', cls: 'bg-red-600', icon: '❌' },
};

const CIRCUIT_ODDS: Record<GameState['mode'], [number, number]> = { decouverte: [0.45, 0.8], professionnel: [0.4, 0.75], expert: [0.2, 0.6], examen: [0.34, 0.67] };

function optionEffects(o: Option, q: Quality, vars: GameState['vars']): Effects[] {
  const out: Effects[] = [];
  if (o.effects) out.push(o.effects);
  if (o.effectsIf?.[q]) out.push(o.effectsIf[q]!);
  if (o.effectsVar) {
    const e = o.effectsVar.map[String(vars[o.effectsVar.var])];
    if (e) out.push(e);
  }
  return out;
}

export function Sources({ ids }: { ids?: string[] }) {
  if (!ids?.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5 mt-2">
      {ids.map((id) => K[id] && (
        <span key={id} className="chip bg-ink-600 gap-1" title={K[id].legalBasis}>
          <span className={`w-2 h-2 rounded-full ${STATUS_LABEL[K[id].status].color}`} />📚 {K[id].title}
        </span>
      ))}
    </div>
  );
}

export default function StepPlayer({ sc, state, step, onResolve, onOpenCalc }: {
  sc: Scenario; state: GameState; step: Step; onResolve: (r: Resolution, explanation: string) => void; onOpenCalc: () => void;
}) {
  const exam = state.mode === 'examen';
  const actor = sc.characters[step.actor] ?? { name: step.actor, role: '', avatar: '👤' };
  const T = (s: string) => tpl(s, sc, { ...state.vars, day: state.day, portDays: Number(state.vars.portDays ?? 0) });

  const [picked, setPicked] = useState<string | null>(null);
  const [multi, setMulti] = useState<Set<string>>(new Set());
  const [flags, setFlags] = useState<Set<number>>(new Set());
  const [form, setForm] = useState<Record<string, string>>({});
  const [calcIn, setCalcIn] = useState<Record<string, string>>({});
  const [result, setResult] = useState<(Resolution & { details?: { label: string; ok: boolean; note?: string }[] }) | null>(null);
  const [hintShown, setHintShown] = useState(state.mode === 'decouverte');
  const [hintPaid, setHintPaid] = useState(false);
  const [sceneDone, setSceneDone] = useState(false);
  const [circuit, setCircuit] = useState<CircuitId | undefined>();

  useEffect(() => {
    setPicked(null); setMulti(new Set()); setFlags(new Set()); setForm({}); setCalcIn({}); setResult(null);
    setHintShown(state.mode === 'decouverte'); setHintPaid(false); setSceneDone(false); setCircuit(undefined);
    if (step.scene === 'circuit' && step.type === 'scene') {
      const t = setTimeout(() => {
        const r = Math.random(); const [a, b] = CIRCUIT_ODDS[state.mode];
        setCircuit(r < a ? 'sans' : r < b ? 'documentaire' : 'visite'); setSceneDone(true);
      }, 1800);
      return () => clearTimeout(t);
    }
    if (step.type === 'scene' && step.scene !== 'map' && step.scene !== 'circuit' && step.scene !== 'onssa') {
      const t = setTimeout(() => setSceneDone(true), 2500);
      return () => clearTimeout(t);
    }
  }, [step.id, step.scene, step.type, state.mode]);

  const onssaDone = useCallback(() => setSceneDone(true), []);
  const docDef = step.document ? docOf(sc, step.document) : undefined;
  const docFields = useMemo(() => (docDef ? docDef.fields(sc, state, true) : []), [docDef, sc, state]);
  const expected = useMemo(() => calcFromVars(sc, state.vars, 0), [sc, state.vars]);
  const hintPenalty = hintPaid ? 2 : 0;
  const finalize = (r: Resolution & { details?: { label: string; ok: boolean; note?: string }[] }) =>
    setResult({ ...r, points: Math.max(0, r.points - hintPenalty) });

  function validate() {
    switch (step.type) {
      case 'choice': {
        const o = step.options!.find((x) => x.id === picked)!;
        const q = resolveQuality(o, state.vars);
        finalize({ quality: q, points: POINTS[q], max: 10, message: T(o.feedback), effects: optionEffects(o, q, state.vars) });
        break;
      }
      case 'multi': {
        const opts = step.options!.map((o) => ({ o, q: resolveQuality(o, state.vars) }));
        const required = opts.filter((x) => x.q === 'best');
        const good = required.filter((x) => multi.has(x.o.id)).length;
        const wrong = opts.filter((x) => x.q === 'bad' && multi.has(x.o.id)).length;
        const score = Math.max(0, Math.min(1, (good - wrong) / Math.max(1, required.length)));
        const q: Quality = score >= 0.99 ? 'best' : score >= 0.5 ? 'ok' : 'bad';
        const effects = opts.filter((x) => multi.has(x.o.id)).flatMap((x) => optionEffects(x.o, x.q, state.vars));
        finalize({
          quality: q, points: Math.round(score * 10), max: 10, effects,
          message: `${good}/${required.length} éléments attendus cochés, ${wrong} erreur(s).`,
          details: opts.filter((x) => x.q !== 'ok' || multi.has(x.o.id)).map((x) => ({
            label: T(x.o.label), ok: (x.q === 'best') === multi.has(x.o.id) || (x.q === 'ok'), note: T(x.o.feedback),
          })),
        });
        break;
      }
      case 'docCheck': {
        const anom = docFields.map((f, i) => (f.anomaly ? i : -1)).filter((i) => i >= 0);
        const found = anom.filter((i) => flags.has(i)).length;
        const falsePos = [...flags].filter((i) => !docFields[i].anomaly).length;
        const score = Math.max(0, (found - 0.5 * falsePos) / anom.length);
        const q: Quality = found === anom.length && falsePos === 0 ? 'best' : score >= 0.5 ? 'ok' : 'bad';
        const effects: Effects[] = [];
        if (docDef?.missedVar) effects.push({ set: { [docDef.missedVar]: found < anom.length } });
        finalize({ quality: q, points: Math.round(score * 10), max: 10, effects, message: `${found}/${anom.length} anomalie(s) détectée(s), ${falsePos} fausse(s) alerte(s).${found < anom.length ? ' Les anomalies non détectées auront des conséquences plus loin dans le dossier.' : ''}` });
        break;
      }
      case 'form': {
        const fields = step.form!.fields;
        const details = fields.map((f) => {
          const ans = typeof f.answer === 'string' ? T(f.answer) : f.answer.map[String(state.vars[f.answer.var])] ?? '';
          return { label: f.label, ok: form[f.id] === ans, note: `Attendu : ${ans}` };
        });
        const good = details.filter((d) => d.ok).length;
        const score = good / fields.length;
        const q: Quality = score === 1 ? 'best' : score >= 0.7 ? 'ok' : 'bad';
        const effects: Effects[] = q === 'best' ? [] : [{ days: q === 'ok' ? 1 : 2 }];
        finalize({ quality: q, points: Math.round(score * 10), max: 10, effects, details, message: `${good}/${fields.length} champs corrects.${q !== 'best' ? ` Le système renvoie le formulaire pour correction (+${q === 'ok' ? 1 : 2} j).` : ' Formulaire accepté.'}` });
        break;
      }
      case 'calc': {
        const details = step.calc!.map((c) => {
          const exp = expected[c.id] as number;
          const got = Number(String(calcIn[c.id] ?? '').replace(/\s/g, '').replace(',', '.'));
          const ok = exp === 0 ? Math.abs(got) < 1 : Math.abs(got - exp) / exp <= 0.01;
          return { label: c.label, ok, note: `Attendu ≈ ${fmtMAD(exp)}` };
        });
        const good = details.filter((d) => d.ok).length;
        const score = good / details.length;
        const q: Quality = score === 1 ? 'best' : score >= 0.5 ? 'ok' : 'bad';
        finalize({ quality: q, points: Math.round(score * 10), max: 10, effects: [], details, message: `${good}/${details.length} montants corrects (tolérance 1 %).` });
        break;
      }
      default: {
        const effects: Effects[] = [];
        if (step.scene === 'circuit' && circuit) effects.push({ set: { circuit } });
        onResolve({ quality: 'best', points: 0, max: 0, message: circuit ? `Circuit : ${CIRCUITS[circuit].label}` : 'Étape réalisée.', effects }, T(step.explanation));
      }
    }
  }

  const canValidate =
    step.type === 'choice' ? !!picked
      : step.type === 'multi' ? multi.size > 0
      : step.type === 'docCheck' ? true
      : step.type === 'form' ? step.form!.fields.every((f) => form[f.id])
      : step.type === 'calc' ? step.calc!.every((c) => calcIn[c.id])
      : step.type === 'scene' ? sceneDone
      : true;

  const sup = supplierOf(sc, state.vars);
  const locked = !!result;

  return (
    <div className="space-y-4 anim-pop">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="chip bg-sea-500">Phase {step.phase} — {PHASES[step.phase]}</span>
        {step.chance && <span className="chip bg-red-600">⚡ Incident</span>}
      </div>
      <h2 className="text-xl font-bold">{step.title}</h2>

      <div className="flex gap-3 items-start">
        <div className="text-4xl shrink-0 anim-bob" aria-hidden>{actor.avatar}</div>
        <div className="card p-3 flex-1">
          <div className="text-xs text-slate-400">{actor.name} — {actor.role}</div>
          <p className="mt-1 leading-relaxed">{T(step.intro)}</p>
        </div>
      </div>

      {step.widget === 'suppliers' && <div className="card p-3"><SupplierCompare sc={sc} state={state} /></div>}
      {step.widget === 'incoterms' && <div className="card p-3"><IncotermTable /></div>}
      {step.widget === 'payment' && <div className="card p-3"><PaymentCompare /></div>}

      {step.scene === 'map' && <WorldMap supplier={sup} startDay={state.day} onDone={() => setSceneDone(true)} />}
      {step.scene === 'port' && <PortScene containers={sc.goods.containers} />}
      {step.scene === 'trucks' && <TrucksScene />}
      {step.scene === 'warehouse' && <WarehouseScene />}
      {step.scene === 'lab' && <LabScene />}
      {step.scene === 'factory' && <FactoryScene days={sup.productionDays} />}
      {step.scene === 'circuit' && <CircuitScene result={circuit} />}
      {step.scene === 'onssa' && <OnssaScene onDone={onssaDone} />}

      {step.hint && state.mode !== 'expert' && !exam && !locked && (
        hintShown ? <div className="rounded-lg bg-sand-400/15 border border-sand-400/40 p-3 text-sm">💡 {T(step.hint)}</div>
          : <button className="btn-ghost text-sm" onClick={() => { setHintShown(true); setHintPaid(true); }}>💡 Indice (−2 points)</button>
      )}

      {/* Corps selon le type d'étape */}
      {step.type === 'choice' && (
        <div className="grid gap-2">
          {step.options!.map((o) => {
            const q = locked ? resolveQuality(o, state.vars) : undefined;
            return (
              <button key={o.id} disabled={locked} onClick={() => setPicked(o.id)}
                className={`text-left rounded-xl border p-3 transition ${picked === o.id ? 'border-sand-400 bg-sand-400/10' : 'border-ink-500 bg-ink-800 hover:border-sea-400'} ${locked && !exam && q === 'best' ? 'ring-2 ring-emerald-500' : ''}`}>
                <div className="font-medium">{T(o.label)}</div>
                {o.detail && <div className="text-sm text-slate-400 mt-0.5">{T(o.detail)}</div>}
              </button>
            );
          })}
        </div>
      )}

      {step.type === 'multi' && (
        <div className="grid gap-2">
          {step.options!.map((o) => (
            <label key={o.id} className={`flex gap-3 items-start rounded-xl border p-3 cursor-pointer ${multi.has(o.id) ? 'border-sand-400 bg-sand-400/10' : 'border-ink-500 bg-ink-800'}`}>
              <input type="checkbox" className="mt-1" disabled={locked} checked={multi.has(o.id)} onChange={() => setMulti((s) => { const n = new Set(s); n.has(o.id) ? n.delete(o.id) : n.add(o.id); return n; })} />
              <span>{T(o.label)}</span>
            </label>
          ))}
        </div>
      )}

      {step.type === 'docCheck' && docDef && (
        <DocViewer doc={docDef} sc={sc} state={state} check flagged={flags} revealed={locked && !exam}
          onToggle={(i) => setFlags((s) => { const n = new Set(s); n.has(i) ? n.delete(i) : n.add(i); return n; })} />
      )}

      {step.type === 'form' && (
        <div className={`rounded-xl border-2 overflow-hidden ${step.form!.system === 'badr' ? 'border-emerald-700' : 'border-sea-500'}`}>
          <div className={`px-3 py-2 text-sm font-semibold flex justify-between ${step.form!.system === 'badr' ? 'bg-emerald-800' : 'bg-sea-500'}`}>
            <span>{step.form!.system === 'badr' ? '🛃 Simulateur BADR — Déclaration (DUM)' : '🌐 Simulateur PortNet — Titre d’importation'}</span>
            <span className="opacity-80">Interface pédagogique non officielle</span>
          </div>
          <div className="p-3 grid sm:grid-cols-2 gap-3 bg-ink-800">
            {step.form!.fields.map((f) => (
              <label key={f.id} className="block">
                <span className="label">{f.label}</span>
                <select className="input" disabled={locked} value={form[f.id] ?? ''} onChange={(e) => setForm((x) => ({ ...x, [f.id]: e.target.value }))}>
                  <option value="">— choisir —</option>
                  {f.options.map((o) => { const v = T(o); return <option key={o} value={v}>{v}</option>; })}
                </select>
                {f.help && <span className="text-xs text-slate-500">{f.help}</span>}
              </label>
            ))}
          </div>
        </div>
      )}

      {step.type === 'calc' && (
        <div className="card p-3 space-y-3">
          <div className="text-sm text-slate-300">Données du dossier : {sup.flag} {sup.name} · Incoterm {String(state.vars.incoterm ?? 'FCA')} · origine {sup.country}{state.vars.originProofOk === false ? ' (preuve d’origine non valable → droit commun)' : ''}</div>
          <div className="grid sm:grid-cols-2 gap-3">
            {step.calc!.map((c) => (
              <label key={c.id} className="block"><span className="label">{c.label}</span>
                <input className="input font-mono" inputMode="decimal" disabled={locked} value={calcIn[c.id] ?? ''} onChange={(e) => setCalcIn((x) => ({ ...x, [c.id]: e.target.value }))} placeholder="0" />
              </label>
            ))}
          </div>
          <button className="btn-ghost text-sm" onClick={onOpenCalc}>🧮 Ouvrir le calculateur</button>
        </div>
      )}

      {/* Résultat */}
      {result && (
        <div className="card p-4 space-y-2 anim-pop">
          {exam ? (
            <div className="text-slate-300">📝 Réponse enregistrée. Correction détaillée à la fin de l'examen.</div>
          ) : (
            <>
              <div className="flex items-center gap-2"><span className={`chip ${QUALITY_UI[result.quality].cls}`}>{QUALITY_UI[result.quality].icon} {QUALITY_UI[result.quality].label}</span><span className="text-sm text-slate-400">+{result.points}/{result.max} pts{hintPaid ? ' (indice −2)' : ''}</span></div>
              <p>{result.message}</p>
              {result.details && (
                <ul className="text-sm space-y-1">
                  {result.details.map((d, i) => <li key={i} className={d.ok ? 'text-emerald-300' : 'text-red-300'}>{d.ok ? '✔' : '✘'} {d.label}{d.note && <span className="text-slate-400"> — {d.note}</span>}</li>)}
                </ul>
              )}
              <div className="rounded-lg bg-ink-900/60 p-3 text-sm leading-relaxed"><b>Pourquoi ?</b> {T(step.explanation)}</div>
              <Sources ids={step.sources} />
            </>
          )}
        </div>
      )}

      {(step.type === 'scene' || step.type === 'info') && (
        <div className="space-y-2">
          {!exam && <div className="rounded-lg bg-ink-900/60 p-3 text-sm leading-relaxed">{T(step.explanation)}</div>}
          {!exam && <Sources ids={step.sources} />}
        </div>
      )}

      <div className="flex justify-end gap-2 sticky bottom-0 py-2 bg-gradient-to-t from-ink-900 to-transparent">
        {!result && <button className="btn-primary" disabled={!canValidate} onClick={validate}>{step.type === 'scene' || step.type === 'info' ? 'Continuer ▶' : 'Valider ✔'}</button>}
        {result && <button className="btn-gold" onClick={() => onResolve(result, T(step.explanation))}>Étape suivante ▶</button>}
      </div>
    </div>
  );
}
