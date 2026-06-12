import React from 'react';
import { useSimulation } from './SimulationContext.js';

// Paleta de 10 colores para procesos (HSL uniformemente distribuidos)
const PALETTE = [
  '#e57373', '#f06292', '#ba68c8', '#7986cb',
  '#4fc3f7', '#4db6ac', '#81c784', '#fff176',
  '#ffb74d', '#a1887f',
];

const IDLE_COLOR = '#cccccc';
const WAITING_OPACITY = 0.35;

type CellState = 'not-arrived' | 'idle' | 'on-cpu' | 'waiting';

function getCellState(
  pid: string,
  tick: number,
  arrivalTime: number,
  onCPU: string | null,
  ready: readonly string[],
): CellState {
  if (tick < arrivalTime) return 'not-arrived';
  if (onCPU === null) return 'idle';
  if (onCPU === pid) return 'on-cpu';
  if (onCPU !== pid && tick >= arrivalTime) {
    // el proceso ya llegó: puede estar en ready o completed
    if (ready.includes(pid) || onCPU !== pid) return 'waiting';
  }
  return 'not-arrived';
}

export function GanttChart(): React.ReactElement {
  const { result, processes } = useSimulation();

  if (result === null || result.history.length === 0) {
    return <div>Sin datos de simulación.</div>;
  }

  const history = result.history;
  const totalTicks = history.length;

  // Asignar color a cada proceso por índice
  const colorMap = new Map<string, string>();
  processes.forEach((p, i) => {
    colorMap.set(p.id, PALETTE[i % PALETTE.length] ?? '#888888');
  });

  const cellSize = 28;
  const thStyle: React.CSSProperties = {
    border: '1px solid #ccc',
    padding: '2px 4px',
    textAlign: 'center',
    minWidth: cellSize,
    fontSize: 12,
  };

  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ borderCollapse: 'collapse', fontFamily: 'monospace' }}>
        <thead>
          <tr>
            <th style={{ ...thStyle, textAlign: 'left' }}>Proceso</th>
            {Array.from({ length: totalTicks }, (_, t) => (
              <th key={t} style={thStyle}>{t}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {processes.map((p) => {
            const color = colorMap.get(p.id) ?? '#888888';
            return (
              <tr key={p.id}>
                <td style={{ ...thStyle, textAlign: 'left', fontWeight: 'bold' }}>{p.id}</td>
                {Array.from({ length: totalTicks }, (_, t) => {
                  const event = history[t];
                  if (event === undefined) return <td key={t} style={thStyle} />;

                  const state = getCellState(
                    p.id,
                    t,
                    p.arrival_time,
                    event.onCPU,
                    event.ready,
                  );

                  let bg = 'transparent';
                  let label = '';

                  if (state === 'on-cpu') {
                    bg = color;
                    label = '█';
                  } else if (state === 'idle') {
                    // CPU inactiva — este tick la CPU estaba libre
                    // Para una fila de proceso, "idle" solo aplica si el proceso ya llegó
                    if (t >= p.arrival_time) {
                      // proceso llegó pero la CPU estaba inactiva — mostramos gris claro
                      bg = '#e0e0e0';
                    }
                  } else if (state === 'waiting') {
                    // Color claro del proceso
                    bg = color;
                    label = '·';
                  }
                  // state === 'not-arrived': transparent

                  return (
                    <td
                      key={t}
                      data-testid={`cell-${p.id}-${t.toString()}`}
                      data-state={state}
                      style={{
                        ...thStyle,
                        background: state === 'on-cpu' ? bg : state === 'idle' && t >= p.arrival_time ? IDLE_COLOR : state === 'waiting' ? `rgba(${hexToRgb(color)},${WAITING_OPACITY.toString()})` : 'transparent',
                        color: '#333',
                        fontSize: 10,
                      }}
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

// Convierte hex a "r,g,b" para rgba()
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `${r.toString()},${g.toString()},${b.toString()}`;
}
