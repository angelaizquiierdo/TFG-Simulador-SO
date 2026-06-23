import { createContext, useContext } from 'react';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';
import type { IAlgorithm, AlgorithmParams } from '../core/types/algorithm.js';
import type { Process } from '../core/types/process.js';

export interface SimulationContextValue {
  result: SimulationResult | null;
  currentEvent: HistoryEvent | undefined;
  error: Error | null;
  algo: IAlgorithm | null;
  processes: readonly Process[];
  params: AlgorithmParams;
  tick: number;
  stepForward: () => void;
  stepBackward: () => void;
  goTo: (n: number) => void;
  updateProcesses: (processes: readonly Process[]) => void;
  updateParams: (params: AlgorithmParams) => void;
  reset: () => void;
}

export const SimulationCtx = createContext<SimulationContextValue | null>(null);

export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationCtx);
  if (ctx === null) {
    throw new Error('useSimulation debe usarse dentro de un <SimulationProvider>');
  }
  return ctx;
}
