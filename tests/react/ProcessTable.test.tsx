import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { ProcessTable } from '../../src/react/ProcessTable.js';
import { register } from '../../src/core/registry.js';
import { FCFS } from '../../src/core/algorithms/non-preemptive/fcfs.js';
import { PriorityNP } from '../../src/core/algorithms/non-preemptive/priority-np.js';
import { VirtualRoundRobin } from '../../src/core/algorithms/preemptive/virtual-round-robin.js';

beforeAll(() => {
  register(new FCFS());
  register(new PriorityNP());
  register(new VirtualRoundRobin());
});

function wrap(
  algorithm: string,
  processes: Parameters<typeof SimulationProvider>[0]['processes'],
  params?: Parameters<typeof SimulationProvider>[0]['params'],
) {
  return render(
    <SimulationProvider
      algorithm={algorithm}
      processes={processes}
      {...(params !== undefined ? { params } : {})}
    >
      <ProcessTable />
    </SimulationProvider>,
  );
}

describe('ProcessTable — T-39', () => {
  it('FCFS no muestra columna prioridad', () => {
    wrap('fcfs', [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
    ]);
    expect(screen.queryByText('Prioridad')).toBeNull();
  });

  it('FCFS no muestra columnas de E/S', () => {
    wrap('fcfs', [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
    ]);
    expect(screen.queryByText('E/S entrada')).toBeNull();
  });

  it('Prioridad NP muestra columna prioridad', () => {
    wrap('priority-np', [
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
    ]);
    expect(screen.getByText('Prioridad')).toBeTruthy();
  });

  it('VRR muestra columnas de E/S', () => {
    wrap('vrr', [
      { id: 'P1', arrival_time: 0, burst_time: 4, io: [{ io_entry: 2, io_time: 1 }] },
    ], { quantum: 4 });
    expect(screen.getByText('E/S entrada')).toBeTruthy();
    expect(screen.getByText('E/S tiempo')).toBeTruthy();
    expect(screen.getByText('E/S salida')).toBeTruthy();
  });

  it('renderiza filas con los datos de los procesos', () => {
    wrap('fcfs', [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ]);
    expect(screen.getByText('P1')).toBeTruthy();
    expect(screen.getByText('P2')).toBeTruthy();
  });
});
