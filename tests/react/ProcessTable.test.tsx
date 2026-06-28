// @vitest-environment jsdom
/**
 * T-40 — ProcessTable
 *
 * Cierra: § Página de algoritmo y campos declarados, § Render — ProcessTable
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue } from '../../src/react/SimulationContext.js';
import { ProcessTable } from '../../src/react/ProcessTable.js';
import type { Process } from '../../src/core/types/process.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
// Registrar los algoritmos antes de los tests
import '../../src/index.js';

const BASE_PROCESSES: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 4 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
  { id: 'P3', arrival_time: 2, burst_time: 6 },
];

/** Wrapper básico: usa SimulationProvider real */
function renderTable(algorithm: string, processes: readonly Process[]) {
  return render(
    <SimulationProvider algorithm={algorithm} processes={processes}>
      <ProcessTable />
    </SimulationProvider>,
  );
}

/** Wrapper con contexto personalizado para probar requires condicionales */
function renderWithRequires(
  processes: readonly Process[],
  requires: SimulationContextValue['requires'],
) {
  const result = run(processes, { algorithm: 'fcfs' });
  const player = new Player(result.history);
  const value: SimulationContextValue = {
    result,
    currentEvent: result.history[0],
    player,
    error: null,
    whatIfBranch: null,
    processes,
    algorithmName: 'fcfs',
    requires,
    params: {},
    stepForward: () => undefined,
    stepBackward: () => undefined,
    seekTo: () => undefined,
    updateProcesses: () => undefined,
    updateParams: () => undefined,
    createWhatIf: () => undefined,
    discardWhatIf: () => undefined,
    reset: () => undefined,
  };
  return render(
    <SimulationCtx.Provider value={value}>
      <ProcessTable />
    </SimulationCtx.Provider>,
  );
}

describe('§ Render — ProcessTable', () => {
  afterEach(() => { cleanup(); });

  it('renderiza un <table> con data-testid="process-table"', () => {
    renderTable('fcfs', BASE_PROCESSES);
    expect(screen.getByTestId('process-table')).toBeInTheDocument();
    expect(screen.getByTestId('process-table').tagName).toBe('TABLE');
  });

  it('muestra siempre las columnas base: ID, Llegada, Ráfaga', () => {
    renderTable('fcfs', BASE_PROCESSES);
    expect(screen.getByText('ID')).toBeInTheDocument();
    expect(screen.getByText('Llegada')).toBeInTheDocument();
    expect(screen.getByText('Ráfaga')).toBeInTheDocument();
  });

  it('renderiza una fila por cada proceso (cabecera + N procesos)', () => {
    renderTable('fcfs', BASE_PROCESSES);
    const rows = screen.getAllByRole('row');
    // 1 cabecera + 3 procesos = 4 filas
    expect(rows).toHaveLength(4);
  });

  it('muestra los IDs correctos en cada fila', () => {
    renderTable('fcfs', BASE_PROCESSES);
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
    expect(screen.getByText('P3')).toBeInTheDocument();
  });

  it('§ Página de algoritmo y campos declarados: NO muestra columna Prioridad si !requires.priority', () => {
    renderTable('fcfs', BASE_PROCESSES); // FCFS no declara requires.priority
    expect(screen.queryByText('Prioridad')).not.toBeInTheDocument();
  });

  it('muestra columna Prioridad si requires.priority = true', () => {
    const withPriority: readonly Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 5, priority: 7 },
      { id: 'P2', arrival_time: 1, burst_time: 3, priority: 9 },
    ];
    renderWithRequires(withPriority, { priority: true });
    expect(screen.getByText('Prioridad')).toBeInTheDocument();
    // Valores de prioridad únicos (7 y 9 no aparecen en llegada/ráfaga)
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('9')).toBeInTheDocument();
  });

  it('proceso sin priority muestra — en la celda de prioridad', () => {
    const mixed: readonly Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2 }, // sin priority
    ];
    renderWithRequires(mixed, { priority: true });
    // P2 debe mostrar — en la columna de prioridad
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('NO muestra columnas de E/S si !requires.io (FCFS)', () => {
    renderTable('fcfs', BASE_PROCESSES);
    expect(screen.queryByText('Entrada E/S')).not.toBeInTheDocument();
    expect(screen.queryByText('Tiempo E/S')).not.toBeInTheDocument();
    expect(screen.queryByText('Salida E/S')).not.toBeInTheDocument();
  });

  it('muestra columnas E/S (entrada, tiempo, salida derivada) si requires.io = true', () => {
    const withIO: readonly Process[] = [
      { id: 'A', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 3 }] },
      { id: 'B', arrival_time: 0, burst_time: 4 },
    ];
    renderWithRequires(withIO, { io: true });
    expect(screen.getByText('Entrada E/S')).toBeInTheDocument();
    expect(screen.getByText('Tiempo E/S')).toBeInTheDocument();
    expect(screen.getByText('Salida E/S')).toBeInTheDocument();
    // io_exit = io_entry + io_time = 2 + 3 = 5
    expect(screen.getByText('5')).toBeInTheDocument();
  });

  it('proceso sin operaciones de E/S muestra — en columnas de E/S', () => {
    const withIO: readonly Process[] = [
      { id: 'A', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 3 }] },
      { id: 'B', arrival_time: 0, burst_time: 4 }, // sin io
    ];
    renderWithRequires(withIO, { io: true });
    const dashes = screen.getAllByText('—');
    // Proceso B tiene 3 columnas de E/S con '—'
    expect(dashes.length).toBeGreaterThanOrEqual(3);
  });
});
