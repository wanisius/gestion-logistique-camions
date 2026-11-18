import type { CommitKey, Effects, GameState, LedgerEntry, Mode, Quality, Scenario, Step, Supplier } from './types';
import { computeImport, type CalcInput, type CalcResult, type Incoterm } from './calc';

export const POINTS: Record<Quality, number> = { best: 10, ok: 6, bad: 0 };
export const COMPLIANCE_LOSS: Record<Quality, number> = { best: 0, ok: 2, bad: 8 };

export const MODE_INFO: Record<Mode, { label: string; desc: string; icon: string }> = {
  decouverte: { label: 'Découverte', icon: '🧭', desc: "L'assistant explique chaque opération, les indices sont gratuits et visibles." },
  professionnel: { label: 'Professionnel', icon: '💼', desc: 'Aide limitée : chaque indice coûte 2 points.' },
  expert: { label: 'Expert', icon: '🎯', desc: "Pas d'indice, davantage d'incidents, erreurs plus coûteuses." },
  examen: { label: 'Examen', icon: '🎓', desc: 'Aucune aide ni correction pendant la partie : évaluation détaillée à la fin.' },
};

export function supplierOf(sc: Scenario, vars: GameState['vars']): Supplier {
  return sc.suppliers.find((s) => s.id === vars.supplier) ?? sc.suppliers[0];
}

/** Résout `{{a.b}}` dans un texte à partir du contexte du jeu. */
export function tpl(text: string, sc: Scenario, vars: GameState['vars']): string {
  const sup = supplierOf(sc, vars);
  const calc = calcFromVars(sc, vars, 0);
  const g = sc.goods;
  const litres = g.quantity * (g.litresPerUnit ?? 0);
  const ctx: Record<string, unknown> = {
    ...vars, supplier: sup, company: sc.company, goods: g, calc, sc,
    unitPrice: sup.unitPrice * (1 - Number(vars.discount ?? 0)),
    totals: { pallets: g.palletsPerContainer * g.containers, grossKg: g.grossKgPerContainer * g.containers, litres, hl: litres / 100, perPallet: g.quantity / (g.palletsPerContainer * g.containers) },
  };
  return text.replace(/\{\{\s*([\w.]+)\s*\}\}/g, (_, path: string) => {
    const v = path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), ctx);
    if (typeof v === 'number') return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 3 }).format(v);
    return v === undefined ? '—' : String(v);
  });
}

/** Supplément (ou réduction) de prix par conteneur demandé par le vendeur selon l'Incoterm, en devise. */
export function incotermAdjust(sc: Scenario, sup: Supplier, inc: Incoterm): number {
  const m = sc.incotermPriceAdjust; // marges du vendeur sur les prestations qu'il prend en charge
  const goodsPerCtr = (sc.goods.quantity * sup.unitPrice) / sc.goods.containers;
  const ins = (goodsPerCtr + sup.freightPerContainer) * 1.1 * sc.fees.insuranceRate * 0.6; // couverture minimale ICC (C)
  const inland = sc.fees.inlandPerContainer / (sc.fx[sup.currency] ?? 1);
  switch (inc) {
    case 'EXW': return -(sup.preCarriagePerContainer + (m.exportFormalities ?? 0));
    case 'FCA': return 0;
    case 'FOB': return m.fobLoading ?? 0;
    case 'CFR': case 'CPT': return sup.freightPerContainer * (m.freightMargin ?? 1);
    case 'CIF': case 'CIP': return sup.freightPerContainer * (m.freightMargin ?? 1) + ins;
    case 'DAP': return sup.freightPerContainer * (m.freightMargin ?? 1) + ins + inland * (m.freightMargin ?? 1);
    case 'DDP': return sup.freightPerContainer * (m.freightMargin ?? 1) + ins + inland * (m.freightMargin ?? 1) + (m.ddpRisk ?? 0);
  }
}

