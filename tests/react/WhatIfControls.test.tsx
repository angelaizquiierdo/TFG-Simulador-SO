// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
// Registrar los algoritmos antes de los tests
import '../../src/index.js';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue, WhatIfBranch } from '../../src/react/SimulationContext.js';
import { WhatIfControls } from '../../src/react/WhatIfControls.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
import type { Process } from '../../src/core/types/process.js';

const PROCS: readonly Process[] = [
  { id: 'A', arrival_time: 0, burst_time: 4 },
  { id: 'B', arrival_time: 0, burst_time: 2 },
];

function makeValue(
  tickIndex: number,
  overrides: Partial<SimulationContextValue> = {},
): SimulationContextValue {
  const result = run(PROCS, { algorithm: 'fcfs' });
  const player = new Player(result.history);
  const createWhatIf = vi.fn();
  const discardWhatIf = vi.fn();
  return {
    result,
    currentEvent: result.history[tickIndex],
    player,
    error: null,
    whatIfBranch: null,
    processes: PROCS,
    algorithmName: 'fcfs',
    params: {},
    requires: {},
    stepForward: () => undefined,
    stepBackward: () => undefined,
    seekTo: () => undefined,
    updateProcesses: () => undefined,
    updateParams: () => undefined,
    createWhatIf,
    discardWhatIf,
    reset: () => undefined,
    ...overrides,
  };
}

function renderAtTick(tickIndex: number, overrides: Partial<SimulationContextValue> = {}) {
  const value = makeValue(tickIndex, overrides);
  render(
    <SimulationCtx.Provider value={value}>
      <WhatIfControls />
    </SimulationCtx.Provider>,
  );
  return value;
}

