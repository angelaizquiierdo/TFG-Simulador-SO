import React, { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import { get } from '../core/registry.js';
import type { Process } from '../core/types/process.js';
import type { IAlgorithm } from '../core/types/algorithm.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import { SimulationContext } from './SimulationContext.js';
import { ProcessTable } from './ProcessTable.js';
import { GanttChart } from './GanttChart.js';
import { PlaybackControls } from './PlaybackControls.js';
import { MetricsTable } from './MetricsTable.js';
import styles from './style/SimulationProvider.module.css';

interface Props {
  algorithm: string;
  processes: Process[];
  params?: { quantum?: number };
  children?: ReactNode;
}

interface SimData {
  result: SimulationResult | null;
  player: Player;
  error: string | null;
  algorithmInfo: IAlgorithm | null;
}

function computeSimData(algorithm: string, processes: Process[], params?: { quantum?: number }): SimData {
  let algorithmInfo: IAlgorithm | null = null;
  try {
    algorithmInfo = get(algorithm);
  } catch {
    // algoritmo no encontrado
  }

  if (algorithmInfo === null) {
    return {
      result: null,
      player: new Player([]),
      error: `Algoritmo "${algorithm}" no registrado.`,
      algorithmInfo: null,
    };
  }

  if (processes.length === 0) {
    return { result: null, player: new Player([]), error: null, algorithmInfo };
  }

  try {
    const config = params !== undefined ? { algorithm, params } : { algorithm };
    const res = run(processes, config);
    return { result: res, player: new Player(res.history), error: null, algorithmInfo };
  } catch (e) {
    return {
      result: null,
      player: new Player([]),
      error: e instanceof Error ? e.message : String(e),
      algorithmInfo,
    };
  }
}

export function SimulationProvider({ algorithm, processes, params, children }: Props) {
  const { result, player, error, algorithmInfo } = useMemo(
    () => computeSimData(algorithm, processes, params),
    [algorithm, processes, params],
  );

  const [tick, setTick] = useState(0);

  const totalTicks = result !== null ? result.history.length : 0;

  const stepForward = () => {
    player.stepForward();
    setTick(player.tick);
  };
  const stepBackward = () => {
    player.stepBackward();
    setTick(player.tick);
  };
  const goTo = (n: number) => {
    player.goTo(n);
    setTick(player.tick);
  };

  const currentEvent = result?.history[tick];

  const value = {
    result,
    currentEvent,
    tick,
    atStart: totalTicks === 0 || tick === 0,
    atEnd: totalTicks === 0 || tick === totalTicks - 1,
    totalTicks,
    stepForward,
    stepBackward,
    goTo,
    error,
    algorithmInfo,
    processes,
  };

  return (
    <SimulationContext.Provider value={value}>
      <div className={styles.provider}>
        {children !== undefined ? children : (
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
