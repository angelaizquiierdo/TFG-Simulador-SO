import React, { useState, useCallback, useMemo } from 'react';
import { get } from '../core/registry.js';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import type { Process } from '../core/types/process.js';
import { SimulationContext } from './SimulationContext.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { IAlgorithm } from '../core/types/algorithm.js';
import styles from './style/SimulationProvider.module.css';

export interface SimulationProviderProps {
  algorithm: string;
  processes: Process[];
  params?: { quantum?: number };
  children?: React.ReactNode;
}

// Componentes por defecto (importados de forma lazy para evitar dependencias circulares)
import { ProcessTable } from './ProcessTable.js';
import { GanttChart } from './GanttChart.js';
import { PlaybackControls } from './PlaybackControls.js';
import { MetricsTable } from './MetricsTable.js';

export function SimulationProvider({
  algorithm: algorithmName,
  processes,
  params,
  children,
}: SimulationProviderProps): React.ReactElement {
  // Calcular resultado y player una sola vez al montar
  const { result, algorithm, error } = useMemo<{
    result: SimulationResult | null;
    algorithm: IAlgorithm | null;
    error: string | null;
  }>(() => {
    if (processes.length === 0) {
      return { result: null, algorithm: null, error: null };
    }
    try {
      const algo = get(algorithmName);
      const cfg = params?.quantum !== undefined
        ? { algorithm: algo, quantum: params.quantum }
        : { algorithm: algo };
      const r = run(processes, cfg);
      return { result: r, algorithm: algo, error: null };
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      return { result: null, algorithm: null, error: msg };
    }
  }, [algorithmName, processes, params]);

  const [tick, setTickState] = useState(0);

  const player = useMemo(
    () => (result !== null ? new Player(result.history) : null),
    [result],
  );

  const setTick = useCallback(
    (n: number) => {
      if (player !== null) {
        player.goTo(n);
        setTickState(player.tick);
      }
    },
    [player],
  );

  const stepForward = useCallback(() => {
    if (player !== null) {
      player.stepForward();
      setTickState(player.tick);
    }
  }, [player]);

  const stepBackward = useCallback(() => {
    if (player !== null) {
      player.stepBackward();
      setTickState(player.tick);
    }
  }, [player]);

  const goToStart = useCallback(() => {
    if (player !== null) {
      player.goTo(0);
      setTickState(0);
    }
  }, [player]);

  const goToEnd = useCallback(() => {
    if (player !== null && result !== null) {
      const last = result.history.length - 1;
      player.goTo(last);
      setTickState(last);
    }
  }, [player, result]);

  const currentEvent = result?.history[tick];

  const ctxValue = useMemo(
    () => ({
      result,
      processes,
      currentEvent,
      player,
      algorithm,
      error,
      setTick,
      stepForward,
      stepBackward,
      goToStart,
      goToEnd,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [result, currentEvent, player, algorithm, error, setTick, stepForward, stepBackward, goToStart, goToEnd],
  );

  return (
    <SimulationContext.Provider value={ctxValue}>
      <div className={styles.container}>
        {error !== null && <div className={styles.error}>{error}</div>}
        {children ?? (
          <>
            <ProcessTable />
            <GanttChart />
            <PlaybackControls />
            <MetricsTable />
          </>
        )}
      </div>
    </SimulationContext.Provider>
  );
}
