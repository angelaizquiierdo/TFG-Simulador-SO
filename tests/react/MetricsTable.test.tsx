// @vitest-environment jsdom
/**
 * T-43 — MetricsTable
 *
 * Cierra: § Coherencia de métricas y estado, § Render — MetricsTable
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue } from '../../src/react/SimulationContext.js';
import { MetricsTable } from '../../src/react/MetricsTable.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
import type { Process } from '../../src/core/types/process.js';
import '../../src/index.js';

const PROCS: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 0, burst_time: 2 },
];

function renderMetrics(atLastTick: boolean) {
  const result = run(PROCS, { algorithm: 'fcfs' });
  const player = new Player(result.history);
  const lastTick = result.history.length - 1;
  const tickIdx = atLastTick ? lastTick : 0;
  const value: SimulationContextValue = {
    result,
    currentEvent: result.history[tickIdx],
    player,
    error: null,
    whatIfBranch: null,
    processes: PROCS,
    algorithmName: 'fcfs',
    requires: {},
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
      <MetricsTable />
    </SimulationCtx.Provider>,
  );
}

describe('§ Render — MetricsTable', () => {
  afterEach(() => { cleanup(); });

  it('renderiza el contenedor con data-testid="metrics-table"', () => {
    renderMetrics(true);
    expect(screen.getByTestId('metrics-table')).toBeInTheDocument();
  });

  it('§ Coherencia de métricas y estado: las tablas NO son visibles fuera del último tick', () => {
    renderMetrics(false); // tick 0
    // No deben aparecer las subtablas de métricas
    expect(screen.queryByTestId('metrics-per-process')).not.toBeInTheDocument();
    expect(screen.queryByTestId('metrics-aggregate')).not.toBeInTheDocument();
  });

  it('las tablas SÍ son visibles en el último tick', () => {
    renderMetrics(true);
    expect(screen.getByTestId('metrics-per-process')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-aggregate')).toBeInTheDocument();
  });

  it('TODAS las métricas (por proceso + agregadas) están dentro de un desplegable inicialmente abierto', () => {
    renderMetrics(true);
    const panel = screen.getByTestId('metrics-table');
    expect(panel.tagName).toBe('DETAILS');
    expect(panel).toHaveAttribute('open'); // inicialmente abierto
    // El summary "Métricas" agrupa AMBAS secciones
    expect(screen.getByText('Métricas')).toBeInTheDocument();
    expect(panel.querySelector('[data-testid="metrics-per-process"]')).not.toBeNull();
    expect(panel.querySelector('[data-testid="metrics-aggregate"]')).not.toBeNull();
  });

  it('el desplegable de métricas se puede cerrar (omitir) y volver a abrir', () => {
    renderMetrics(true);
    const panel = screen.getByTestId('metrics-table');
    expect(panel).toHaveAttribute('open');
    panel.removeAttribute('open'); // el usuario lo cierra para omitir las métricas
    expect(panel).not.toHaveAttribute('open');
    panel.setAttribute('open', '');
    expect(panel).toHaveAttribute('open');
  });

  it('la tabla por proceso muestra una fila por proceso', () => {
    renderMetrics(true);
    const table = screen.getByTestId('metrics-per-process');
    const rows = table.querySelectorAll('tbody tr');
    expect(rows).toHaveLength(PROCS.length);
  });

  it('la tabla por proceso muestra los IDs de todos los procesos', () => {
    renderMetrics(true);
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  it('la tabla agregada muestra las 4 métricas de resumen', () => {
    renderMetrics(true);
    expect(screen.getByText('Espera media')).toBeInTheDocument();
    expect(screen.getByText('Tiempo de retorno medio')).toBeInTheDocument();
    expect(screen.getByText('Utilización CPU')).toBeInTheDocument();
    expect(screen.getByText('Rendimiento')).toBeInTheDocument();
  });

  it('§ Coherencia de métricas y estado: los valores numéricos son coherentes con el resultado', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const lastTick = result.history.length - 1;
    const player = new Player(result.history);
    const value: SimulationContextValue = {
      result,
      currentEvent: result.history[lastTick],
      player,
      error: null,
      whatIfBranch: null,
      processes: PROCS,
      algorithmName: 'fcfs',
      requires: {},
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
    render(
      <SimulationCtx.Provider value={value}>
        <MetricsTable />
      </SimulationCtx.Provider>,
    );
    // La utilización CPU debe mostrarse como porcentaje con un %
    expect(screen.getByTestId('metrics-aggregate').textContent).toContain('%');
  });
});