describe('§ WhatIfControls — rama what-if', () => {
  afterEach(() => {
    cleanup();
  });

  it('no se renderiza en tick 0', () => {
    renderAtTick(0);
    expect(screen.queryByTestId('whatif-controls')).not.toBeInTheDocument();
  });

  it('no se renderiza en el último tick', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const lastTick = result.history.length - 1;
    renderAtTick(lastTick);
    expect(screen.queryByTestId('whatif-controls')).not.toBeInTheDocument();
  });

  it('se renderiza en tick intermedio', () => {
    renderAtTick(2);
    expect(screen.getByTestId('whatif-controls')).toBeInTheDocument();
  });

  it('muestra el formulario de variación cuando no hay rama activa', () => {
    renderAtTick(2);
    expect(screen.getByTestId('whatif-form')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-algorithm-select')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-compare-button')).toBeInTheDocument();
  });

  it('el selector de algoritmo lista los algoritmos registrados', () => {
    renderAtTick(2);
    const select = screen.getByTestId('whatif-algorithm-select');
    // Hay al menos varios algoritmos registrados desde src/index.ts
    expect(select.querySelectorAll('option').length).toBeGreaterThan(1);
  });

  it('al elegir round-robin aparece el campo quantum', () => {
    renderAtTick(2);
    fireEvent.change(screen.getByTestId('whatif-algorithm-select'), {
      target: { value: 'round-robin' },
    });
    expect(screen.getByTestId('whatif-input-quantum')).toBeInTheDocument();
  });

  it('"Comparar" llama a createWhatIf con el algoritmo elegido', () => {
    const value = renderAtTick(2);
    fireEvent.change(screen.getByTestId('whatif-algorithm-select'), {
      target: { value: 'sjf' },
    });
    fireEvent.click(screen.getByTestId('whatif-compare-button'));
    const mock = value.createWhatIf as ReturnType<typeof vi.fn>;
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0]?.[0]).toMatchObject({ algorithm: 'sjf' });
  });

  it('un quantum inválido bloquea la comparación y muestra error', () => {
    const value = renderAtTick(2);
    fireEvent.change(screen.getByTestId('whatif-algorithm-select'), {
      target: { value: 'round-robin' },
    });
    fireEvent.change(screen.getByTestId('whatif-input-quantum'), {
      target: { value: '-3' },
    });
    fireEvent.click(screen.getByTestId('whatif-compare-button'));
    expect((value.createWhatIf as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('al elegir mlfq aparecen los campos de quanta por nivel y boost', () => {
    renderAtTick(2);
    fireEvent.change(screen.getByTestId('whatif-algorithm-select'), {
      target: { value: 'mlfq' },
    });
    expect(screen.getByTestId('whatif-input-quantum-0')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-input-quantum-1')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-input-boost')).toBeInTheDocument();
  });

  it('un quantum de nivel inválido bloquea la comparación de mlfq', () => {
    const value = renderAtTick(2);
    fireEvent.change(screen.getByTestId('whatif-algorithm-select'), {
      target: { value: 'mlfq' },
    });
    fireEvent.change(screen.getByTestId('whatif-input-quantum-0'), {
      target: { value: '0' },
    });
    fireEvent.click(screen.getByTestId('whatif-compare-button'));
    expect((value.createWhatIf as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
    expect(screen.getByRole('alert')).toBeInTheDocument();
  });

  it('mlfq con quanta y boost válidos llama a createWhatIf con esos params', () => {
    const value = renderAtTick(2);
    fireEvent.change(screen.getByTestId('whatif-algorithm-select'), {
      target: { value: 'mlfq' },
    });
    fireEvent.change(screen.getByTestId('whatif-input-quantum-0'), { target: { value: '3' } });
    fireEvent.change(screen.getByTestId('whatif-input-quantum-1'), { target: { value: '5' } });
    fireEvent.change(screen.getByTestId('whatif-input-boost'), { target: { value: '10' } });
    fireEvent.click(screen.getByTestId('whatif-compare-button'));
    const mock = value.createWhatIf as ReturnType<typeof vi.fn>;
    expect(mock.mock.calls.length).toBe(1);
    expect(mock.mock.calls[0]?.[0]).toMatchObject({
      algorithm: 'mlfq',
      params: { quanta: [3, 5], boostInterval: 10 },
    });
  });

  it('con rama activa muestra la tabla comparativa y el botón de descartar', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const branch: WhatIfBranch = { result, player, algorithm: 'fcfs' };
    renderAtTick(2, { whatIfBranch: branch });
    expect(screen.getByTestId('whatif-comparison')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-branch-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('discard-whatif-button')).toBeInTheDocument();
  });

  it('con rama activa no se muestra el formulario de variación', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const branch: WhatIfBranch = { result, player, algorithm: 'fcfs' };
    renderAtTick(2, { whatIfBranch: branch });
    expect(screen.queryByTestId('whatif-form')).not.toBeInTheDocument();
  });

  it('"Descartar rama" llama a discardWhatIf', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const branch: WhatIfBranch = { result, player, algorithm: 'fcfs' };
    const value = renderAtTick(2, { whatIfBranch: branch });
    fireEvent.click(screen.getByTestId('discard-whatif-button'));
    expect((value.discardWhatIf as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });
});

describe('§ WhatIfControls — comparación desplegable (Gantt + métricas)', () => {
  afterEach(() => {
    cleanup();
  });

  // Rama SJF frente al escenario actual FCFS sobre PROCS (A burst 4, B burst 2).
  function renderWithBranch() {
    const result = run(PROCS, { algorithm: 'sjf' });
    const branch: WhatIfBranch = { result, player: new Player(result.history), algorithm: 'sjf' };
    return renderAtTick(2, { whatIfBranch: branch });
  }

  it('con rama activa muestra las tres secciones desplegables', () => {
    renderWithBranch();
    expect(screen.getByTestId('whatif-gantt-comparison')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-comparison-per-process')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-comparison-aggregate')).toBeInTheDocument();
  });

  it('el indicador de rama usa el título "Comparar"', () => {
    renderWithBranch();
    expect(screen.getByTestId('whatif-branch-indicator').textContent).toContain('Comparar');
  });

  it('la tabla agregada etiqueta las columnas con el algoritmo actual y "Comparado con <rama>"', () => {
    renderWithBranch(); // actual = fcfs, rama = sjf
    const aggregate = screen.getByTestId('whatif-comparison');
    expect(within(aggregate).getByText('fcfs')).toBeInTheDocument();
    expect(within(aggregate).getByText('Comparado con sjf')).toBeInTheDocument();
  });

  it('los diagramas de Gantt se etiquetan con el algoritmo actual y la rama', () => {
    renderWithBranch();
    expect(within(screen.getByTestId('whatif-gantt-actual')).getByText('fcfs')).toBeInTheDocument();
    expect(
      within(screen.getByTestId('whatif-gantt-branch')).getByText('Comparado con sjf'),
    ).toBeInTheDocument();
  });

  it('la comparación de Gantt renderiza el diagrama actual y el de la rama', () => {
    renderWithBranch();
    expect(screen.getByTestId('whatif-gantt-actual-chart')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-gantt-branch-chart')).toBeInTheDocument();
  });

  it('la tabla por proceso tiene una fila por proceso', () => {
    renderWithBranch();
    const table = screen.getByTestId('whatif-per-process-table');
    // 1 fila de cabecera + 1 por proceso (A, B)
    expect(within(table).getAllByRole('row').length).toBe(1 + PROCS.length);
  });

  it('la fila de A muestra los deltas correctos FCFS→SJF (espera +2, turnaround +2)', () => {
    renderWithBranch();
    const row = screen.getByTestId('whatif-per-process-row-A');
    const cells = within(row).getAllByRole('cell');
    // [Proceso, EsperaAct, EsperaSi, Δesp, TurnAct, TurnSi, Δturn]
    expect(cells.map((c) => c.textContent)).toEqual(['A', '0', '2', '+2', '4', '6', '+2']);
  });

  it('la fila de B muestra los deltas correctos FCFS→SJF (espera -4, turnaround -4)', () => {
    renderWithBranch();
    const row = screen.getByTestId('whatif-per-process-row-B');
    const cells = within(row).getAllByRole('cell');
    expect(cells.map((c) => c.textContent)).toEqual(['B', '4', '0', '-4', '6', '2', '-4']);
  });

  it('la tabla agregada conserva su testid y muestra la columna Δ', () => {
    renderWithBranch();
    const aggregate = screen.getByTestId('whatif-comparison');
    expect(within(aggregate).getByText('Δ')).toBeInTheDocument();
  });
});
