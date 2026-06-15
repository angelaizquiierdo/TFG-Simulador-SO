import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/GanttChart.module.css';

// Paleta de 12 colores de alto contraste
const PALETTE = [
  '#e63946', '#457b9d', '#2a9d8f', '#e9c46a', '#f4a261',
  '#6d6875', '#118ab2', '#06d6a0', '#ffd166', '#ef476f',
  '#073b4c', '#8338ec',
];

function getColor(index: number): string {
  return PALETTE[index % PALETTE.length] ?? '#999';
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${String(r)}, ${String(g)}, ${String(b)}, ${String(alpha)})`;
}

const IDLE_COLOR = '#b0b0b0';
const WAITING_ALPHA = 0.3;
const NOT_ARRIVED_COLOR = '#e8e8e8';

type CellState = 'on-cpu' | 'waiting' | 'not-arrived' | 'idle' | 'completed';

function getCellState(
  pid: string,
  tickIdx: number,
  history: ReturnType<typeof useSimulation>['result'],
  arrivalTick: number,
): CellState {
  if (history === null) return 'not-arrived';
  const event = history.history[tickIdx];
  if (event === undefined) return 'not-arrived';

  if (tickIdx < arrivalTick) return 'not-arrived';
  if (event.completed.includes(pid) && event.onCPU !== pid) return 'completed';
  if (event.onCPU === pid) return 'on-cpu';
  if (event.ready.includes(pid)) return 'waiting';
  if (event.pending.includes(pid)) return 'not-arrived';
  // Proceso no ha llegado aún o ya completó
  if (event.completed.includes(pid)) return 'completed';
  return 'not-arrived';
}

function getCellBg(state: CellState, color: string): string {
  switch (state) {
    case 'on-cpu': return color;
    case 'waiting': return hexToRgba(color, WAITING_ALPHA);
    case 'idle': return IDLE_COLOR;
    case 'not-arrived': return NOT_ARRIVED_COLOR;
    case 'completed': return NOT_ARRIVED_COLOR;
  }
}

export function GanttChart(): React.ReactElement | null {
  const { result, processes, currentEvent } = useSimulation();

  if (result === null || processes.length === 0) return null;

  const currentTick = currentEvent?.tick ?? 0;
  const ticks = Array.from({ length: currentTick + 1 }, (_, i) => i);

  // Mapa pid → color
  const pidColors = new Map<string, string>(
    processes.map((p, i) => [p.id, getColor(i)]),
  );

  // Mapa pid → arrival_time
  const arrivalMap = new Map<string, number>(
    processes.map((p) => [p.id, p.arrival_time]),
  );

  return (
    <div className={styles.wrapper}>
      {/* Mensaje del evento */}
      <div className={styles.message}>{currentEvent?.message ?? ''}</div>

      {/* Matriz */}
      <div className={styles.matrixWrapper}>
        <table className={styles.matrix} aria-label="Diagrama de Gantt">
          <thead>
            <tr>
              <th className={styles.pidHeader}></th>
              {ticks.map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Fila de inactividad */}
            <tr>
              <th className={styles.pidHeader}>CPU</th>
              {ticks.map((t) => {
                const event = result.history[t];
                const isIdle = event?.onCPU === null;
                return (
                  <td
                    key={t}
                    style={{ backgroundColor: isIdle ? IDLE_COLOR : 'transparent' }}
                  />
                );
              })}
            </tr>
            {/* Filas de procesos */}
            {processes.map((p) => {
              const color = pidColors.get(p.id) ?? '#999';
              const arrival = arrivalMap.get(p.id) ?? 0;
              return (
                <tr key={p.id}>
                  <th className={styles.pidHeader}>{p.id}</th>
                  {ticks.map((t) => {
                    const state = getCellState(p.id, t, result, arrival);
                    return (
                      <td
                        key={t}
                        style={{ backgroundColor: getCellBg(state, color) }}
                      />
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Leyenda */}
      <div className={styles.legend}>
        <div className={styles.legendTitle}>Leyenda</div>
        <table className={styles.legendTable}>
          <thead>
            <tr>
              <th>Proceso</th>
              <th>Inactivo</th>
              <th>En espera</th>
              <th>En CPU</th>
            </tr>
          </thead>
          <tbody>
            {processes.map((p) => {
              const color = pidColors.get(p.id) ?? '#999';
              return (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td style={{ backgroundColor: IDLE_COLOR }} />
                  <td style={{ backgroundColor: hexToRgba(color, WAITING_ALPHA) }} />
                  <td style={{ backgroundColor: color }} />
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
