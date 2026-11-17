import { describe, expect, it } from 'vitest';
import { computeImport, type CalcInput } from './calc';
import { applyResolution, calcFromVars, currentStep, grade, newGame, POINTS, resolveQuality, tpl, totals, type Resolution } from './game';
import type { Effects, GameState, Quality, Scenario, Step } from './types';
import { SCENARIOS } from '../data/scenarios';
import { K } from '../data/knowledge';
import { DOC } from '../data/documents';
import { SPACES } from '../data/spaces';

const sc: Scenario = SCENARIOS.canettes;

const base: CalcInput = {
  quantity: 1000, containers: 1, unitPrice: 10, currency: 'EUR', fxRate: 10, incoterm: 'FCA', incotermAdjustPerContainer: 0,
  freightPerContainer: 1000, preCarriagePerContainer: 200, insuranceRate: 0.01, insured: true, dutyRate: 0.1, tpiRate: 0.0025, vatRate: 0.2,
  portPerContainer: 0, brokerFlat: 0, brokerPerContainer: 0, bankRate: 0, bankMin: 0, inlandPerContainer: 0, extraCosts: 0,
};

describe('calcul des droits et taxes', () => {
  it('FCA : VD = marchandise + fret + assurance ; TVA sur VD + DI + TPI', () => {
    const r = computeImport(base);
    // marchandise 100 000 MAD, fret 10 000, assurance (110 000 × 1,1) × 1 % = 1 210
    expect(r.vd).toBeCloseTo(111210, 2);
    expect(r.di).toBeCloseTo(11121, 2);
    expect(r.tpi).toBeCloseTo(278.03, 1);
    expect(r.tva).toBeCloseTo((111210 + 11121 + 278.025) * 0.2, 1);
    expect(r.costPrice).toBeCloseTo(r.totalCash - r.tva, 1);
  });
  it('CIF : le fret et l’assurance sont dans la facture et ne sont pas payés en plus', () => {
    const r = computeImport({ ...base, incoterm: 'CIF', incotermAdjustPerContainer: 1000 + 121 });
    expect(r.freight).toBe(0);
    expect(r.insurance).toBe(0);
    expect(r.vd).toBeCloseTo(111210, 0);
  });
  it('EXW : le pré-acheminement est à la charge de l’acheteur et entre dans la valeur', () => {
    const r = computeImport({ ...base, incoterm: 'EXW' });
    expect(r.preCarriage).toBe(2000);
    expect(r.vd).toBeGreaterThan(computeImport(base).vd);
  });
  it('sans assurance : avertissement et aucune prime', () => {
    const r = computeImport({ ...base, insured: false });
    expect(r.insurance).toBe(0);
    expect(r.warnings.length).toBeGreaterThan(0);
  });
});

describe('intégrité du scénario JSON', () => {
  it('chaque étape référence des sources, lieux, acteurs et documents existants', () => {
    const ids = new Set<string>();
    for (const s of sc.steps) {
      expect(ids.has(s.id), `id dupliqué ${s.id}`).toBe(false);
      ids.add(s.id);
      expect(SPACES[s.location], `${s.id} lieu`).toBeTruthy();
      expect(sc.characters[s.actor], `${s.id} acteur`).toBeTruthy();
      for (const src of s.sources ?? []) expect(K[src], `${s.id} source ${src}`).toBeTruthy();
      if (s.document) expect(DOC[s.document], `${s.id} doc`).toBeTruthy();
      for (const e of [s.effects, ...(s.options ?? []).map((o) => o.effects)]) for (const d of e?.docs ?? []) expect(DOC[d] || d === 'booking' || d === 'bat' || d === 'inspection' || d === 'mandat', `${s.id} doc ${d}`).toBeTruthy();
      if (s.type === 'choice' || s.type === 'multi') {
        expect(s.options?.length).toBeGreaterThan(1);
        for (const o of s.options!) expect(o.feedback.length).toBeGreaterThan(2);
      }
      expect(s.explanation.length, `${s.id} explication`).toBeGreaterThan(20);
    }
  });
  it('les documents à contrôler contiennent des anomalies', () => {
    const st = newGame(sc, 'decouverte', 't', () => 0);
    st.vars = { supplier: 'ES', incoterm: 'FCA' };
    for (const id of ['proforma', 'packing', 'bl']) expect(DOC[id].fields(sc, st, true).some((f) => f.anomaly)).toBe(true);
    for (const id of ['proforma', 'packing', 'bl']) expect(DOC[id].fields(sc, st, false).some((f) => f.anomaly)).toBe(false);
  });
});

