// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
afterEach(cleanup);
import { SimulationProvider } from '../../src/index.js';
import { MetricsTable } from '../../src/react/MetricsTable.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';

const processes = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('T-29 · MetricsTable', () => {
  it('no muestra métricas en un tick intermedio', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <MetricsTable />
      </SimulationProvider>,
    );
    // En tick 0 (intermedio) no se muestran métricas
    expect(screen.queryByText('Métricas por proceso')).not.toBeInTheDocument();
  });

  it('muestra métricas al llegar al último tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    const goToEnd = screen.getByLabelText('Ir al final');
    fireEvent.click(goToEnd);
    expect(screen.getByText('Métricas por proceso')).toBeInTheDocument();
    expect(screen.getByText('Métricas agregadas')).toBeInTheDocument();
  });

  it('tabla por proceso tiene columnas id, completion, turnaround, waiting, response', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByLabelText('Ir al final'));
    expect(screen.getByText('Finalización')).toBeInTheDocument();
    expect(screen.getByText('Retorno')).toBeInTheDocument();
    expect(screen.getByText('Espera')).toBeInTheDocument();
    expect(screen.getByText('Respuesta')).toBeInTheDocument();
  });

  it('tabla agregada contiene avgWaiting, avgTurnaround, cpuUtilization, throughput', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByLabelText('Ir al final'));
    expect(screen.getByText('Espera media')).toBeInTheDocument();
    expect(screen.getByText('Retorno medio')).toBeInTheDocument();
    expect(screen.getByText('Utilización CPU')).toBeInTheDocument();
    expect(screen.getByText('Rendimiento')).toBeInTheDocument();
  });
});
