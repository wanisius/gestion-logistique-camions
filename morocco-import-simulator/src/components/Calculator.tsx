import { useMemo, useState } from 'react';
import { computeImport, fmtMAD, fmtNum, INCOTERMS, INCOTERM_SCOPE, type CalcInput, type Incoterm } from '../engine/calc';
import { calcInputFromVars, incotermAdjust, supplierOf } from '../engine/game';
import type { GameState, Scenario } from '../engine/types';

type NumKey = { [K in keyof CalcInput]: CalcInput[K] extends number ? K : never }[keyof CalcInput];

const FIELDS: { k: NumKey; label: string; pct?: boolean; step?: number }[] = [
  { k: 'quantity', label: 'Quantité' },
  { k: 'containers', label: 'Conteneurs' },
  { k: 'unitPrice', label: 'Prix unitaire base FCA (devise)', step: 0.001 },
  { k: 'fxRate', label: 'Taux de change (MAD / devise)', step: 0.01 },
  { k: 'freightPerContainer', label: 'Fret / conteneur (devise)' },
  { k: 'preCarriagePerContainer', label: 'Pré-acheminement / conteneur (devise)' },
  { k: 'insuranceRate', label: "Taux d'assurance", pct: true, step: 0.0005 },
  { k: 'dutyRate', label: "Droit d'importation (DI)", pct: true, step: 0.025 },
  { k: 'tpiRate', label: 'TPI', pct: true, step: 0.0005 },
  { k: 'vatRate', label: 'TVA import', pct: true, step: 0.01 },
  { k: 'portPerContainer', label: 'Frais portuaires / conteneur (MAD)' },
  { k: 'brokerFlat', label: 'Honoraires transitaire forfait (MAD)' },
  { k: 'brokerPerContainer', label: 'Honoraires / conteneur (MAD)' },
  { k: 'bankRate', label: 'Commission bancaire', pct: true, step: 0.0005 },
  { k: 'inlandPerContainer', label: 'Transport national / conteneur (MAD)' },
  { k: 'extraCosts', label: 'Autres coûts / pénalités (MAD)' },
];

const BAR: { key: 'goodsInvoice' | 'preCarriage' | 'freight' | 'insurance' | 'di' | 'tpi' | 'port' | 'broker' | 'bank' | 'inland' | 'extra'; label: string; color: string }[] = [
  { key: 'goodsInvoice', label: 'Marchandise', color: '#3b9ad6' },
  { key: 'preCarriage', label: 'Pré-acheminement', color: '#7cc0ea' },
  { key: 'freight', label: 'Fret', color: '#2a9d8f' },
  { key: 'insurance', label: 'Assurance', color: '#8d5fd3' },
  { key: 'di', label: 'DI', color: '#c1440e' },
  { key: 'tpi', label: 'TPI', color: '#f97316' },
  { key: 'port', label: 'Port', color: '#e9c46a' },
  { key: 'broker', label: 'Transitaire', color: '#d9a23a' },
  { key: 'bank', label: 'Banque', color: '#64748b' },
  { key: 'inland', label: 'Transport national', color: '#16a34a' },
  { key: 'extra', label: 'Autres', color: '#b91c1c' },
];

