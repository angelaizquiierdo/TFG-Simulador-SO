// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { MetricsTable } from '../../src/react/MetricsTable.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';

afterEach(() => { cleanup(); });

const PROCESSES = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
];

describe('MetricsTable — T-29', () => {
  it('no muestra métricas en tick intermedio', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    // En tick 0 (no es el último) no hay tabla de métricas
    expect(screen.queryByText('completion')).toBeNull();
    expect(screen.queryByText('avgWaiting')).toBeNull();
  });

  it('muestra tablas de métricas cuando el cursor está en el último tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    // Ir al último tick
    fireEvent.click(screen.getByLabelText('Ir al final'));

    // Tabla por proceso: columnas id, completion, turnaround, waiting, response
    expect(screen.getByText('completion')).toBeTruthy();
    expect(screen.getByText('turnaround')).toBeTruthy();
    expect(screen.getByText('waiting')).toBeTruthy();
    expect(screen.getByText('response')).toBeTruthy();

    // Tabla agregada
    expect(screen.getByText('avgWaiting')).toBeTruthy();
    expect(screen.getByText('avgTurnaround')).toBeTruthy();
    expect(screen.getByText('cpuUtilization')).toBeTruthy();
    expect(screen.getByText('throughput')).toBeTruthy();
  });

  it('muestra los IDs de los procesos en la tabla de métricas', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByLabelText('Ir al final'));
    expect(screen.getAllByText('P1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('P2').length).toBeGreaterThanOrEqual(1);
  });

  it('retrocediendo desde el último tick las métricas se ocultan', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByLabelText('Ir al final'));
    expect(screen.getByText('completion')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Paso atrás'));
    expect(screen.queryByText('completion')).toBeNull();
  });
});
