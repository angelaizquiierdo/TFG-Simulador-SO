import { createContext, useContext } from 'react';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';
import type { IAlgorithm } from '../core/types/algorithm.js';
import type { Process } from '../core/types/process.js';

export interface SimulationContextValue {
  result: SimulationResult | null;
  currentEvent: HistoryEvent | undefined;
  tick: number;
  atStart: boolean;
  atEnd: boolean;
  totalTicks: number;
  stepForward: () => void;
  stepBackward: () => void;
  goTo: (n: number) => void;
  error: string | null;
  algorithmInfo: IAlgorithm | null;
  processes: readonly Process[];
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (ctx === null) {
    throw new Error('useSimulation() debe usarse dentro de un <SimulationProvider>.');
  }
  return ctx;
}