/** Joue une partie complète avec une stratégie ("best" ou "bad"). */
function play(strategy: 'best' | 'bad', mode: GameState['mode'] = 'professionnel', circuit = 'visite') {
  let st = newGame(sc, mode, 'Test', () => 0); // tous les incidents actifs
  let guard = 0;
  let step: Step | undefined;
  while ((step = currentStep(sc, st)) && guard++ < 200) {
    const r: Resolution = { quality: 'best', points: 0, max: 0, message: '', effects: [] };
    const pickEffects = (o: NonNullable<Step['options']>[number], q: Quality): Effects[] => [
      ...(o.effects ? [o.effects] : []), ...(o.effectsIf?.[q] ? [o.effectsIf[q]!] : []),
      ...(o.effectsVar?.map[String(st.vars[o.effectsVar.var])] ? [o.effectsVar.map[String(st.vars[o.effectsVar.var])]] : []),
    ];
    if (step.type === 'choice') {
      const ranked = step.options!.map((o) => ({ o, q: resolveQuality(o, st.vars) }));
      const want = strategy === 'best' ? ranked.find((x) => x.q === 'best') ?? ranked[0] : ranked.find((x) => x.q === 'bad') ?? ranked[0];
      Object.assign(r, { quality: want.q, points: POINTS[want.q], max: 10, effects: pickEffects(want.o, want.q) });
    } else if (step.type === 'multi') {
      const chosen = step.options!.filter((o) => (resolveQuality(o, st.vars) === 'best') === (strategy === 'best'));
      Object.assign(r, { quality: strategy, points: strategy === 'best' ? 10 : 0, max: 10, effects: chosen.flatMap((o) => pickEffects(o, resolveQuality(o, st.vars))) });
    } else if (step.type === 'docCheck') {
      Object.assign(r, { quality: strategy, points: strategy === 'best' ? 10 : 0, max: 10, effects: [{ set: { [DOC[step.document!].missedVar!]: strategy === 'bad' } }] });
    } else if (step.type === 'form' || step.type === 'calc') {
      Object.assign(r, { quality: strategy, points: strategy === 'best' ? 10 : 0, max: 10, effects: strategy === 'bad' ? [{ days: 2 }] : [] });
    } else if (step.scene === 'circuit') {
      r.effects = [{ set: { circuit } }];
    }
    st = applyResolution(sc, st, step, r, '');
  }
  return st;
}

describe('partie complète (scénario 4)', () => {
  it('la stratégie optimale livre à temps, dans le budget, avec une excellente note', () => {
    const st = play('best');
    expect(st.finished).toBe(true);
    const t = totals(st);
    expect(st.day).toBeLessThanOrEqual(sc.deadlineDays);
    expect(t.spent).toBeLessThanOrEqual(sc.budgetMAD);
    expect(st.ledger.some((l) => l.label.includes('DI'))).toBe(false); // DI = 0 % en origine UE prouvée
    expect(st.ledger.find((l) => l.category === 'tva')!.amount).toBeGreaterThan(700000);
    expect(grade(st, sc).global).toBeGreaterThanOrEqual(90);
  });
  it('la mauvaise stratégie (Chine, sans preuve, erreurs) dépasse l’échéance et paie des pénalités', () => {
    const st = play('bad');
    expect(st.finished).toBe(true);
    expect(st.vars.supplier).toBe('CN');
    expect(st.day).toBeGreaterThan(sc.deadlineDays);
    expect(st.ledger.some((l) => l.category === 'penalites')).toBe(true);
    expect(grade(st, sc).global).toBeLessThan(45);
  });
  it('les branches conditionnelles se déclenchent (rejet bancaire, B/L non conforme)', () => {
    const st = play('bad');
    const ids = st.log.map((l) => l.stepId);
    expect(ids).toContain('C2-rejet');
    expect(ids).toContain('F4-correction-bl');
    expect(play('best').log.map((l) => l.stepId)).not.toContain('C2-rejet');
  });
  it('les modèles de texte se résolvent sans placeholder', () => {
    const vars = { supplier: 'ES', incoterm: 'FCA', discount: 0.02 };
    for (const s of sc.steps) expect(tpl(s.intro, sc, { ...vars, day: 3, portDays: 1 })).not.toMatch(/\{\{|—$/);
    expect(calcFromVars(sc, vars, 0).invoiceCurrency).toBeCloseTo(4080000 * 0.092 * 0.98, 0);
  });
});
