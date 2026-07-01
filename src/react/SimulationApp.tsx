import React from 'react';
import type { Process } from '../core/types/process.js';
import { SimulationProvider } from './SimulationProvider.js';
import { AlgorithmParamsForm } from './AlgorithmParamsForm.js';
import { ProcessTable } from './ProcessTable.js';
import { GanttChart } from './GanttChart.js';
import { PlaybackControls } from './PlaybackControls.js';
import { MetricsTable } from './MetricsTable.js';
import { ProcessForm } from './ProcessForm.js';
import { WhatIfControls } from './WhatIfControls.js';
import './style/tokens.css';
import styles from './style/SimulationApp.module.css';

export interface SimulationAppProps {
  /** Nombre del algoritmo registrado (ej. 'fcfs', 'round-robin'). */
  readonly algorithm: string;
  /** Lista de procesos para la simulación inicial. */
  readonly processes: readonly Process[];
  /** Parámetros opcionales del algoritmo (quantum, boostInterval, etc.). */
  readonly params?: Readonly<Record<string, unknown>>;
  /**
   * Modo de layout.
   * - `'unified'` (defecto): Panel unificado con cuadrícula de subcomponentes.
   * - `'interleaved'`: Columna vertical para intercalar con contenido textual.
   */
  readonly mode?: 'unified' | 'interleaved';
  /** Clase CSS adicional inyectada en el contenedor raíz. */
  readonly className?: string;
}

/** Orquestador visual del simulador. */
export function SimulationApp({
  algorithm,
  processes,
  params,
  mode = 'unified',
  className,
}: SimulationAppProps): React.ReactElement {
  const layoutClass = mode === 'unified' ? styles.unified : styles.interleaved;
  const combinedClass = [styles.app, layoutClass, className]
    .filter(Boolean)
    .join(' ');

  return (
    <SimulationProvider
      algorithm={algorithm}
      processes={processes}
      {...(params !== undefined ? { params } : {})}
    >
      <div
        className={combinedClass}
        data-testid="simulation-app"
        data-mode={mode}
      >
        <div className={styles.paramsSlot}>
          <AlgorithmParamsForm />
        </div>
        <div className={styles.tableSlot}>
          <ProcessTable />
        </div>
        <div className={styles.formSlot}>
          <ProcessForm />
        </div>
        <div className={styles.ganttSlot}>
          <GanttChart />
        </div>
        <div className={styles.controlsSlot}>
          <PlaybackControls />
        </div>
        <div className={styles.metricsSlot}>
          <MetricsTable />
        </div>
        <div className={styles.whatifSlot}>
          <WhatIfControls />
        </div>
      </div>
    </SimulationProvider>
  );
}
