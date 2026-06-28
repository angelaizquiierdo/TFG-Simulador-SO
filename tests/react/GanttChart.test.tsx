// @vitest-environment jsdom
/**
 * T-41 — GanttChart
 *
 * Cierra: § Render — GanttChart (todos los criterios v02)
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue } from '../../src/react/SimulationContext.js';
import { GanttChart } from '../../src/react/GanttChart.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
import type { Process } from '../../src/core/types/process.js';
import '../../src/index.js';

const PROCS_FCFS: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 2 },
  { id: 'P2', arrival_time: 0, burst_time: 3 },
];

/** Construye un contexto con resultado de FCFS y lo renderiza en el GanttChart */
function renderGantt(
  processes: readonly Process[],
  algorithm = 'fcfs',
  tickOverride?: number,
  requiresOverride?: SimulationContextValue['requires'],
) {
  const result = run(processes, { algorithm });
  const player = new Player(result.history);
  const tick = tickOverride ?? result.history.length - 1;
  const currentEvent = result.history[tick];
  const value: SimulationContextValue = {
    result,
    currentEvent,
    player,
    error: null,
    whatIfBranch: null,
    processes,
    algorithmName: algorithm,
    requires: requiresOverride ?? {},
    createWhatIf: () => undefined,
    discardWhatIf: () => undefined,
  };
  return render(
    <SimulationCtx.Provider value={value}>
      <GanttChart />
    </SimulationCtx.Provider>,
  );
}

