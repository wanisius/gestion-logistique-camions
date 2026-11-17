// jsPDF (police Helvetica standard) ne gère que le jeu WinAnsi : on remplace les caractères non supportés.
const MAP: Record<string, string> = {
  '≠': '!=', '≤': '<=', '≥': '>=', '→': '->', '←': '<-', '…': '...', '≈': '~', '✔': 'OK', '✘': 'X', '★': '*', 'Ş': 'S', 'ş': 's', '−': '-', ' ': ' ', ' ': ' ',
};
export function pdfSafe(s: string): string {
  return s
    .replace(/[≠≤≥→←…≈✔✘★Şş−  ]/g, (c) => MAP[c] ?? '')
    .replace(/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[^\x00-\xFF€’‘“”–—•]/g, '');
}