export function calcInputFromVars(sc: Scenario, vars: GameState['vars'], extraCosts: number): CalcInput {
  const sup = supplierOf(sc, vars);
  const incoterm = (vars.incoterm as Incoterm) || 'FCA';
  const discount = Number(vars.discount ?? 0);
  const payment = String(vars.payment ?? 'credoc');
  const insured = vars.insurance === undefined ? true : vars.insurance !== 'none';
  return {
    quantity: sc.goods.quantity,
    containers: sc.goods.containers,
    unitPrice: sup.unitPrice * (1 - discount),
    currency: sup.currency,
    fxRate: sc.fx[sup.currency] ?? 1,
    incoterm,
    incotermAdjustPerContainer: incotermAdjust(sc, sup, incoterm),
    freightPerContainer: sup.freightPerContainer,
    preCarriagePerContainer: sup.preCarriagePerContainer,
    insuranceRate: vars.insurance === 'icc-c' ? sc.fees.insuranceRate * 0.6 : sc.fees.insuranceRate,
    insured,
    dutyRate: vars.originProofOk === false ? Number(vars.mfnRate ?? sup.dutyRate) : sup.dutyRate,
    tpiRate: sc.fees.tpiRate,
    vatRate: sc.fees.vatRate,
    excisePerUnit: ((sc.fees.excisePerHl ?? 0) * (sc.goods.litresPerUnit ?? 0)) / 100,
    portPerContainer: sc.fees.portPerContainer,
    brokerFlat: sc.fees.brokerFlat,
    brokerPerContainer: sc.fees.brokerPerContainer,
    bankRate: sc.fees.bankRate[payment] ?? 0.002,
    bankMin: sc.fees.bankMin,
    inlandPerContainer: sc.fees.inlandPerContainer,
    extraCosts,
  };
}

export function calcFromVars(sc: Scenario, vars: GameState['vars'], extra: number): CalcResult {
  return computeImport(calcInputFromVars(sc, vars, extra));
}

export function extraCosts(state: GameState): number {
  return state.ledger.filter((l) => l.category === 'penalites' || l.category === 'autres').reduce((a, b) => a + b.amount, 0);
}

const COMMIT_MAP: Record<CommitKey, { label: string; key: keyof CalcResult; category: LedgerEntry['category'] }> = {
  goods: { label: 'Règlement fournisseur (marchandise)', key: 'goodsInvoice', category: 'marchandise' },
  preCarriage: { label: 'Pré-acheminement et formalités export', key: 'preCarriage', category: 'transport' },
  freight: { label: 'Fret maritime', key: 'freight', category: 'transport' },
  insurance: { label: 'Prime d’assurance transport', key: 'insurance', category: 'assurance' },
  duties: { label: "Droit d'importation (DI)", key: 'di', category: 'droits' },
  tpi: { label: 'Taxe parafiscale à l’importation (TPI)', key: 'tpi', category: 'droits' },
  excise: { label: 'Taxe intérieure de consommation (TIC)', key: 'tic', category: 'droits' },
  vat: { label: 'TVA à l’importation (récupérable)', key: 'tva', category: 'tva' },
  port: { label: 'Frais portuaires et de manutention', key: 'port', category: 'port' },
  broker: { label: 'Honoraires du transitaire', key: 'broker', category: 'transitaire' },
  bank: { label: 'Commissions bancaires', key: 'bank', category: 'banque' },
  inland: { label: 'Transport national port → usine', key: 'inland', category: 'national' },
};

export function isStepVisible(step: Step, state: GameState): boolean {
  if (!state.activeSteps.includes(step.id)) return false;
  if (step.requires) return step.requires.in.includes(state.vars[step.requires.var] as never);
  return true;
}

export function currentStep(sc: Scenario, state: GameState): Step | undefined {
  for (let i = state.stepIndex; i < sc.steps.length; i++) {
    if (isStepVisible(sc.steps[i], state)) return sc.steps[i];
  }
  return undefined;
}

export function visibleSteps(sc: Scenario, state: GameState): Step[] {
  return sc.steps.filter((s) => isStepVisible(s, state));
}

export function newGame(sc: Scenario, mode: Mode, playerName: string, rnd: () => number = Math.random): GameState {
  const active = sc.steps.filter((s) => !s.chance || rnd() < (s.chance[mode] ?? 0)).map((s) => s.id);
  const now = new Date().toISOString();
  return {
    version: 1, scenarioId: sc.id, mode, playerName, stepIndex: 0, activeSteps: active,
    vars: {}, day: 0, compliance: 100, points: 0, maxPoints: 0, ledger: [], log: [], docs: [],
    hintsUsed: 0, finished: false, startedAt: now, updatedAt: now,
  };
}

export interface Resolution {
  quality: Quality;
  points: number;
  max: number;
  message: string;
  effects: Effects[];
}

export function resolveQuality(q: { quality?: Quality; qualityBy?: { var: string; map: Record<string, Quality> } }, vars: GameState['vars']): Quality {
  if (q.qualityBy) return q.qualityBy.map[String(vars[q.qualityBy.var])] ?? q.quality ?? 'ok';
  return q.quality ?? 'ok';
}

