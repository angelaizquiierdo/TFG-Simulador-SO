// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
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

  it('muestra botón "Crear rama what-if" cuando no hay rama activa', () => {
    renderAtTick(2);
    expect(screen.getByTestId('create-whatif-button')).toBeInTheDocument();
  });

  it('el botón "Crear rama what-if" llama a createWhatIf', () => {
    const value = renderAtTick(2);
    const btn = screen.getByTestId('create-whatif-button');
    fireEvent.click(btn);
    expect((value.createWhatIf as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('muestra botón "Descartar rama" cuando hay rama activa', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const branch: WhatIfBranch = { result, player };
    renderAtTick(2, { whatIfBranch: branch });
    expect(screen.getByTestId('discard-whatif-button')).toBeInTheDocument();
    expect(screen.getByTestId('whatif-branch-indicator')).toBeInTheDocument();
  });

  it('el botón "Descartar rama" llama a discardWhatIf', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const branch: WhatIfBranch = { result, player };
    const value = renderAtTick(2, { whatIfBranch: branch });
    const btn = screen.getByTestId('discard-whatif-button');
    fireEvent.click(btn);
    expect((value.discardWhatIf as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1);
  });

  it('no muestra "Crear rama" cuando ya hay rama activa', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const branch: WhatIfBranch = { result, player };
    renderAtTick(2, { whatIfBranch: branch });
    expect(screen.queryByTestId('create-whatif-button')).not.toBeInTheDocument();
  });
});
