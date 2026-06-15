// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
afterEach(cleanup);
import { SimulationProvider } from '../../src/index.js';
import { ProcessTable } from '../../src/react/ProcessTable.js';

const fcfsProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
  { id: 'P3', arrival_time: 1, burst_time: 4 },
];

const priorityProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2, priority: 1 },
];

describe('T-26 · ProcessTable', () => {
  it('muestra 3 filas con datos de los procesos para FCFS', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={fcfsProcesses}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getAllByRole('row').length).toBe(1 + fcfsProcesses.length); // header + rows
    expect(screen.getByText('P1')).toBeInTheDocument();
  });

  it('FCFS: cabecera no incluye columna priority', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={fcfsProcesses}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.queryByText('Prioridad')).not.toBeInTheDocument();
  });

  it('Prioridad NP: cabecera incluye columna priority', () => {
    render(
      <SimulationProvider algorithm="priority-np" processes={priorityProcesses}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByText('Prioridad')).toBeInTheDocument();
  });

  it('Round Robin: cabecera incluye columna Quantum', () => {
    render(
      <SimulationProvider
        algorithm="round-robin"
        processes={fcfsProcesses}
        params={{ quantum: 2 }}
      >
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByText('Quantum')).toBeInTheDocument();
  });
});
