// Génère docs/BASE-REGLEMENTAIRE.md à partir de src/data/knowledge.ts (source unique).
import { writeFileSync } from 'node:fs';
import { KNOWLEDGE, STATUS_LABEL } from '../src/data/knowledge';

let md = `# Base de connaissances réglementaires — Morocco Import Simulator\n\n`;
md += `> Fichier généré automatiquement (\`npm run export:kb\`) depuis \`src/data/knowledge.ts\`. Ne pas éditer à la main.\n\n`;
md += `Statuts : ${Object.values(STATUS_LABEL).map((s) => `**${s.label}**`).join(' · ')}.\n\n`;
md += `Aucune règle n'est inventée : ce qui n'a pas pu être vérifié est signalé « À vérifier » ou « Hypothèse pédagogique ». Avant toute opération réelle, vérifier les textes en vigueur (ADII/ADIL, Office des Changes/IGOC, PortNet, ONSSA, MCINET).\n\n`;
for (const theme of [...new Set(KNOWLEDGE.map((k) => k.theme))]) {
  md += `## ${theme}\n\n`;
  for (const k of KNOWLEDGE.filter((x) => x.theme === theme)) {
    md += `### ${k.title}\n\n*Statut : ${STATUS_LABEL[k.status].label} — vérifié le ${k.checked}*\n\n${k.summary}\n\n`;
    md += k.details.map((d) => `- ${d}`).join('\n') + '\n\n';
    md += `**Fondement :** ${k.legalBasis}\n\n`;
    if (k.sources.length) md += `**Sources :** ${k.sources.map((s) => (s.url ? `[${s.name}](${s.url})` : s.name)).join(' · ')}\n\n`;
  }
}
writeFileSync(new URL('../docs/BASE-REGLEMENTAIRE.md', import.meta.url), md);
console.log(`${KNOWLEDGE.length} fiches exportées`);
