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
  if (tickIdx > currentTick || event === undefined) return styles.empty ?? '';

  if (event.onCPU === pid) return styles.cpu ?? '';
  if (event.ready.includes(pid)) return styles.waiting ?? '';
  if (event.inIO === pid) return styles.ioServing ?? '';
  if (event.waitingIO.includes(pid)) return styles.ioWaiting ?? '';

  if (event.pending.includes(pid) || event.completed.includes(pid)) {
    return styles.empty ?? '';
  }

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

  const ticks = Array.from({ length: totalTicks }, (_, i) => i);

  return (
    <div className={styles.chart} data-testid="gantt-chart">
      {/* 1. Mensaje del tick actual */}
      <div className={styles.message} data-testid="gantt-message">
        {message}
      </div>

      {/* 2. Matriz con cuadrícula explícita garantizada por min-width: max-content */}
      <div className={styles.matrix} data-testid="gantt-matrix">
        <div className={styles.rowHeader} data-testid="gantt-header">
          <div className={styles.labelSpacer} aria-hidden="true" />
          {ticks.map((t) => (
            <div key={t} className={styles.tickNumber}>
              {t}
            </div>
          ))}
        </div>

        {processes.map((p, idx) => {
          const colorVar = PROCESS_COLORS[idx % PROCESS_COLORS.length] ?? 'var(--scheduler-process-0)';
          return (
            <div
              key={p.id}
              className={styles.row}
              style={{ '--process-color': colorVar } as React.CSSProperties}
              data-testid={`gantt-row-${p.id}`}
            >
              <div className={styles.label}>{p.id}</div>
              
              {ticks.map((t) => {
                const event = history[t];
                const stateClass = cellClass(p.id, t, currentTick, event);
                
                const isCpu = stateClass === styles.cpu;
                const isIoServing = stateClass === styles.ioServing;

                const level = event?.levels?.[p.id];
                const showLevel =
                  level !== undefined &&
                  t <= currentTick &&
                  (stateClass === styles.cpu || stateClass === styles.waiting);

                return (
                  <div
                    key={t}
                    className={`${styles.cell ?? ''} ${stateClass}`}
                    data-testid={`gantt-cell-${p.id}-${String(t)}`}
                    data-state={stateClass.split(' ').pop() ?? ''}
                    title={`${p.id} - Tick ${String(t)}`}
                  >
                    {/* Renderizado de texto interno (Absolute) */}
                    {isCpu && (
                      <span className={styles.cpuText}>CPU</span>
                    )}
                    {isIoServing && (
                      <span className={styles.cpuText}>E/S</span>
                    )}

                    {showLevel && (
                      <span className={styles.levelBadge} aria-hidden="true">
                        L{level}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. Leyenda con bordes */}
      <div className={styles.legend} data-testid="gantt-legend">
        <div className={styles.legendItem}>
          <div className={`${styles.legendSwatch ?? ''} ${styles.swatchCpu ?? ''}`} />
          <span>Ejecución (CPU)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSwatch ?? ''} ${styles.swatchWaiting ?? ''}`} />
          <span>En Espera (Listo)</span>
        </div>
        <div className={styles.legendItem}>
          <div className={`${styles.legendSwatch ?? ''} ${styles.swatchIdle ?? ''}`} />
          <span>Inactivo (Vacío)</span>
        </div>
        {showIO && (
          <>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSwatch ?? ''} ${styles.swatchIoServing ?? ''}`} />
              <span>Bloqueado (E/S)</span>
            </div>
            <div className={styles.legendItem}>
              <div className={`${styles.legendSwatch ?? ''} ${styles.swatchIoWaiting ?? ''}`} />
              <span>Cola de E/S</span>
            </div>
          </>
        )}
      </div>
    </div>
  );
}