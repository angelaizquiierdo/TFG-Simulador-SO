import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { GanttChart } from '../../src/react/GanttChart.js';
import { register } from '../../src/core/registry.js';
import { FCFS } from '../../src/core/algorithms/non-preemptive/fcfs.js';
import { VirtualRoundRobin } from '../../src/core/algorithms/preemptive/virtual-round-robin.js';

beforeAll(() => {
  register(new FCFS());
  register(new VirtualRoundRobin());
});

describe('GanttChart — T-40', () => {
  it('renderiza con historial calculado y tamaño fijo', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[
          { id: 'P1', arrival_time: 0, burst_time: 3 },
          { id: 'P2', arrival_time: 2, burst_time: 2 },
        ]}
      >
        <GanttChart />
      </SimulationProvider>,
    );
    // La tabla debería tener filas para Idle, P1, P2
    expect(screen.getByText('P1')).toBeTruthy();
    expect(screen.getByText('P2')).toBeTruthy();
    expect(screen.getByText('Idle')).toBeTruthy();
  });

  it('sin resultado renderiza wrapper vacío sin error', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <GanttChart />
      </SimulationProvider>,
    );
    // No debe lanzar error
    expect(document.body).toBeTruthy();
  });

  it('leyenda no incluye E/S para FCFS', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 2 }]}
      >
        <GanttChart />
      </SimulationProvider>,
    );
    expect(screen.queryByText('En E/S')).toBeNull();
    expect(screen.queryByText('Esperando E/S')).toBeNull();
  });

  it('leyenda incluye E/S para VRR', () => {
    render(
      <SimulationProvider
        algorithm="vrr"
        processes={[
          { id: 'P1', arrival_time: 0, burst_time: 4, io: [{ io_entry: 2, io_time: 1 }] },
        ]}
        params={{ quantum: 4 }}
      >
        <GanttChart />
      </SimulationProvider>,
    );
    expect(screen.getByText('En E/S')).toBeTruthy();
    expect(screen.getByText('Esperando E/S')).toBeTruthy();
  });

  it('muestra mensaje del tick actual', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 2 }]}
      >
        <GanttChart />
      </SimulationProvider>,
    );
    // Debe haber un elemento de mensaje
    const msgs = document.querySelectorAll('[class*="message"]');
    expect(msgs.length).toBeGreaterThan(0);
  });
});
