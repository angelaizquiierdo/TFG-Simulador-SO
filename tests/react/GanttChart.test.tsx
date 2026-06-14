// Tests T-27 — GanttChart
import { describe, it, expect } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import '../../src/index.js';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { GanttChart } from '../../src/react/GanttChart.js';
import { useSimulation } from '../../src/react/SimulationContext.js';
import type { Process } from '../../src/core/types/process.js';

const procs: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 2 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
  { id: 'P3', arrival_time: 2, burst_time: 2 },
];

function Controls(): React.ReactElement {
  const { stepForward, stepBackward, goTo, tick, result } = useSimulation();
  const total = result !== null ? result.history.length - 1 : 0;
  return (
    <div>
      <button onClick={() => { stepForward(); }}>forward</button>
      <button onClick={() => { stepBackward(); }}>backward</button>
      <button onClick={() => { goTo(total); }}>end</button>
      <span data-testid="tick">{tick}</span>
    </div>
  );
}

describe('GanttChart', () => {
  it('Renderiza matriz con cabecera de ticks y procesos', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <GanttChart />
      </SimulationProvider>,
    );
    expect(screen.getByText('P1')).toBeDefined();
    expect(screen.getByText('P2')).toBeDefined();
    expect(screen.getByText('P3')).toBeDefined();
    expect(screen.getAllByText('0').length).toBeGreaterThan(0);
  });

  it('Tick 0 → solo columna tick 0', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <GanttChart />
      </SimulationProvider>,
    );
    const headers = container.querySelectorAll('th');
    // Corner + tick 0 = 2 headers
    expect(headers.length).toBe(2);
  });

  it('Tick 2 → columnas 0, 1, 2', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <Controls />
        <GanttChart />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByText('forward').click();
      screen.getByText('forward').click();
    });
    const headers = container.querySelectorAll('th');
    // Corner + ticks 0,1,2 = 4
    expect(headers.length).toBe(4);
  });

  it('Avanzar tick 2→3 → se añade columna tick 3', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <Controls />
        <GanttChart />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByText('forward').click();
      screen.getByText('forward').click();
    });
    expect(container.querySelectorAll('th').length).toBe(4);
    act(() => {
      screen.getByText('forward').click();
    });
    expect(container.querySelectorAll('th').length).toBe(5);
  });

  it('Retroceder tick 3→2 → se quita columna tick 3', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <Controls />
        <GanttChart />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByText('forward').click();
      screen.getByText('forward').click();
      screen.getByText('forward').click();
    });
    expect(container.querySelectorAll('th').length).toBe(5);
    act(() => {
      screen.getByText('backward').click();
    });
    expect(container.querySelectorAll('th').length).toBe(4);
  });

  it('Último tick → todas las columnas', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <Controls />
        <GanttChart />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByText('end').click();
    });
    const tick = Number(screen.getByTestId('tick').textContent);
    const headers = container.querySelectorAll('th');
    expect(headers.length).toBe(tick + 2);
  });

  it('Celda en CPU → data-state="cpu"', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <GanttChart />
      </SimulationProvider>,
    );
    const cpuCells = container.querySelectorAll('[data-state="cpu"]');
    expect(cpuCells.length).toBeGreaterThan(0);
  });

  it('Celda en espera → data-state diferente al de CPU', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <Controls />
        <GanttChart />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByText('forward').click();
    });
    const readyCells = container.querySelectorAll('[data-state="ready"]');
    expect(readyCells.length).toBeGreaterThan(0);
  });

  it('Celda no llegado → data-state="pending"', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <GanttChart />
      </SimulationProvider>,
    );
    // En tick 0, P2 y P3 no han llegado
    const pendingCells = container.querySelectorAll('[data-state="pending"]');
    expect(pendingCells.length).toBeGreaterThan(0);
  });

  it('3 procesos → colores distintos asignados automáticamente', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <Controls />
        <GanttChart />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByText('end').click();
    });
    const cpuCells = container.querySelectorAll<HTMLElement>('[data-state="cpu"]');
    const colors = new Set<string>();
    cpuCells.forEach((cell) => {
      const bg = cell.style.backgroundColor;
      if (bg) colors.add(bg);
    });
    expect(colors.size).toBeGreaterThanOrEqual(2);
  });
});
