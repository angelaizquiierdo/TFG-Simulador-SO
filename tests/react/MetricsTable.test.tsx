// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { MetricsTable } from '../../src/react/MetricsTable.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';

afterEach(() => { cleanup(); });

// P1(0,3), P2(1,2) con FCFS → 5 ticks, último tick = 4
const processes = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('MetricsTable', () => {
  it('BEHAVIOURS § Renderizado — MetricsTable: en tick intermedio no muestra tablas de métricas', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <MetricsTable />
      </SimulationProvider>,
    );
    // En tick 0 (inicio), no debe haber cabeceras de métricas
    expect(screen.queryByText('completion')).toBeNull();
    expect(screen.queryByText('avgWaiting')).toBeNull();
  });

  it('BEHAVIOURS § Renderizado — MetricsTable: en el último tick muestra métricas por proceso y agregadas', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    // Avanzar al último tick mediante slider
    const slider = screen.getByRole('slider');
    fireEvent.change(slider, { target: { value: '4' } });

    // Cabeceras de métricas por proceso
    expect(screen.queryByText('completion')).toBeTruthy();
    expect(screen.queryByText('turnaround')).toBeTruthy();
    expect(screen.queryByText('waiting')).toBeTruthy();
    expect(screen.queryByText('response')).toBeTruthy();

    // Cabeceras de métricas agregadas
    expect(screen.queryByText('avgWaiting')).toBeTruthy();
    expect(screen.queryByText('avgTurnaround')).toBeTruthy();
    expect(screen.queryByText('throughput')).toBeTruthy();
  });

  it('BEHAVIOURS § Coherencia de métricas y estado: métricas muestran datos de los procesos', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });

    // P1 y P2 deben aparecer en la tabla
    expect(screen.queryAllByText('P1').length).toBeGreaterThan(0);
    expect(screen.queryAllByText('P2').length).toBeGreaterThan(0);
  });
});