export default function Calculator({ sc, state }: { sc: Scenario; state: GameState }) {
  const initial = useMemo(() => calcInputFromVars(sc, state.vars, 0), [sc, state.vars]);
  const [inp, setInp] = useState<CalcInput>(initial);
  const r = useMemo(() => computeImport(inp), [inp]);
  const sup = supplierOf(sc, state.vars);
  const set = (k: keyof CalcInput, v: number | string | boolean) => setInp((x) => ({ ...x, [k]: v }));
  const total = BAR.reduce((a, b) => a + r[b.key], 0) || 1;

  return (
    <div className="grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)] gap-4">
      <div className="card p-4 space-y-3">
        <div className="flex flex-wrap gap-2 items-end">
          <div className="flex-1 min-w-[140px]">
            <div className="label">Incoterm</div>
            <select className="input" value={inp.incoterm} onChange={(e) => { const inc = e.target.value as Incoterm; setInp((x) => ({ ...x, incoterm: inc, incotermAdjustPerContainer: incotermAdjust(sc, sup, inc) })); }}>
              {INCOTERMS.map((i) => <option key={i}>{i}</option>)}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm pb-2"><input type="checkbox" checked={inp.insured} onChange={(e) => set('insured', e.target.checked)} /> Assurance souscrite</label>
          <button className="btn-ghost text-sm" onClick={() => setInp(initial)}>↺ Valeurs du dossier</button>
        </div>
        <p className="text-xs text-slate-400">{INCOTERM_SCOPE[inp.incoterm].group} · Devise : {inp.currency} · {sc.fxNote}</p>
        <div className="grid sm:grid-cols-2 gap-2">
          {FIELDS.map((f) => (
            <label key={f.k} className="block">
              <span className="label">{f.label}</span>
              <input
                type="number" className="input" step={f.pct ? (f.step ?? 0.001) * 100 : f.step ?? 1}
                value={f.pct ? +(inp[f.k] * 100).toFixed(4) : inp[f.k]}
                onChange={(e) => set(f.k, (Number(e.target.value) || 0) / (f.pct ? 100 : 1))}
              />
            </label>
          ))}
        </div>
      </div>
      <div className="card p-4 space-y-3">
        <h3 className="font-semibold">Résultat instantané</h3>
        <div className="flex h-5 rounded overflow-hidden" aria-hidden>
          {BAR.map((b) => r[b.key] > 0 && <div key={b.key} title={`${b.label} : ${fmtMAD(r[b.key])}`} style={{ width: `${(r[b.key] / total) * 100}%`, background: b.color }} />)}
        </div>
        <table className="w-full text-sm">
          <tbody>
            {[
              ['Valeur facture (devise)', `${fmtNum(r.invoiceCurrency)} ${inp.currency}`],
              ['Valeur départ (FOB/FCA) en MAD', fmtMAD(r.fob)],
              ['+ Fret retenu', fmtMAD(r.freightInValue)],
              ['+ Assurance retenue', fmtMAD(r.insuranceInValue)],
              ['= Valeur CIF / valeur en douane', fmtMAD(r.vd)],
              [`DI (${fmtNum(inp.dutyRate * 100, 2)} %)`, fmtMAD(r.di)],
              [`TPI (${fmtNum(inp.tpiRate * 100, 2)} %)`, fmtMAD(r.tpi)],
              [`TVA (${fmtNum(inp.vatRate * 100, 0)} %) sur VD+DI+TPI`, fmtMAD(r.tva)],
              ['Frais portuaires', fmtMAD(r.port)],
              ['Transitaire', fmtMAD(r.broker)],
              ['Banque', fmtMAD(r.bank)],
              ['Transport national', fmtMAD(r.inland)],
              ['Autres / pénalités', fmtMAD(r.extra)],
            ].map(([a, b]) => (
              <tr key={a} className="border-b border-ink-600/60"><td className="py-1 text-slate-300">{a}</td><td className="py-1 text-right font-mono">{b}</td></tr>
            ))}
            <tr><td className="pt-2 font-semibold">Décaissement total (TVA incluse)</td><td className="pt-2 text-right font-mono font-semibold">{fmtMAD(r.totalCash)}</td></tr>
            <tr><td className="font-semibold text-sand-400">Coût de revient rendu usine (hors TVA récupérable)</td><td className="text-right font-mono font-semibold text-sand-400">{fmtMAD(r.costPrice)}</td></tr>
            <tr><td>Coût de revient unitaire</td><td className="text-right font-mono">{fmtNum(r.unitCost, 4)} MAD</td></tr>
          </tbody>
        </table>
        {r.warnings.map((w) => <p key={w} className="text-xs text-amber-300">⚠️ {w}</p>)}
        <p className="text-xs text-slate-400">Taux DI, TPI et TVA : voir la base réglementaire (statut de vérification de chaque taux). Les montants de frais sont fictifs.</p>
      </div>
    </div>
  );
}
