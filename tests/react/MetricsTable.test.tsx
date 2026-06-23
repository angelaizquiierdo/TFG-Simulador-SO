import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { MetricsTable } from '../../src/react/MetricsTable.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';
import { register } from '../../src/core/registry.js';
import { FCFS } from '../../src/core/algorithms/non-preemptive/fcfs.js';

beforeAll(() => {
  register(new FCFS());
});

describe('MetricsTable — T-42', () => {
  it('no visible cuando no está en el último tick', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[
          { id: 'P1', arrival_time: 0, burst_time: 3 },
          { id: 'P2', arrival_time: 2, burst_time: 2 },
        ]}
      >
        <MetricsTable />
      </SimulationProvider>,
    );
    // En tick 0 no debe mostrar métricas
    expect(screen.queryByText('Métricas por proceso')).toBeNull();
  });

  it('visible al avanzar al último tick', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[
          { id: 'P1', arrival_time: 0, burst_time: 3 },
        ]}
      >
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );

    // Avanzar al final haciendo click en "Ir al final"
    const lastBtn = screen.getByRole('button', { name: /ir al final/i });
    fireEvent.click(lastBtn);

    expect(screen.getByText('Métricas por proceso')).toBeTruthy();
    expect(screen.getByText('Métricas agregadas')).toBeTruthy();
  });

  it('muestra métricas coherentes con el historial', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 3 }]}
      >
        <PlaybackControls />
        <MetricsTable />
      </SimulationProvider>,
    );
    const lastBtn = screen.getByRole('button', { name: /ir al final/i });
    fireEvent.click(lastBtn);

    // P1 termina en t=3, turnaround=3, waiting=0
    expect(screen.getByText('P1')).toBeTruthy();
    expect(screen.getAllByText('3').length).toBeGreaterThan(0); // completion/turnaround
  });
});
