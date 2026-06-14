// T-27 — Diagrama de Gantt como matriz (filas=procesos, columnas=ticks)
import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/GanttChart.module.css';

const PALETTE_SOLID = [
  '#4e79a7', '#f28e2b', '#e15759', '#76b7b2',
  '#59a14f', '#edc948', '#b07aa1', '#ff9da7',
  '#9c755f', '#bab0ac',
];

const PALETTE_LIGHT = [
  '#aec6e8', '#fbc98d', '#f5aeaf', '#c0e0de',
  '#a8d4a3', '#f7e8a0', '#d8bcd3', '#ffd4db',
  '#d4c0b5', '#e0dcd9',
];

type CellState = 'cpu' | 'ready' | 'pending' | 'completed' | 'idle';

function getCellState(
  pid: string,
  tickIndex: number,
  result: ReturnType<typeof useSimulation>['result'],
): CellState {
  if (result === null) return 'pending';
  const event = result.history[tickIndex];
  if (event === undefined) return 'pending';
  if (event.onCPU === null && !event.ready.includes(pid) && !event.completed.includes(pid)) {
    // Tick con CPU inactiva — si el proceso no participa
    if (!event.pending.includes(pid)) return 'idle';
    return 'pending';
  }
  if (event.onCPU === pid) return 'cpu';
  if (event.ready.includes(pid)) return 'ready';
  if (event.completed.includes(pid)) return 'completed';
  if (event.pending.includes(pid)) return 'pending';
  // CPU inactiva y el proceso no está en ninguna cola
  return 'idle';
}

export function GanttChart(): React.ReactElement {
  const { result, processes, tick } = useSimulation();

  // Columnas: 0..tick
  const cols = Array.from({ length: tick + 1 }, (_, i) => i);

  return (
    <div className={styles.wrapper}>
      <table className={styles.table}>
        <thead>
          <tr>
            <th className={styles.cornerCell}></th>
            {cols.map((t) => (
              <th key={t} className={styles.tickHeader}>{String(t)}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processes.map((p, pidx) => {
            const solid = PALETTE_SOLID[pidx % PALETTE_SOLID.length] ?? '#999';
            const light = PALETTE_LIGHT[pidx % PALETTE_LIGHT.length] ?? '#eee';
            return (
              <tr key={p.id}>
                <td className={styles.pidCell}>{p.id}</td>
                {cols.map((t) => {
                  const state = getCellState(p.id, t, result);
                  const event = result?.history[t];
                  const isIdleTick = event?.onCPU === null;

                  let bg = 'transparent';
                  let label = '';
                  if (isIdleTick && state !== 'cpu' && state !== 'ready') {
                    bg = '#d0d0d0';
                    label = '';
                  } else if (state === 'cpu') {
                    bg = solid;
                    label = 'CPU';
                  } else if (state === 'ready') {
                    bg = light;
                    label = 'W';
                  } else if (state === 'completed') {
                    bg = '#e0e0e0';
                    label = '';
                  }

                  return (
                    <td
                      key={t}
                      className={styles.cell}
                      style={{ backgroundColor: bg }}
                      data-state={state}
                      data-pid={p.id}
                      data-tick={String(t)}
                      aria-label={`${p.id} tick ${String(t)}: ${state}`}
                    >
                      {label}
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
