import React from 'react';
import { useSimulation } from './SimulationContext.js';
import type { HistoryEvent } from '../core/types/history.js';
import styles from './style/GanttChart.module.css';

/** Paleta de 10 colores de proceso desde los tokens CSS */
const PROCESS_COLORS: readonly string[] = [
  'var(--scheduler-process-0)',
  'var(--scheduler-process-1)',
  'var(--scheduler-process-2)',
  'var(--scheduler-process-3)',
  'var(--scheduler-process-4)',
  'var(--scheduler-process-5)',
  'var(--scheduler-process-6)',
  'var(--scheduler-process-7)',
  'var(--scheduler-process-8)',
  'var(--scheduler-process-9)',
];

/** Determina la clase CSS de una celda (proceso × tick). */
function cellClass(
  pid: string,
  tickIdx: number,
  currentTick: number,
  event: HistoryEvent | undefined,
): string {
  // Ticks futuros no revelados
  if (tickIdx > currentTick || event === undefined) return styles.empty ?? '';

  if (event.onCPU === pid) return styles.cpu ?? '';
  if (event.ready.includes(pid)) return styles.waiting ?? '';
  if (event.inIO === pid) return styles.ioServing ?? '';
  if (event.waitingIO.includes(pid)) return styles.ioWaiting ?? '';

  // Proceso pendiente de llegar o ya completado → celda vacía
  if (event.pending.includes(pid) || event.completed.includes(pid)) {
    return styles.empty ?? '';
  }

  // CPU inactiva: ningún proceso en CPU → celda gris
  if (event.onCPU === null) return styles.idle ?? '';

  return styles.empty ?? '';
}

export function GanttChart(): React.ReactElement {
  const { result, currentEvent, processes, requires } = useSimulation();

  const history = result?.history ?? [];
  const totalTicks = history.length;
  const currentTick = currentEvent?.tick ?? 0;
  const message = currentEvent?.message ?? '';
  const showIO = requires.io === true;

  // Ticks: 0 … totalTicks - 1
  const ticks = Array.from({ length: totalTicks }, (_, i) => i);

  return (
    <div className={styles.chart} data-testid="gantt-chart">
      {/* 1. Mensaje del tick actual */}
      <div className={styles.message} data-testid="gantt-message">
        {message}
      </div>

      {/* 2. Matriz */}
      <div className={styles.matrix} data-testid="gantt-matrix">
        {/* Fila de cabecera con números de tick */}
        <div className={styles.rowHeader} data-testid="gantt-header">
          {/* Espaciador que ocupa el lugar de la etiqueta lateral */}
          <div className={styles.labelSpacer} aria-hidden="true" />
          {ticks.map((t) => (
            <div key={t} className={styles.tickNumber}>
              {t}
            </div>
          ))}
        </div>

        {/* Filas de procesos */}
        {processes.map((p, idx) => {
          const colorVar =
            PROCESS_COLORS[idx % PROCESS_COLORS.length] ?? 'var(--scheduler-process-0)';
          return (
            <div
              key={p.id}
              className={styles.row}
              style={{ '--process-color': colorVar } as React.CSSProperties}
              data-testid={`gantt-row-${p.id}`}
            >
              {/* Etiqueta lateral: el único texto dentro de la fila */}
              <div className={styles.label}>{p.id}</div>
              {/* Celdas: sin texto, solo color */}
              {ticks.map((t) => {
                const event = history[t];
                const stateClass = cellClass(p.id, t, currentTick, event);
                return (
                  <div
                    key={t}
                    className={`${styles.cell ?? ''} ${stateClass}`}
                    data-testid={`gantt-cell-${p.id}-${String(t)}`}
                    data-state={stateClass.split(' ').pop() ?? ''}
                    aria-label={`${p.id} tick ${String(t)}`}
                  />
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. Leyenda */}
      <div className={styles.legend} data-testid="gantt-legend">
        <div className={styles.legendItem}>
          <div className={`${styles.legendSwatch ?? ''} ${styles.swatchIdle ?? ''}`} />
          <span>Inactivo</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSwatch ?? ''} ${styles.swatchWaiting ?? ''}`} />
          <span>En espera</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSwatch ?? ''} ${styles.swatchCpu ?? ''}`} />
          <span>En CPU</span>
        </div>
        {showIO && (
          <>
            <div className={styles.legendItem}>
              <div
                className={`${styles.legendSwatch ?? ''} ${styles.swatchIoServing ?? ''}`}
              />
              <span>En E/S</span>
            </div>
            <div className={styles.legendItem}>
              <div
                className={`${styles.legendSwatch ?? ''} ${styles.swatchIoWaiting ?? ''}`}
              />
              <span>Esperando E/S</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
