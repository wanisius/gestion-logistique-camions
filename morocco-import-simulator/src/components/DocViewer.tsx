import { jsPDF } from 'jspdf';
import type { DocDef, DocField } from '../data/documents';
import { pdfSafe } from './pdfSafe';
import { DOC } from '../data/documents';
import type { GameState, Scenario } from '../engine/types';

export function downloadPdf(doc: DocDef, fields: DocField[], sc: Scenario) {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' });
  const W = 210, M = 16;
  let y = 18;
  pdf.setFillColor(17, 26, 46); pdf.rect(0, 0, W, 12, 'F');
  pdf.setTextColor(233, 196, 106); pdf.setFontSize(9);
  pdf.text('MOROCCO IMPORT SIMULATOR - DOCUMENT PÉDAGOGIQUE FICTIF - SANS VALEUR LÉGALE', M, 8);
  pdf.setTextColor(0, 0, 0); pdf.setFontSize(16);
  pdf.text(pdfSafe(doc.title), M, (y += 6));
  pdf.setFontSize(9); pdf.setTextColor(90, 90, 90);
  pdf.text(pdfSafe(`Scénario : ${sc.title}`), M, (y += 6));
  y += 4;
  const meta: [string, string][] = [['Émetteur', doc.issuer], ['Destinataire', doc.recipient], ['Utilité', doc.purpose], ['Moment', doc.when], ['Statut', doc.status]];
  pdf.setFontSize(9);
  for (const [k, v] of meta) {
    const lines = pdf.splitTextToSize(pdfSafe(v), W - M * 2 - 32);
    pdf.setTextColor(90, 90, 90); pdf.text(k, M, (y += 5));
    pdf.setTextColor(0, 0, 0); pdf.text(lines, M + 32, y);
    y += (lines.length - 1) * 4;
  }
  y += 4; pdf.setDrawColor(200); pdf.line(M, y, W - M, y); y += 2;
  pdf.setFontSize(10);
  for (const f of fields) {
    const lines = pdf.splitTextToSize(pdfSafe(f.value), W - M * 2 - 60);
    if (y > 270) { pdf.addPage(); y = 20; }
    pdf.setTextColor(60, 60, 60); pdf.text(pdfSafe(f.label), M, (y += 7));
    pdf.setTextColor(0, 0, 0); pdf.text(lines, M + 60, y);
    y += (lines.length - 1) * 5;
  }
  pdf.setFontSize(8); pdf.setTextColor(120);
  pdf.text('Données fictives. Ne pas utiliser comme modèle officiel. Vérifier la réglementation en vigueur (ADII, Office des Changes, PortNet).', M, 288);
  pdf.save(`${doc.id}.pdf`);
}

export default function DocViewer({ doc, sc, state, check = false, flagged, onToggle, revealed = false }: {
  doc: DocDef; sc: Scenario; state: GameState; check?: boolean; flagged?: Set<number>; onToggle?: (i: number) => void; revealed?: boolean;
}) {
  const fields = doc.fields(sc, state, check);
  return (
    <div className="space-y-3">
      <div className="bg-[#fbf8f1] text-slate-900 rounded-lg shadow-inner p-4 relative overflow-hidden">
        <div className="absolute right-3 top-3 text-[10px] uppercase tracking-widest text-red-700/70 border border-red-700/50 rounded px-1 rotate-6">Fictif — pédagogique</div>
        <div className="flex items-center gap-2 mb-3"><span className="text-2xl">{doc.icon}</span><h3 className="font-bold text-lg">{doc.title}</h3></div>
        <dl className="divide-y divide-slate-300">
          {fields.map((f, i) => {
            const isFlag = flagged?.has(i);
            const showAnom = revealed && f.anomaly;
            const cls = check
              ? `cursor-pointer rounded px-2 -mx-2 ${isFlag ? 'bg-red-200 ring-2 ring-red-500' : 'hover:bg-amber-100'} ${revealed && isFlag && !f.anomaly ? 'bg-slate-200 ring-slate-400' : ''}`
              : '';
            return (
              <div key={i} className={`grid grid-cols-[minmax(0,10rem)_minmax(0,1fr)] gap-2 py-1.5 text-sm ${cls}`} onClick={() => check && !revealed && onToggle?.(i)}
                role={check ? 'button' : undefined} tabIndex={check ? 0 : undefined} onKeyDown={(e) => check && !revealed && e.key === 'Enter' && onToggle?.(i)}>
                <dt className="text-slate-500">{f.label}</dt>
                <dd className="font-medium break-words">{f.value}
                  {showAnom && <div className={`text-xs mt-0.5 ${isFlag ? 'text-emerald-700' : 'text-red-700'}`}>{isFlag ? '✔ Anomalie détectée : ' : '✘ Anomalie manquée : '}{f.anomaly}</div>}
                  {revealed && isFlag && !f.anomaly && <div className="text-xs text-slate-600">Ce champ était correct.</div>}
                </dd>
              </div>
            );
          })}
        </dl>
      </div>
      {!check && (
        <div className="grid sm:grid-cols-2 gap-2 text-sm">
          {[['Émetteur', doc.issuer], ['Destinataire', doc.recipient], ['Utilité', doc.purpose], ['Moment', doc.when], ['Statut réglementaire', doc.status]].map(([k, v]) => (
            <div key={k} className="card p-2"><div className="label">{k}</div><div>{v}</div></div>
          ))}
          <div className="card p-2"><div className="label">Documents liés</div><div>{doc.related.length ? doc.related.map((r) => DOC[r]?.title ?? r).join(' · ') : '—'}</div></div>
        </div>
      )}
      {!check && <button className="btn-ghost text-sm" onClick={() => downloadPdf(doc, fields, sc)}>⬇️ Télécharger le PDF pédagogique</button>}
    </div>
  );
}
