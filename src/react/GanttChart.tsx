import React from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/GanttChart.module.css';

// Paleta de 10 colores de alto contraste
const PALETTE = [
  '#e6194b', '#3cb44b', '#4363d8', '#f58231', '#911eb4',
  '#42d4f4', '#f032e6', '#bfef45', '#fabed4', '#469990',
];

function getColor(index: number): string {
  return PALETTE[index % PALETTE.length] ?? '#888888';
}

type CellState = 'cpu' | 'waiting' | 'not-arrived' | 'idle';

function cellBackground(state: CellState, color: string): string {
  switch (state) {
    case 'cpu':        return color;
    case 'waiting':    return `${color}55`;
    case 'idle':       return '#aaaaaa';
    case 'not-arrived': return '#eeeeee';
  }
}

export function GanttChart() {
  const { result, tick, currentEvent, processes } = useSimulation();

  if (result === null || processes.length === 0) {
    return <div className={styles.container}><p>Sin datos.</p></div>;
  }

  const history = result.history;
  const visibleTicks = tick + 1;
  const pids = processes.map(p => p.id);
  const colorMap = new Map(pids.map((pid, i) => [pid, getColor(i)]));

  function getCellState(pid: string, t: number): CellState {
    const event = history[t];
    if (event === undefined) return 'not-arrived';
    if (event.completed.includes(pid)) return 'not-arrived';
    if (event.onCPU === pid) return 'cpu';
    if (event.ready.includes(pid)) return 'waiting';
    if (event.onCPU === null && event.ready.length === 0) return 'idle';
    return 'not-arrived';
  }

  function isIdleTick(t: number): boolean {
    return history[t]?.onCPU === null;
  }

  const message = currentEvent?.message ?? '';

  return (
    <div className={styles.container}>
      <p className={styles.message}>{message}</p>
      <table className={styles.matrix}>
        <thead>
          <tr>
            <th className={styles.pidHeader}></th>
            {Array.from({ length: visibleTicks }, (_, t) => (
              <th key={t}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {pids.map(pid => {
            const color = colorMap.get(pid) ?? '#888';
            return (
              <tr key={pid}>
                <th className={styles.pidHeader}>{pid}</th>
                {Array.from({ length: visibleTicks }, (_, t) => {
                  const state = getCellState(pid, t);
                  const bg = isIdleTick(t) && state === 'not-arrived'
                    ? '#aaaaaa'
                    : cellBackground(state, color);
                  return <td key={t} style={{ backgroundColor: bg }}></td>;
                })}
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className={styles.legend}>
        <strong>Leyenda</strong>
        <table>
          <thead>
            <tr>
              <th>Proceso</th>
              <th>Inactivo</th>
              <th>En espera</th>
              <th>En CPU</th>
            </tr>
          </thead>
          <tbody>
            {pids.map(pid => {
              const color = colorMap.get(pid) ?? '#888';
              return (
                <tr key={pid}>
                  <th>{pid}</th>
                  <td style={{ backgroundColor: '#aaaaaa' }}></td>
                  <td style={{ backgroundColor: `${color}55` }}></td>
                  <td style={{ backgroundColor: color }}></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
