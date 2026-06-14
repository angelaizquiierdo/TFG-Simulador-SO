// Tests T-29 — MetricsTable
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import '../../src/index.js';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { MetricsTable } from '../../src/react/MetricsTable.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';
import type { Process } from '../../src/core/types/process.js';

const procs: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 2 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('MetricsTable', () => {
  it('Tick intermedio → no muestra métricas', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <MetricsTable />
      </SimulationProvider>,
    );
    expect(screen.queryByText('completion')).toBeNull();
    expect(screen.queryByText('avgWaiting')).toBeNull();
  });

  it('Último tick → muestra tabla por proceso con columnas id, completion, turnaround, waiting, response', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByLabelText('Ir al final').click();
    });
    expect(screen.getByText('completion')).toBeDefined();
    expect(screen.getByText('turnaround')).toBeDefined();
    expect(screen.getByText('waiting')).toBeDefined();
    expect(screen.getByText('response')).toBeDefined();
    // Filas de procesos
    expect(screen.getByText('P1')).toBeDefined();
    expect(screen.getByText('P2')).toBeDefined();
  });

  it('Último tick → muestra tabla agregada con avgWaiting, avgTurnaround, cpuUtilization, throughput', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByLabelText('Ir al final').click();
    });
    expect(screen.getByText('avgWaiting')).toBeDefined();
    expect(screen.getByText('avgTurnaround')).toBeDefined();
    expect(screen.getByText('cpuUtilization')).toBeDefined();
    expect(screen.getByText('throughput')).toBeDefined();
  });
});