describe('§ Render — GanttChart', () => {
  afterEach(() => { cleanup(); });

  // ── Estructura básica ──────────────────────────────────────────────────────

  it('renderiza el contenedor raíz con data-testid="gantt-chart"', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
  });

  it('renderiza la fila de cabecera con números de tick', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-header')).toBeInTheDocument();
    // FCFS P1(2) + P2(3) = 5 ticks → números 0..4
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renderiza exactamente una fila por proceso (sin filas artificiales)', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-row-P1')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-row-P2')).toBeInTheDocument();
    // No debe haber fila 'Idle' ni 'Inactivo' adicional
    expect(screen.queryByTestId('gantt-row-Idle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gantt-row-Inactivo')).not.toBeInTheDocument();
  });

  it('las etiquetas de las filas muestran el ID del proceso', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  // ── Celdas sin texto ───────────────────────────────────────────────────────

  it('las celdas de la grilla no contienen texto', () => {
    renderGantt(PROCS_FCFS);
    // Todas las celdas con data-testid "gantt-cell-*"
    const cells = screen.getAllByRole('generic').filter(
      (el) => el.dataset.testid?.startsWith('gantt-cell-') === true,
    );
    expect(cells.length).toBeGreaterThan(0);
    cells.forEach((cell) => {
      expect(cell.textContent).toBe('');
    });
  });

  // ── Clases de estado ───────────────────────────────────────────────────────

  it('la celda de P1 en tick 0 tiene estado cpu', () => {
    // FCFS: P1[0-2], P2[2-5]. En tick 0 P1 está en CPU.
    renderGantt(PROCS_FCFS, 'fcfs', 0);
    const cell = screen.getByTestId('gantt-cell-P1-0');
    expect(cell.className).toContain('cpu');
  });

  it('la celda de P2 en tick 0 tiene estado waiting (en cola de listos)', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0);
    const cell = screen.getByTestId('gantt-cell-P2-0');
    expect(cell.className).toContain('waiting');
  });

  it('la celda de P1 en tick 2 tiene estado empty (P1 completó en tick 2)', () => {
    // P1 completa en tick 2 → celda vacía
    renderGantt(PROCS_FCFS, 'fcfs', 2);
    const cell = screen.getByTestId('gantt-cell-P1-2');
    // En tick 2 P1 ya está en completed y P2 empieza en CPU
    expect(cell.className).toContain('empty');
  });

  it('celdas de ticks futuros al tick actual tienen estado empty (no reveladas)', () => {
    // Con currentTick=0, el tick 4 (futuro) debe ser empty
    renderGantt(PROCS_FCFS, 'fcfs', 0);
    const futureCell = screen.getByTestId('gantt-cell-P1-4');
    expect(futureCell.className).toContain('empty');
  });

  // ── Variable CSS --process-color ──────────────────────────────────────────

  it('la fila de P1 recibe --process-color como variable CSS en línea', () => {
    renderGantt(PROCS_FCFS);
    const row = screen.getByTestId('gantt-row-P1');
    // El estilo inline debe contener --process-color
    expect(row.style.getPropertyValue('--process-color')).toBeTruthy();
  });

  it('cada fila de proceso recibe un color distinto', () => {
    renderGantt(PROCS_FCFS);
    const rowP1 = screen.getByTestId('gantt-row-P1');
    const rowP2 = screen.getByTestId('gantt-row-P2');
    const colorP1 = rowP1.style.getPropertyValue('--process-color');
    const colorP2 = rowP2.style.getPropertyValue('--process-color');
    expect(colorP1).not.toBe(colorP2);
  });

  // ── Mensaje ────────────────────────────────────────────────────────────────

  it('renderiza el área de mensaje', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-message')).toBeInTheDocument();
  });

  it('el mensaje refleja el HistoryEvent del tick actual', () => {
    const result = run(PROCS_FCFS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const tick0Event = result.history[0];
    const value: SimulationContextValue = {
      result,
      currentEvent: tick0Event,
      player,
      error: null,
      whatIfBranch: null,
      processes: PROCS_FCFS,
      algorithmName: 'fcfs',
      requires: {},
      createWhatIf: () => undefined,
      discardWhatIf: () => undefined,
    };
    render(
      <SimulationCtx.Provider value={value}>
        <GanttChart />
      </SimulationCtx.Provider>,
    );
    const msg = tick0Event?.message ?? '';
    if (msg !== '') {
      expect(screen.getByTestId('gantt-message').textContent).toBe(msg);
    }
  });

  // ── Leyenda ────────────────────────────────────────────────────────────────

  it('renderiza la leyenda con los tres estados base', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0, {});
    expect(screen.getByTestId('gantt-legend')).toBeInTheDocument();
    expect(screen.getByText('Inactivo')).toBeInTheDocument();
    expect(screen.getByText('En espera')).toBeInTheDocument();
    expect(screen.getByText('En CPU')).toBeInTheDocument();
  });

  it('la leyenda NO muestra estados de E/S si !requires.io', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0, {});
    expect(screen.queryByText('En E/S')).not.toBeInTheDocument();
    expect(screen.queryByText('Esperando E/S')).not.toBeInTheDocument();
  });

  it('la leyenda muestra estados de E/S si requires.io = true', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0, { io: true });
    expect(screen.getByText('En E/S')).toBeInTheDocument();
    expect(screen.getByText('Esperando E/S')).toBeInTheDocument();
  });

  // ── Estado idle ────────────────────────────────────────────────────────────

  it('celdas en tick de CPU inactiva reciben estado idle', () => {
    // Proceso que llega tarde para crear hueco de CPU inactiva
    const withGap: readonly Process[] = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
    ];
    renderGantt(withGap, 'fcfs', 1); // tick 1: CPU inactiva
    const cell = screen.getByTestId('gantt-cell-P1-1');
    // P1 aún está en pending, CPU inactiva → idle
    expect(cell.className).toContain('idle');
  });

  // ── Tamaño fijo ────────────────────────────────────────────────────────────

  it('el número total de celdas es totalTicks × procesos (tamaño fijo desde el inicio)', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0); // currentTick=0 pero todas las celdas deben existir
    const result = run(PROCS_FCFS, { algorithm: 'fcfs' });
    const totalTicks = result.history.length;
    const totalCells = PROCS_FCFS.length * totalTicks;
    const cells = screen.getAllByRole('generic').filter(
      (el) => el.dataset.testid?.startsWith('gantt-cell-') === true,
    );
    expect(cells.length).toBe(totalCells);
  });
});
