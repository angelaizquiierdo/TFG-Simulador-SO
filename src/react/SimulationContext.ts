import { createContext, useContext } from 'react';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';
import type { IAlgorithm } from '../core/types/algorithm.js';
import type { Process } from '../core/types/process.js';
import type { Player } from '../core/player.js';

export interface SimulationContextValue {
  result: SimulationResult | null;
  processes: readonly Process[];
  currentEvent: HistoryEvent | undefined;
  player: Player | null;
  algorithm: IAlgorithm | null;
  error: string | null;
  setTick: (n: number) => void;
  stepForward: () => void;
  stepBackward: () => void;
  goToStart: () => void;
  goToEnd: () => void;
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (ctx === null) {
    throw new Error('useSimulation debe usarse dentro de un <SimulationProvider>');
  }
  return ctx;
}
