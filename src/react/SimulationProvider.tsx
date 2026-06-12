import React, { useState, useMemo, useCallback } from 'react';
import { get } from '../core/registry.js';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import type { Process } from '../core/types/process.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import { SimulationContext } from './SimulationContext.js';

interface SimulationProviderProps {
  readonly algorithm: string;
  readonly processes: Process[];
  readonly params?: { quantum?: number };
  readonly children?: React.ReactNode;
}

export function SimulationProvider({
  algorithm: algorithmName,
  processes,
  params,
  children,
}: SimulationProviderProps): React.ReactElement {
  // Calcular resultado y player cuando cambian las entradas
  const { result, error, player, algo } = useMemo(() => {
    const resolvedAlgo = get(algorithmName);

    if (processes.length === 0) {
      return {
        result: null,
        error: null,
        player: new Player([]),
        algo: resolvedAlgo,
      };
    }

    try {
      const simResult: SimulationResult = run(processes, resolvedAlgo, params ?? {});
      return {
        result: simResult,
        error: null,
        player: new Player(simResult.history),
        algo: resolvedAlgo,
      };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido';
      return {
        result: null,
        error: msg,
        player: new Player([]),
        algo: resolvedAlgo,
      };
    }
  }, [algorithmName, processes, params]);

  // Estado de tick — se almacena junto con la referencia del player para detectar cambios
  // sin necesidad de un useEffect (patrón de "derived state from props")
  const [tickState, setTickState] = useState<{ forPlayer: Player; tick: number }>({
    forPlayer: player,
    tick: 0,
  });

  // Si el player cambió (nueva simulación), reiniciar tick a 0 durante el render
  const tick = tickState.forPlayer === player ? tickState.tick : 0;

  const totalTicks = result ? result.history.length : 0;
  const atStart = tick === 0;
  const atEnd = totalTicks === 0 ? true : tick === totalTicks - 1;

  const stepForward = useCallback((): void => {
    setTickState((prev) => {
      const current = prev.forPlayer === player ? prev.tick : 0;
      const next = current < totalTicks - 1 ? current + 1 : current;
      return { forPlayer: player, tick: next };
    });
  }, [player, totalTicks]);

  const stepBackward = useCallback((): void => {
    setTickState((prev) => {
      const current = prev.forPlayer === player ? prev.tick : 0;
      const next = current > 0 ? current - 1 : 0;
      return { forPlayer: player, tick: next };
    });
  }, [player]);

  const goTo = useCallback(
    (n: number): void => {
      setTickState({ forPlayer: player, tick: n });
    },
    [player],
  );

  const currentEvent = result?.history[tick];

  const contextValue = useMemo(
    () => ({
      result,
      currentEvent,
      tick,
      atStart,
      atEnd,
      stepForward,
      stepBackward,
      goTo,
      error,
      processes,
      algorithm: algo,
    }),
    [result, currentEvent, tick, atStart, atEnd, stepForward, stepBackward, goTo, error, processes, algo],
  );

  return (
    <SimulationContext.Provider value={contextValue}>
      <div>{children}</div>
    </SimulationContext.Provider>
  );
}
