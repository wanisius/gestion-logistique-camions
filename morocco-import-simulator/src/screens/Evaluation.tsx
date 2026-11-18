import { jsPDF } from 'jspdf';
import type { CostCategory, GameState, Scenario } from '../engine/types';
import { grade, MODE_INFO, totals } from '../engine/game';
import { fmtMAD } from '../engine/calc';
import { PHASES, QUALITY_UI } from '../components/StepPlayer';
import { pdfSafe } from '../components/pdfSafe';

const CAT_LABEL: Record<CostCategory, string> = {
  marchandise: 'Marchandise', transport: 'Transport international', assurance: 'Assurance', droits: 'Droits (DI, TPI)', tva: 'TVA (récupérable)', port: 'Frais portuaires',
  transitaire: 'Transitaire', banque: 'Banque', national: 'Transport national', penalites: 'Pénalités / retards', autres: 'Autres',
};

export function phaseScores(state: GameState) {
  const by: Record<string, { p: number; m: number }> = {};
  for (const l of state.log) {
    if (!l.max) continue;
    by[l.phase] ??= { p: 0, m: 0 };
    by[l.phase].p += l.points; by[l.phase].m += l.max;
  }
  return by;
}

export default function Evaluation({ sc, state, onRestart }: { sc: Scenario; state: GameState; onRestart: () => void }) {
  const g = grade(state, sc);
  const t = totals(state);
  const phases = phaseScores(state);
  const cats = Object.entries(state.ledger.reduce<Record<string, number>>((a, l) => ({ ...a, [l.category]: (a[l.category] ?? 0) + l.amount }), {}));
  const weak = Object.entries(phases).filter(([, v]) => v.m && v.p / v.m < 0.7).map(([k]) => k);
  const errors = state.log.filter((l) => l.max && l.quality !== 'best');

  function exportPdf() {
    const pdf = new jsPDF();
    let y = 16;
    const line = (s: string, size = 10, gap = 6) => { if (y > 280) { pdf.addPage(); y = 16; } pdf.setFontSize(size); const ls = pdf.splitTextToSize(pdfSafe(s), 180); pdf.text(ls, 15, y); y += gap + (ls.length - 1) * (size * 0.45); };
    line('MOROCCO IMPORT SIMULATOR - Rapport d\'évaluation', 15, 9);
    line(`${state.playerName} - ${sc.title} - mode ${MODE_INFO[state.mode].label}`);
    line(`Note globale : ${g.global}/100 - ${g.mention}`, 12, 8);
    line(`Décisions : ${g.pct} % - Conformité : ${Math.round(state.compliance)} % - Délai : J+${state.day} / J+${sc.deadlineDays} - Dépenses : ${fmtMAD(t.spent)} / ${fmtMAD(sc.budgetMAD)}`);
    line(`Coût de revient (hors TVA) : ${fmtMAD(t.costPrice)} soit ${(t.costPrice / sc.goods.quantity).toFixed(4)} MAD par unité (${sc.goods.unit})`);
    line('Scores par phase', 12, 7);
    for (const [k, v] of Object.entries(phases)) line(`  ${k} - ${PHASES[k]} : ${v.p}/${v.m}`);
    line('Erreurs et explications', 12, 7);
    for (const e of errors) { line(`- [${e.phase}] ${e.title} (${e.points}/${e.max}) : ${e.message}`, 9, 5); line(`   Pourquoi : ${e.explanation}`, 8, 5); }
    pdf.save('evaluation-import.pdf');
  }

  return (
    <div className="space-y-4">
      <div className="card p-6 text-center space-y-2 relative overflow-hidden">
        <div className="absolute right-6 top-6 border-4 border-sand-400 text-sand-400 rounded-lg px-3 py-1 font-black text-xl anim-stamp">{g.global >= 60 ? 'DOSSIER CLÔTURÉ' : 'À REPRENDRE'}</div>
        <div className="text-6xl">{g.global >= 90 ? '🏆' : g.global >= 75 ? '🥇' : g.global >= 60 ? '🥈' : '📚'}</div>
        <div className="text-4xl font-extrabold">{g.global}/100</div>
        <div className="text-lg text-sand-400">{g.mention}</div>
        <div className="text-sm text-slate-400">{state.playerName} · {sc.title} · mode {MODE_INFO[state.mode].label}</div>
      </div>
      <div className="grid sm:grid-cols-4 gap-3">
        {[
          ['Qualité des décisions', `${g.pct} %`, g.pct >= 70],
          ['Conformité', `${Math.round(state.compliance)} %`, state.compliance >= 80],
          ['Délai', `J+${state.day} / J+${sc.deadlineDays}`, g.onTime],
          ['Budget', `${fmtMAD(t.spent)}`, g.budgetOk],
        ].map(([l, v, ok]) => (
          <div key={String(l)} className={`card p-3 border-l-4 ${ok ? 'border-l-emerald-500' : 'border-l-red-500'}`}><div className="label">{l}</div><div className="text-lg font-bold">{v}</div></div>
        ))}
      </div>
      <div className="grid lg:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Scores par phase</h3>
          {Object.entries(phases).map(([k, v]) => (
            <div key={k} className="mb-2">
              <div className="flex justify-between text-sm"><span>{k} — {PHASES[k]}</span><span>{v.p}/{v.m}</span></div>
              <div className="h-2 rounded bg-ink-900"><div className={`h-2 rounded ${v.p / v.m >= 0.7 ? 'bg-emerald-500' : 'bg-red-500'}`} style={{ width: `${(v.p / v.m) * 100}%` }} /></div>
            </div>
          ))}
        </div>
        <div className="card p-4">
          <h3 className="font-semibold mb-2">Coûts réels de l'opération</h3>
          <table className="w-full text-sm"><tbody>
            {cats.map(([c, v]) => <tr key={c} className="border-b border-ink-600/60"><td className="py-1">{CAT_LABEL[c as CostCategory]}</td><td className="text-right font-mono">{fmtMAD(v)}</td></tr>)}
            <tr><td className="pt-2 font-semibold">Décaissement total</td><td className="pt-2 text-right font-mono font-semibold">{fmtMAD(t.spent)}</td></tr>
            <tr><td className="font-semibold text-sand-400">Coût de revient (hors TVA récupérable)</td><td className="text-right font-mono text-sand-400">{fmtMAD(t.costPrice)}</td></tr>
            <tr><td>Par unité ({sc.goods.unit})</td><td className="text-right font-mono">{(t.costPrice / sc.goods.quantity).toFixed(4)} MAD</td></tr>
          </tbody></table>
        </div>
      </div>
      <div className="card p-4 space-y-2">
        <h3 className="font-semibold">Recommandations</h3>
        {weak.length === 0 ? <p className="text-sm">Toutes les phases sont maîtrisées. Essaie le mode Expert ou l'Examen.</p>
          : <p className="text-sm">Phases à retravailler : {weak.map((w) => `${w} (${PHASES[w]})`).join(', ')}. Rejoue en mode Découverte et consulte la base réglementaire correspondante.</p>}
      </div>
      <div className="card p-4 space-y-2">
        <h3 className="font-semibold">Correction détaillée ({errors.length} décision(s) non optimale(s))</h3>
        {errors.map((e, i) => (
          <div key={i} className="border-t border-ink-600 pt-2 text-sm">
            <span className={`chip ${QUALITY_UI[e.quality].cls} mr-2`}>{QUALITY_UI[e.quality].icon}</span><b>{e.title}</b> <span className="text-slate-400">({e.points}/{e.max})</span>
            <p>{e.message}</p><p className="text-slate-400">{e.explanation}</p>
          </div>
        ))}
      </div>
      <div className="flex flex-wrap gap-2">
        <button className="btn-primary" onClick={exportPdf}>⬇️ Rapport PDF</button>
        <button className="btn-gold" onClick={onRestart}>🔁 Nouvelle mission</button>
      </div>
    </div>
  );
}
