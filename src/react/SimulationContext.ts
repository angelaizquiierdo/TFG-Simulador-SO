import { createContext, useContext } from 'react';
import type { HistoryEvent } from '../core/types/history.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { IAlgorithm } from '../core/types/algorithm.js';
import type { Process } from '../core/types/process.js';

// Valor expuesto por el contexto de simulación
export interface SimulationContextValue {
  readonly result: SimulationResult | null;
  readonly currentEvent: HistoryEvent | undefined;
  readonly tick: number;
  readonly atStart: boolean;
  readonly atEnd: boolean;
  readonly stepForward: () => void;
  readonly stepBackward: () => void;
  readonly goTo: (n: number) => void;
  readonly error: string | null;
  readonly processes: Process[];
  readonly algorithm: IAlgorithm;
}

export const SimulationContext = createContext<SimulationContextValue | null>(null);

// Hook de acceso al contexto — lanza error si se usa fuera de un Provider
export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationContext);
  if (ctx === null) {
    throw new Error('useSimulation debe usarse dentro de un SimulationProvider');
  }
  return ctx;
}
