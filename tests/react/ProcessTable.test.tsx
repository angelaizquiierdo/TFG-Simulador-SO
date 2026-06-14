// Tests T-26 — ProcessTable
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import '../../src/index.js';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { ProcessTable } from '../../src/react/ProcessTable.js';
import type { Process } from '../../src/core/types/process.js';

const procs: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 4 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
  { id: 'P3', arrival_time: 2, burst_time: 3 },
];

const procsWithPrio: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 4, priority: 1 },
  { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
];

describe('ProcessTable', () => {
  it('3 procesos + FCFS → tabla con cabecera (id, arrival_time, burst_time) y 3 filas', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('arrival_time')).toBeDefined();
    expect(screen.getByText('burst_time')).toBeDefined();
    expect(screen.getByText('P1')).toBeDefined();
    expect(screen.getByText('P2')).toBeDefined();
    expect(screen.getByText('P3')).toBeDefined();
  });

  it('algoritmo Prioridad → cabecera incluye priority', () => {
    render(
      <SimulationProvider algorithm="priority-np" processes={procsWithPrio}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByText('priority')).toBeDefined();
  });

  it('algoritmo FCFS → cabecera NO incluye priority', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.queryByText('priority')).toBeNull();
  });
});
