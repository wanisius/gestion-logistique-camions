import { calcFromVars } from '../engine/game';
import { fmtMAD, INCOTERM_SCOPE, type Incoterm } from '../engine/calc';
import type { GameState, Scenario } from '../engine/types';

export function SupplierCompare({ sc, state }: { sc: Scenario; state: GameState }) {
  const estimatedSteps = sc.planningDays ?? 27; // jours hors fabrication/transit estimés pour les formalités
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm min-w-[620px]">
        <thead className="text-left text-slate-400">
          <tr><th className="p-2">Critère</th>{sc.suppliers.map((s) => <th key={s.id} className="p-2">{s.flag} {s.country}</th>)}</tr>
        </thead>
        <tbody>
          {(() => {
            const rows = sc.suppliers.map((s) => {
              const vars = { ...state.vars, supplier: s.id, incoterm: 'FCA', payment: 'credoc', insurance: 'icc-a' };
              const r = calcFromVars(sc, vars, 0);
              const eta = state.day + s.productionDays + s.transitDays + estimatedSteps;
              const late = Math.max(0, eta - sc.deadlineDays);
              return { s, r, eta, late, pen: late * sc.stockoutPenaltyPerDay };
            });
            const line = (label: string, f: (x: (typeof rows)[number]) => React.ReactNode) => (
              <tr className="border-t border-ink-600/60"><td className="p-2 text-slate-300">{label}</td>{rows.map((x) => <td key={x.s.id} className="p-2">{f(x)}</td>)}</tr>
            );
            return (
              <>
                {line('Fournisseur', (x) => x.s.name)}
                {line('Prix unitaire FCA', (x) => `${x.s.unitPrice} ${x.s.currency}`)}
                {line('Qualité / fiabilité', (x) => '★'.repeat(x.s.rating.qualite) + ' / ' + '★'.repeat(x.s.rating.fiabilite))}
                {line('Certifications', (x) => <span className="text-xs">{x.s.rating.certifs.join(', ')}</span>)}
                {line('Origine & DI (jeu)', (x) => <span className="text-xs">{x.s.dutyStatus}</span>)}
                {line('Fabrication + transit', (x) => `${x.s.productionDays} + ${x.s.transitDays} j`)}
                {line('Livraison estimée', (x) => <span className={x.late ? 'text-red-400 font-semibold' : 'text-emerald-400'}>J+{x.eta} {x.late ? `(retard ${x.late} j)` : '✓'}</span>)}
                {line('Coût de revient estimé', (x) => <span className="font-mono">{fmtMAD(x.r.costPrice)}</span>)}
                {line('Pénalité de retard estimée', (x) => <span className="font-mono">{fmtMAD(x.pen)}</span>)}
                {line('Coût total risque inclus', (x) => <b className="font-mono">{fmtMAD(x.r.costPrice + x.pen)}</b>)}
                {line('Remarques', (x) => <span className="text-xs text-slate-400">{x.s.notes}</span>)}
              </>
            );
          })()}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-2">Estimation : FCA, crédit documentaire, assurance ICC (A), ~{estimatedSteps} jours de formalités. Taux DI fictifs ou à vérifier (voir base réglementaire).</p>
    </div>
  );
}

export function IncotermTable() {
  const cols: [keyof (typeof INCOTERM_SCOPE)['EXW'], string][] = [
    ['exportClearance', 'Dédouanement export'], ['freight', 'Fret principal'], ['insurance', 'Assurance'], ['inland', 'Acheminement final'], ['importClearance', 'Dédouanement import'],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[560px]">
        <thead><tr className="text-slate-400"><th className="p-1 text-left">Règle</th>{cols.map(([, l]) => <th key={l} className="p-1">{l}</th>)}<th className="p-1">Modes</th></tr></thead>
        <tbody>
          {(Object.keys(INCOTERM_SCOPE) as Incoterm[]).map((k) => (
            <tr key={k} className="border-t border-ink-600/60">
              <td className="p-1 font-semibold">{k}</td>
              {cols.map(([c]) => <td key={c} className="p-1 text-center">{INCOTERM_SCOPE[k][c] ? <span className="chip bg-sea-500">Vendeur</span> : <span className="chip bg-ink-600">Acheteur</span>}</td>)}
              <td className="p-1 text-center">{INCOTERM_SCOPE[k].maritimeOnly ? 'Maritime' : 'Tous'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-xs text-slate-400 mt-1">Incoterms® 2020 (CCI). En CIF l'assurance minimale est ICC (C) ; en CIP, ICC (A).</p>
    </div>
  );
}

export function PaymentCompare() {
  const rows = [
    ['Virement', 'Faible', 'Aucune (si paiement d’avance)', 'Bonne', 'Fournisseur connu, faibles montants'],
    ['Remise documentaire', 'Moyen', 'Partielle : documents contre paiement', 'Moyenne', 'Relation établie'],
    ['Crédit documentaire', 'Élevé', 'Forte : engagement bancaire contre documents conformes', 'Forte', 'Premier achat, montants élevés'],
  ];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs min-w-[560px]">
        <thead><tr className="text-slate-400 text-left"><th className="p-1">Instrument</th><th className="p-1">Coût</th><th className="p-1">Sécurité acheteur</th><th className="p-1">Sécurité vendeur</th><th className="p-1">Usage typique</th></tr></thead>
        <tbody>{rows.map((r) => <tr key={r[0]} className="border-t border-ink-600/60">{r.map((c, i) => <td key={i} className={`p-1 ${i === 0 ? 'font-semibold' : ''}`}>{c}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}
