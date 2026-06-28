// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
// Registrar los algoritmos antes de los tests
import '../../src/index.js';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue } from '../../src/react/SimulationContext.js';
import { AlgorithmParamsForm } from '../../src/react/AlgorithmParamsForm.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
import type { Process } from '../../src/core/types/process.js';

const PROCS: readonly Process[] = [
  { id: 'A', arrival_time: 0, burst_time: 4 },
  { id: 'B', arrival_time: 0, burst_time: 2 },
];

function makeValue(
  overrides: Partial<SimulationContextValue> = {},
): SimulationContextValue {
  const result = run(PROCS, { algorithm: 'fcfs' });
  const player = new Player(result.history);
  const updateParams = vi.fn();
  return {
    result,
    currentEvent: result.history[0],
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
    updateParams,
    createWhatIf: () => undefined,
    discardWhatIf: () => undefined,
    reset: () => undefined,
    ...overrides,
  };
}

function renderForm(overrides: Partial<SimulationContextValue> = {}) {
  const value = makeValue(overrides);
  render(
    <SimulationCtx.Provider value={value}>
      <AlgorithmParamsForm />
    </SimulationCtx.Provider>,
  );
  return value;
}

describe('§ AlgorithmParamsForm — edición de parámetros', () => {
  afterEach(() => {
    cleanup();
  });

  it('no se renderiza si el algoritmo no tiene parámetros configurables', () => {
    renderForm({ requires: {} });
    expect(screen.queryByTestId('algorithm-params-form')).not.toBeInTheDocument();
  });

  it('se renderiza cuando requires.quantum es true', () => {
    renderForm({ requires: { quantum: true }, algorithmName: 'round-robin', params: { quantum: 2 } });
    expect(screen.getByTestId('algorithm-params-form')).toBeInTheDocument();
  });

  it('muestra input de quantum cuando requires.quantum es true', () => {
    renderForm({ requires: { quantum: true }, algorithmName: 'round-robin', params: { quantum: 2 } });
    expect(screen.getByTestId('input-quantum')).toBeInTheDocument();
  });

  it('el botón Aplicar está deshabilitado antes de editar', () => {
    renderForm({ requires: { quantum: true }, algorithmName: 'round-robin', params: { quantum: 2 } });
    const btn = screen.getByTestId('apply-params-button');
    expect(btn).toBeDisabled();
  });

  it('el botón Aplicar se habilita al editar un campo', () => {
    renderForm({ requires: { quantum: true }, algorithmName: 'round-robin', params: { quantum: 2 } });
    const input = screen.getByTestId('input-quantum');
    fireEvent.change(input, { target: { value: '4' } });
    const btn = screen.getByTestId('apply-params-button');
    expect(btn).not.toBeDisabled();
  });

  it('Aplicar llama a updateParams con los valores parseados', () => {
    const value = renderForm({ requires: { quantum: true }, algorithmName: 'round-robin', params: { quantum: 2 } });
    const input = screen.getByTestId('input-quantum');
    fireEvent.change(input, { target: { value: '4' } });
    const btn = screen.getByTestId('apply-params-button');
    fireEvent.click(btn);
    const calls = (value.updateParams as ReturnType<typeof vi.fn>).mock.calls;
    expect(calls.length).toBe(1);
    const passedParams = calls[0]?.[0] as Record<string, unknown>;
    expect(passedParams.quantum).toBe(4);
  });

  it('muestra error con quantum inválido (0) y no llama updateParams', () => {
    const value = renderForm({ requires: { quantum: true }, algorithmName: 'round-robin', params: { quantum: 2 } });
    const input = screen.getByTestId('input-quantum');
    fireEvent.change(input, { target: { value: '0' } });
    const btn = screen.getByTestId('apply-params-button');
    fireEvent.click(btn);
    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect((value.updateParams as ReturnType<typeof vi.fn>).mock.calls.length).toBe(0);
  });

  it('boostInterval vacío resulta en params sin boostInterval', () => {
    const value = renderForm({ requires: { quantum: true }, algorithmName: 'mlfq', params: { quantum: 2 } });
    const quantumInput = screen.getByTestId('input-quantum');
    fireEvent.change(quantumInput, { target: { value: '3' } });
    const btn = screen.getByTestId('apply-params-button');
    fireEvent.click(btn);
    const calls = (value.updateParams as ReturnType<typeof vi.fn>).mock.calls;
    const passedParams = calls[0]?.[0] as Record<string, unknown>;
    expect('boostInterval' in passedParams).toBe(false);
  });
});
