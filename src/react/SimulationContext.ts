import { createContext, useContext } from 'react';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';
import type { Player } from '../core/player.js';
import type { Process } from '../core/types/process.js';
import type { IAlgorithm } from '../core/types/algorithm.js';

// Rama what-if: resultado y reproductor de una simulación alternativa
export interface WhatIfBranch {
  readonly result: SimulationResult;
  readonly player: Player;
}

// Parámetros para sobrescribir en la rama what-if
export interface WhatIfOverrides {
  readonly processes?: readonly Process[];
  readonly algorithm?: string;
  readonly params?: Readonly<Record<string, unknown>>;
}

/** Descriptor del algoritmo activo (lo que requiere) */
export type AlgorithmRequires = IAlgorithm['requires'];

export interface SimulationContextValue {
  /** Resultado de la simulación principal. Null si hubo error o lista vacía. */
  readonly result: SimulationResult | null;
  /** Evento actual del reproductor (tick seleccionado). */
  readonly currentEvent: HistoryEvent | undefined;
  /** Reproductor para navegar el historial. Null si no hay resultado. */
  readonly player: Player | null;
  /** Mensaje de error si la simulación falló, null si todo fue bien. */
  readonly error: string | null;
  /** Rama what-if activa, null si no hay ninguna. */
  readonly whatIfBranch: WhatIfBranch | null;
  /** Lista de procesos activa (puede diferir de los props iniciales tras edición). */
  readonly processes: readonly Process[];
  /** Nombre del algoritmo activo. */
  readonly algorithmName: string;
  /** Parámetros activos del algoritmo. */
  readonly params: Readonly<Record<string, unknown>>;
  /** Descriptor de requisitos del algoritmo activo (priority, quantum, io). */
  readonly requires: AlgorithmRequires;
  /** Avanza un tick y fuerza re-render. */
  stepForward: () => void;
  /** Retrocede un tick y fuerza re-render. */
  stepBackward: () => void;
  /** Salta al tick indicado y fuerza re-render. */
  seekTo: (n: number) => void;
  /** Reemplaza la lista de procesos y rederiva la simulación al instante. */
  updateProcesses: (processes: readonly Process[]) => void;
  /** Reemplaza los parámetros del algoritmo y rederiva la simulación. */
  updateParams: (params: Readonly<Record<string, unknown>>) => void;
  /** Crea una rama what-if desde el tick actual del player. */
  createWhatIf: (overrides: WhatIfOverrides) => void;
  /** Descarta la rama what-if activa. */
  discardWhatIf: () => void;
  /** Restaura el escenario a los valores iniciales de props y borra sessionStorage. */
  reset: () => void;
}

export const SimulationCtx = createContext<SimulationContextValue | null>(null);

/** Hook para consumir el contexto de simulación. Lanza error si se usa fuera del Provider. */
export function useSimulation(): SimulationContextValue {
  const ctx = useContext(SimulationCtx);
  if (ctx === null) {
    throw new Error(
      'useSimulation() debe usarse dentro de un <SimulationProvider>. ' +
        'Asegúrate de envolver el componente con <SimulationProvider>.',
    );
  }
  return ctx;
}
