import { useEffect, useState } from 'react';
import type { GameState, Mode } from './engine/types';
import { applyResolution, currentStep, newGame, type Resolution } from './engine/game';
import { SCENARIOS } from './data/scenarios';
import { saves, type SaveSlot } from './engine/store';
import Home from './screens/Home';
import GameShell from './screens/GameShell';

export default function App() {
  const [slot, setSlot] = useState<SaveSlot | null>(null);
  const [saved, setSaved] = useState(false);

  // Sauvegarde automatique à chaque changement d'état
  useEffect(() => {
    if (slot) { saves.put(slot); setSaved(true); const t = setTimeout(() => setSaved(false), 1500); return () => clearTimeout(t); }
  }, [slot]);

  if (!slot) {
    return (
      <Home
        onStart={(id, mode: Mode, name) => {
          const sc = SCENARIOS[id];
          const state = newGame(sc, mode, name);
          setSlot({ id: crypto.randomUUID?.() ?? String(Date.now()), name: `${name} — ${sc.title}`, state });
        }}
        onLoad={setSlot}
      />
    );
  }

  const sc = SCENARIOS[slot.state.scenarioId];
  const onResolve = (r: Resolution, explanation: string) => {
    const step = currentStep(sc, slot.state);
    if (!step) return;
    const next: GameState = applyResolution(sc, slot.state, step, r, explanation);
    setSlot({ ...slot, state: next });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <GameShell
      sc={sc} state={slot.state} saved={saved} onResolve={onResolve}
      onSave={() => { saves.put(slot); setSaved(true); }}
      onQuit={() => setSlot(null)}
      onRestart={() => setSlot(null)}
    />
  );
}
