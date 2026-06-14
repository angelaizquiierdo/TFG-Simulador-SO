// T-25 — Proveedor del contexto de simulación
import React, { useState, useMemo } from 'react';
import { get } from '../core/registry.js';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import type { Process } from '../core/types/process.js';
import type { IAlgorithm } from '../core/types/algorithm.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import { SimulationContext } from './SimulationContext.js';
import { ProcessTable } from './ProcessTable.js';
import { GanttChart } from './GanttChart.js';
import { PlaybackControls } from './PlaybackControls.js';
import { MetricsTable } from './MetricsTable.js';
import styles from './style/SimulationProvider.module.css';

interface SimulationProviderProps {
  algorithm: string;
  processes: readonly Process[];
  params?: { quantum?: number };
  children?: React.ReactNode;
}

export function SimulationProvider({
  algorithm: algorithmName,
  processes,
  params,
  children,
}: SimulationProviderProps): React.ReactElement {
  // Derivar result, algo y error de forma pura (memo)
  const { result, algo, error } = useMemo<{
    result: SimulationResult | null;
    algo: IAlgorithm | null;
    error: string | null;
  }>(() => {
    if (processes.length === 0) {
      return { result: null, algo: null, error: null };
    }
    // Validar burst_time
    for (const p of processes) {
      if (p.burst_time <= 0) {
        return { result: null, algo: null, error: 'La ráfaga debe ser mayor que 0' };
      }
    }
    try {
      const resolvedAlgo = get(algorithmName);
      const cfg = params !== undefined
        ? { algorithm: resolvedAlgo, params }
        : { algorithm: resolvedAlgo };
      const simResult = run([...processes], cfg);
      return { result: simResult, algo: resolvedAlgo, error: null };
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      return { result: null, algo: null, error: msg };
    }
  }, [algorithmName, processes, params]);

  // El Player vive en state para que sus mutaciones fuercen re-renders
  const [player, setPlayer] = useState<Player>(
    () => new Player(result?.history ?? []),
  );

  // Cuando result cambia, crear un nuevo Player
  const [prevResult, setPrevResult] = useState<SimulationResult | null>(result);
  if (prevResult !== result) {
    setPrevResult(result);
    setPlayer(new Player(result?.history ?? []));
  }

  const history = result?.history ?? [];

  const stepForward = (): void => {
    setPlayer((prev) => {
      const next = new Player(history);
      next.goTo(prev.tick);
      next.stepForward();
      return next;
    });
  };

  const stepBackward = (): void => {
    setPlayer((prev) => {
      const next = new Player(history);
      next.goTo(prev.tick);
      next.stepBackward();
      return next;
    });
  };

  const goTo = (n: number): void => {
    setPlayer((prev) => {
      void prev;
      const next = new Player(history);
      next.goTo(n);
      return next;
    });
  };

  const value = {
    result,
    currentEvent: player.current,
    player,
    error,
    algorithm: algo,
    processes,
    tick: player.tick,
    atStart: player.atStart,
    atEnd: player.atEnd,
    stepForward,
    stepBackward,
    goTo,
  };

  return (
    <SimulationContext.Provider value={value}>
      {children !== undefined ? (
        children
      ) : (
        <div className={styles.container}>
          <ProcessTable />
          <GanttChart />
          <PlaybackControls />
          <MetricsTable />
        </div>
      )}
    </SimulationContext.Provider>
  );
}
