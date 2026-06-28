// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
// Registrar los algoritmos antes de los tests
import '../../src/index.js';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue } from '../../src/react/SimulationContext.js';
import { ProcessForm } from '../../src/react/ProcessForm.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
import type { Process } from '../../src/core/types/process.js';

const PROCS: readonly Process[] = [
  { id: 'A', arrival_time: 0, burst_time: 4 },
  { id: 'B', arrival_time: 1, burst_time: 2 },
];

function makeValue(overrides: Partial<SimulationContextValue> = {}): SimulationContextValue {
  const result = run(PROCS, { algorithm: 'fcfs' });
  const player = new Player(result.history);
  const updateProcesses = vi.fn();
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
    updateProcesses,
    updateParams,
    createWhatIf: () => undefined,
    discardWhatIf: () => undefined,
    ...overrides,
  };
}

function renderForm(overrides: Partial<SimulationContextValue> = {}) {
  const value = makeValue(overrides);
  render(
    <SimulationCtx.Provider value={value}>
      <ProcessForm />
    </SimulationCtx.Provider>,
  );
  return value;
}

async function openPanel(): Promise<void> {
  const toggle = screen.getByRole('button', { name: /procesos/i });
  await act(async () => {
    fireEvent.click(toggle);
    await Promise.resolve();
  });
}

describe('§ ProcessForm — panel desplegable de edición de procesos', () => {
  afterEach(() => {
    cleanup();
  });

  it('panel está cerrado por defecto', () => {
    renderForm();
    expect(screen.queryByTestId('process-form-panel')).not.toBeInTheDocument();
  });

  it('el toggle abre el panel', async () => {
    renderForm();
    await openPanel();
    expect(screen.getByTestId('process-form-panel')).toBeInTheDocument();
  });

  it('muestra las filas de procesos al abrir', async () => {
    renderForm();
    await openPanel();
    expect(screen.getByTestId('process-row-A')).toBeInTheDocument();
    expect(screen.getByTestId('process-row-B')).toBeInTheDocument();
  });

  it('el botón + Proceso añade una nueva fila', async () => {
    renderForm();
    await openPanel();
    const addBtn = screen.getByTestId('add-process-button');
    await act(async () => {
      fireEvent.click(addBtn);
      await Promise.resolve();
    });
    const rows = screen.getAllByTestId(/^process-row-/);
    expect(rows.length).toBe(3);
  });

  it('el botón Eliminar quita un proceso', async () => {
    const value = renderForm();
    await openPanel();
    const removeA = screen.getByTestId('remove-process-A');
    await act(async () => {
      fireEvent.click(removeA);
      await Promise.resolve();
    });
    const rows = screen.getAllByTestId(/^process-row-/);
    expect(rows.length).toBe(1);
    expect((value.updateProcesses as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(0);
  });

  it('rederiva al cambiar el burst_time de un proceso', async () => {
    const value = renderForm();
    await openPanel();
    const burstInput = screen.getByTestId('input-burst-A');
    await act(async () => {
      fireEvent.change(burstInput, { target: { value: '6' } });
      await Promise.resolve();
    });
    const calls = (value.updateProcesses as ReturnType<typeof vi.fn>).mock.calls as [readonly Process[]][];
    expect(calls.length).toBeGreaterThan(0);
    const lastCall = calls[calls.length - 1];
    const processA = lastCall?.[0].find((p) => p.id === 'A');
    expect(processA?.burst_time).toBe(6);
  });

  it('muestra error al ingresar burst_time inválido (0)', async () => {
    renderForm();
    await openPanel();
    const burstInput = screen.getByTestId('input-burst-A');
    await act(async () => {
      fireEvent.change(burstInput, { target: { value: '0' } });
      await Promise.resolve();
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });

  it('no muestra columna priority si requires.priority es false', async () => {
    renderForm({ requires: { priority: false } });
    await openPanel();
    expect(screen.queryByTestId('input-priority-A')).not.toBeInTheDocument();
  });

  it('muestra columna priority si requires.priority es true', async () => {
    const procs: readonly Process[] = [
      { id: 'A', arrival_time: 0, burst_time: 4, priority: 1 },
    ];
    renderForm({
      processes: procs,
      requires: { priority: true },
      result: run(procs, { algorithm: 'priority-np' }),
    });
    await openPanel();
    expect(screen.getByTestId('input-priority-A')).toBeInTheDocument();
  });
});

describe('§ ProcessForm — edición de operaciones de E/S', () => {
  afterEach(() => {
    cleanup();
  });

  const IO_PROCS: readonly Process[] = [
    { id: 'A', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 1 }] },
  ];

  function renderIOForm() {
    const result = run(IO_PROCS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const updateProcesses = vi.fn();
    const value: SimulationContextValue = {
      result,
      currentEvent: result.history[0],
      player,
      error: null,
      whatIfBranch: null,
      processes: IO_PROCS,
      algorithmName: 'fcfs',
      params: {},
      requires: { io: true },
      stepForward: () => undefined,
      stepBackward: () => undefined,
      seekTo: () => undefined,
      updateProcesses,
      updateParams: () => undefined,
      createWhatIf: () => undefined,
      discardWhatIf: () => undefined,
    };
    render(
      <SimulationCtx.Provider value={value}>
        <ProcessForm />
      </SimulationCtx.Provider>,
    );
    return { updateProcesses };
  }

  it('muestra la sección de E/S para cada proceso cuando requires.io', async () => {
    renderIOForm();
    await openPanel();
    expect(screen.getByTestId('io-op-A-0')).toBeInTheDocument();
  });

  it('el botón Añadir E/S agrega una operación', async () => {
    renderIOForm();
    await openPanel();
    const addIOBtn = screen.getByRole('button', { name: /añadir e\/s a a/i });
    await act(async () => {
      fireEvent.click(addIOBtn);
      await Promise.resolve();
    });
    expect(screen.getByTestId('io-op-A-1')).toBeInTheDocument();
  });

  it('el botón eliminar E/S quita la operación', async () => {
    renderIOForm();
    await openPanel();
    const removeIOBtn = screen.getByRole('button', { name: /eliminar e\/s 0 de a/i });
    await act(async () => {
      fireEvent.click(removeIOBtn);
      await Promise.resolve();
    });
    expect(screen.queryByTestId('io-op-A-0')).not.toBeInTheDocument();
  });

  it('muestra error si io_entry >= burst_time', async () => {
    renderIOForm();
    await openPanel();
    const ioOp = screen.getByTestId('io-op-A-0');
    const ioEntryInput = ioOp.querySelector('input');
    expect(ioEntryInput).not.toBeNull();
    if (ioEntryInput === null) return;
    await act(async () => {
      fireEvent.change(ioEntryInput, { target: { value: '7' } });
      await Promise.resolve();
    });
    const alerts = screen.getAllByRole('alert');
    expect(alerts.length).toBeGreaterThan(0);
  });
});
