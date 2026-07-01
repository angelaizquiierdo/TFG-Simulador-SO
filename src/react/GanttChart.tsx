import React from 'react';
import { useSimulation } from './SimulationContext.js';
import type { AlgorithmRequires } from './SimulationContext.js';
import type { History, HistoryEvent } from '../core/types/history.js';
import type { Process } from '../core/types/process.js';
import styles from './style/GanttChart.module.css';

/** Props opcionales del GanttChart; cada valor presente sobrescribe al del contexto. */
export interface GanttChartProps {
  readonly history?: History;
  readonly processes?: readonly Process[];
  readonly currentTick?: number;
  readonly requires?: AlgorithmRequires;
  readonly message?: string;
  /** Sobrescribe el data-testid raíz para distinguir varias instancias. */
  readonly testId?: string;
}

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

export function GanttChart(props: GanttChartProps = {}): React.ReactElement {
  const ctx = useSimulation();

  const history = props.history ?? ctx.result?.history ?? [];
  const processes = props.processes ?? ctx.processes;
  const requires = props.requires ?? ctx.requires;
  const totalTicks = history.length;
  const currentTick = props.currentTick ?? ctx.currentEvent?.tick ?? 0;
  const message = props.message ?? ctx.currentEvent?.message ?? '';
  const showIO = requires.io === true;
  const testId = props.testId ?? 'gantt-chart';

  const ticks = Array.from({ length: totalTicks }, (_, i) => i);

  return (
    <div className={styles.chart} data-testid={testId}>
      {/* 1. Mensaje del tick actual */}
      <div className={styles.message} data-testid="gantt-message">
        <span className={styles.messageTick}>Tick {String(currentTick)}</span>
        {message}
      </div>

      {/* 2. Matriz */}
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
                const isIoWaiting = stateClass === styles.ioWaiting;

                const level = event?.levels?.[p.id];
                const hasLevel = level !== undefined && t <= currentTick;
                const cpuLabel = isCpu && hasLevel ? `CPU${String(level)}` : 'CPU';
                const showLevelBadge = hasLevel && stateClass === styles.waiting;

                return (
                  <div
                    key={t}
                    className={`${styles.cell ?? ''} ${stateClass}`}
                    data-testid={`gantt-cell-${p.id}-${String(t)}`}
                    data-state={stateClass.split(' ').pop() ?? ''}
                    title={`${p.id} - Tick ${String(t)}`}
                  >
                    {isCpu && (
                      <span className={styles.cpuText}>{cpuLabel}</span>
                    )}
                    {isIoServing && (
                      <span className={styles.ioText}>E/S</span>
                    )}
                    {isIoWaiting && (
                      <span className={styles.ioQueueText}>L(E/S)</span>
                    )}

                    {showLevelBadge && (
                      <span className={styles.levelBadge} aria-hidden="true">
                        L{String(level)}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      {/* 3. Leyenda */}
      <div className={styles.legend} data-testid="gantt-legend">
        <span className={styles.legendTitle}>Leyenda</span>
        <div className={styles.legendItems}>
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
                <span className={styles.legendSwatch} aria-hidden="true">E/S</span>
                <span>Bloqueado (E/S)</span>
              </div>
              <div className={styles.legendItem}>
                <span className={styles.legendSwatch} aria-hidden="true">L(E/S)</span>
                <span>Cola de E/S</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}