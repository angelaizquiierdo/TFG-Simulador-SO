import React, { useMemo, useState, useCallback } from 'react';
import type { Process } from '../core/types/process.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import { get } from '../core/registry.js';
import { SimulationCtx } from './SimulationContext.js';
import type {
  WhatIfBranch,
  WhatIfOverrides,
  SimulationContextValue,
  AlgorithmRequires,
} from './SimulationContext.js';

export interface SimulationProviderProps {
  readonly algorithm: string;
  readonly processes: readonly Process[];
  readonly params?: Readonly<Record<string, unknown>>;
  readonly children: React.ReactNode;
}

// Extrae campos conocidos de params para RunConfig
function buildConfig(
  algorithm: string,
  params: Readonly<Record<string, unknown>> | undefined,
): { algorithm: string; quantum?: number; boostInterval?: number } {
  const quantum =
    typeof params?.quantum === 'number' ? params.quantum : undefined;
  const boostInterval =
    typeof params?.boostInterval === 'number' ? params.boostInterval : undefined;
  return {
    algorithm,
    ...(quantum !== undefined ? { quantum } : {}),
    ...(boostInterval !== undefined ? { boostInterval } : {}),
  };
}

// Descriptor de requisitos vacío para cuando el algoritmo no existe
const EMPTY_REQUIRES: AlgorithmRequires = {};

export function SimulationProvider({
  algorithm,
  processes: initialProcesses,
  params: initialParams,
  children,
}: SimulationProviderProps): React.ReactElement {
  // Estado interno editable de procesos y parámetros (inicializados desde props)
  const [localProcesses, setLocalProcesses] = useState<readonly Process[]>(initialProcesses);
  const [localParams, setLocalParams] = useState<Readonly<Record<string, unknown>>>(
    initialParams ?? {},
  );

  // Ejecutar la simulación principal (memoizado)
  const [mainResult, mainError] = useMemo((): [SimulationResult | null, string | null] => {
    if (localProcesses.length === 0) return [null, null];
    try {
      return [run(localProcesses, buildConfig(algorithm, localParams)), null];
    } catch (e: unknown) {
      return [null, e instanceof Error ? e.message : String(e)];
    }
  }, [algorithm, localProcesses, localParams]);

  // Descriptor de requisitos del algoritmo activo
  const requires = useMemo((): AlgorithmRequires => {
    try {
      return get(algorithm).requires;
    } catch {
      return EMPTY_REQUIRES;
    }
  }, [algorithm]);

  // Instancia del Player (memoizada — se recrea cuando cambia mainResult)
  const player = useMemo(
    () => (mainResult !== null ? new Player(mainResult.history) : null),
    [mainResult],
  );

  // tickIndex se almacena en estado para forzar re-renders al navegar
  const [tickIndex, setTickIndex] = useState(0);

  // currentEvent derivado del historial y el tick actual
  const currentEvent: HistoryEvent | undefined = useMemo(
    () => mainResult?.history[tickIndex],
    [mainResult, tickIndex],
  );

  // Rama what-if
  const [whatIfBranch, setWhatIfBranch] = useState<WhatIfBranch | null>(null);

  // Funciones de navegación: mueven el Player Y sincronizan tickIndex
  const stepForward = useCallback(() => {
    if (player === null) return;
    player.stepForward();
    setTickIndex(player.tick);
  }, [player]);

  const stepBackward = useCallback(() => {
    if (player === null) return;
    player.stepBackward();
    setTickIndex(player.tick);
  }, [player]);

  const seekTo = useCallback(
    (n: number) => {
      if (player === null) return;
      player.goTo(n);
      setTickIndex(player.tick);
    },
    [player],
  );

  // Mutaciones de escenario: actualizan estado local y rederivan al instante
  const updateProcesses = useCallback((next: readonly Process[]) => {
    setLocalProcesses(next);
    setTickIndex(0);
  }, []);

  const updateParams = useCallback((next: Readonly<Record<string, unknown>>) => {
    setLocalParams(next);
    setTickIndex(0);
  }, []);

  const createWhatIf = useCallback(
    (overrides: WhatIfOverrides) => {
      const nextAlgorithm = overrides.algorithm ?? algorithm;
      const nextParams = overrides.params ?? localParams;
      const nextProcesses = overrides.processes ?? localProcesses;
      if (nextProcesses.length === 0) return;
      try {
        const result = run(nextProcesses, buildConfig(nextAlgorithm, nextParams));
        setWhatIfBranch({ result, player: new Player(result.history) });
      } catch (err: unknown) {
        void err; // silenciar errores en la rama what-if
      }
    },
    [algorithm, localProcesses, localParams],
  );

  const discardWhatIf = useCallback(() => {
    setWhatIfBranch(null);
  }, []);

  const value: SimulationContextValue = useMemo(
    () => ({
      result: mainResult,
      currentEvent,
      player,
      error: mainError,
      whatIfBranch,
      processes: localProcesses,
      algorithmName: algorithm,
      params: localParams,
      requires,
      stepForward,
      stepBackward,
      seekTo,
      updateProcesses,
      updateParams,
      createWhatIf,
      discardWhatIf,
    }),
    [
      mainResult,
      currentEvent,
      player,
      mainError,
      whatIfBranch,
      localProcesses,
      algorithm,
      localParams,
      requires,
      stepForward,
      stepBackward,
      seekTo,
      updateProcesses,
      updateParams,
      createWhatIf,
      discardWhatIf,
    ],
  );

  return <SimulationCtx.Provider value={value}>{children}</SimulationCtx.Provider>;
}
