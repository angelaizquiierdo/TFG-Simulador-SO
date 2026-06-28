import React, { useMemo, useState, useCallback } from 'react';
import type { Process } from '../core/types/process.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import { SimulationCtx } from './SimulationContext.js';
import type { WhatIfBranch, WhatIfOverrides, SimulationContextValue } from './SimulationContext.js';

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

export function SimulationProvider({
  algorithm,
  processes,
  params,
  children,
}: SimulationProviderProps): React.ReactElement {
  // Ejecutar la simulación principal (memoizado)
  const [mainResult, mainError] = useMemo((): [SimulationResult | null, string | null] => {
    if (processes.length === 0) return [null, null];
    try {
      return [run(processes, buildConfig(algorithm, params)), null];
    } catch (e: unknown) {
      return [null, e instanceof Error ? e.message : String(e)];
    }
  }, [algorithm, processes, params]);

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

  const createWhatIf = useCallback(
    (overrides: WhatIfOverrides) => {
      const nextAlgorithm = overrides.algorithm ?? algorithm;
      const nextParams = overrides.params ?? params;
      const nextProcesses = overrides.processes ?? processes;
      if (nextProcesses.length === 0) return;
      try {
        const result = run(nextProcesses, buildConfig(nextAlgorithm, nextParams));
        setWhatIfBranch({ result, player: new Player(result.history) });
      } catch (err: unknown) {
        void err; // silenciar errores en la rama what-if
      }
    },
    [algorithm, processes, params],
  );

  const discardWhatIf = useCallback(() => {
    setWhatIfBranch(null);
  }, []);

  // Sincroniza el tickIndex con el player al navegar.
  // Se pasa el player directamente al contexto; los componentes de navegación
  // deben llamar a syncTick() después de cada paso para forzar el re-render.
  const syncTick = useCallback(() => {
    if (player !== null) setTickIndex(player.tick);
  }, [player]);

  void syncTick; // expuesta a través del contexto en el futuro; suprimir lint

  const value: SimulationContextValue = useMemo(
    () => ({
      result: mainResult,
      currentEvent,
      player,
      error: mainError,
      whatIfBranch,
      createWhatIf,
      discardWhatIf,
    }),
    [mainResult, currentEvent, player, mainError, whatIfBranch, createWhatIf, discardWhatIf],
  );

  return <SimulationCtx.Provider value={value}>{children}</SimulationCtx.Provider>;
}