function applyEffects(sc: Scenario, st: GameState, e: Effects, mode: Mode): GameState {
  const mult = mode === 'expert' ? 1.5 : 1;
  let s = { ...st, vars: { ...st.vars }, ledger: [...st.ledger], docs: [...st.docs] };
  if (e.set) Object.assign(s.vars, e.set);
  if (e.days) s.day += e.days;
  if (e.daysFrom) {
    const sup = supplierOf(sc, s.vars);
    s.day += e.daysFrom === 'production' ? sup.productionDays : sup.transitDays;
  }
  if (e.portDays) {
    s.day += e.portDays;
    s.vars.portDays = Number(s.vars.portDays ?? 0) + e.portDays;
  }
  if (e.settleDemurrage) {
    const over = Math.max(0, Number(s.vars.portDays ?? 0) - sc.fees.freeDaysPort);
    if (over > 0) s.ledger.push({ label: `Surestaries : ${over} jour(s) au-delà de la franchise × ${sc.goods.containers} conteneurs`, amount: over * sc.goods.containers * sc.fees.demurragePerContainerDay, category: 'penalites', day: s.day });
  }
  if (e.compliance) s.compliance = Math.max(0, Math.min(100, s.compliance + e.compliance * (e.compliance < 0 ? mult : 1)));
  if (e.cost) s.ledger.push({ label: e.cost.label, amount: Math.round(e.cost.amount * (e.cost.category === 'penalites' ? mult : 1)), category: e.cost.category ?? 'autres', day: s.day });
  if (e.docs) for (const d of e.docs) if (!s.docs.includes(d)) s.docs.push(d);
  if (e.commit) {
    const res = calcFromVars(sc, s.vars, 0);
    for (const k of e.commit) {
      const m = COMMIT_MAP[k];
      const amount = Number(res[m.key]);
      s = { ...s, ledger: s.ledger.filter((l) => l.label !== m.label) };
      if (amount > 0) s.ledger.push({ label: m.label, amount: Math.round(amount), category: m.category, day: s.day });
    }
  }
  return s;
}

export function applyResolution(sc: Scenario, state: GameState, step: Step, r: Resolution, explanation: string): GameState {
  let s: GameState = { ...state };
  for (const e of r.effects) s = applyEffects(sc, s, e, state.mode);
  if (step.effects) s = applyEffects(sc, s, step.effects, state.mode);
  if (step.docsGained) s = applyEffects(sc, s, { docs: step.docsGained }, state.mode);
  const graded = step.type !== 'scene' && step.type !== 'info';
  if (graded) {
    s.points += r.points;
    s.maxPoints += r.max;
    s.compliance = Math.max(0, s.compliance - COMPLIANCE_LOSS[r.quality] * (state.mode === 'expert' ? 1.5 : 1));
  }
  s.log = [...s.log, { stepId: step.id, phase: step.phase, title: step.title, quality: r.quality, points: r.points, max: r.max, message: r.message, explanation, day: s.day }];
  // avancer à l'étape visible suivante
  const idx = sc.steps.findIndex((x) => x.id === step.id);
  s.stepIndex = idx + 1;
  if (!currentStep(sc, s)) s = finalize(sc, s);
  s.updatedAt = new Date().toISOString();
  return s;
}

/** Clôture : pénalité de rupture si livraison après l'échéance. */
export function finalize(sc: Scenario, s: GameState): GameState {
  if (s.finished) return s;
  const late = Math.max(0, s.day - sc.deadlineDays);
  const ledger = [...s.ledger];
  if (late > 0) ledger.push({ label: `${sc.stockoutLabel ?? 'Arrêt de ligne'} : ${late} jour(s) de retard × ${sc.stockoutPenaltyPerDay.toLocaleString('fr-FR')} MAD`, amount: late * sc.stockoutPenaltyPerDay, category: 'penalites', day: s.day });
  return { ...s, ledger, finished: true };
}

export function totals(state: GameState) {
  const spent = state.ledger.reduce((a, b) => a + b.amount, 0);
  const vat = state.ledger.filter((l) => l.category === 'tva').reduce((a, b) => a + b.amount, 0);
  return { spent, vat, costPrice: spent - vat };
}

export function grade(state: GameState, sc: Scenario) {
  const pct = state.maxPoints ? (state.points / state.maxPoints) * 100 : 0;
  const t = totals(state);
  const budgetOk = t.spent <= sc.budgetMAD;
  const onTime = state.day <= sc.deadlineDays;
  const global = Math.round(pct * 0.6 + state.compliance * 0.25 + (budgetOk ? 7.5 : 0) + (onTime ? 7.5 : 0));
  const mention = global >= 90 ? 'Excellent — Responsable import confirmé' : global >= 75 ? 'Très bien — Opérationnel' : global >= 60 ? 'Satisfaisant — À consolider' : global >= 45 ? 'Insuffisant — Reprendre les phases faibles' : 'Échec — Recommencer en mode Découverte';
  return { pct: Math.round(pct), global, budgetOk, onTime, mention };
}
