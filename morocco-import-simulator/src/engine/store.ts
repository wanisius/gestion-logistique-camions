import type { GameState } from './types';

const KEY = 'mis.saves.v1';
export interface SaveSlot { id: string; name: string; state: GameState }

function safeRead(): SaveSlot[] {
  try { return JSON.parse(localStorage.getItem(KEY) || '[]') as SaveSlot[]; } catch { return []; }
}
function safeWrite(slots: SaveSlot[]) {
  try { localStorage.setItem(KEY, JSON.stringify(slots)); } catch { /* stockage indisponible */ }
}

export const saves = {
  list: safeRead,
  put(slot: SaveSlot) {
    const all = safeRead().filter((s) => s.id !== slot.id);
    safeWrite([slot, ...all].slice(0, 12));
  },
  remove(id: string) { safeWrite(safeRead().filter((s) => s.id !== id)); },
  /** Export / import d'une sauvegarde en fichier JSON (portable entre appareils). */
  download(slot: SaveSlot) {
    const blob = new Blob([JSON.stringify(slot, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sauvegarde-${slot.name.replace(/\W+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  },
  async importFile(file: File): Promise<SaveSlot> {
    const slot = JSON.parse(await file.text()) as SaveSlot;
    if (!slot?.state?.scenarioId || slot.state.version !== 1) throw new Error('Fichier de sauvegarde invalide');
    saves.put(slot);
    return slot;
  },
};
