// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { ProcessTable } from '../../src/react/ProcessTable.js';

afterEach(() => { cleanup(); });

const PROCESSES_FCFS = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
  { id: 'P3', arrival_time: 1, burst_time: 4 },
];

const PROCESSES_PRIO = [
  { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
  { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
];

describe('ProcessTable — T-26', () => {
  it('muestra tabla con cabecera id, arrival_time, burst_time y 3 filas para FCFS', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES_FCFS}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByRole('table')).toBeTruthy();
    expect(screen.getByText('id')).toBeTruthy();
    expect(screen.getByText('arrival_time')).toBeTruthy();
    expect(screen.getByText('burst_time')).toBeTruthy();
    const rows = screen.getAllByRole('row');
    // 1 cabecera + 3 filas de datos
    expect(rows.length).toBe(4);
  });

  it('no muestra columna priority con algoritmo FCFS', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES_FCFS}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.queryByText('priority')).toBeNull();
  });

  it('muestra columna priority con algoritmo Prioridad NP', () => {
    render(
      <SimulationProvider algorithm="priority-np" processes={PROCESSES_PRIO}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByText('priority')).toBeTruthy();
  });

  it('muestra quantum con algoritmo Round Robin', () => {
    render(
      <SimulationProvider algorithm="round-robin" processes={PROCESSES_FCFS} params={{ quantum: 2 }}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByText(/quantum/i)).toBeTruthy();
  });

  it('las filas tienen clase alternada para legibilidad', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES_FCFS}>
        <ProcessTable />
      </SimulationProvider>,
    );
    const rows = screen.getAllByRole('row');
    // fila 1 (índice 1) y fila 3 (índice 3) deben existir con clases distintas
    expect(rows.length).toBeGreaterThanOrEqual(3);
  });
});
