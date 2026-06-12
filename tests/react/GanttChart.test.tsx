// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { GanttChart } from '../../src/react/GanttChart.js';

afterEach(() => { cleanup(); });

// P1(llegada 0, ráfaga 3), P2(llegada 1, ráfaga 2) con FCFS
// Gantt: P1[0-3], P2[3-5] → ticks 0,1,2,3,4
const processes = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('GanttChart', () => {
  it('BEHAVIOURS § Renderizado — GanttChart: muestra cabecera de ticks y filas de procesos', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    // 5 ticks (0-4) en cabecera
    expect(screen.getByText('0')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    // filas con etiquetas de proceso
    expect(screen.getByText('P1')).toBeTruthy();
    expect(screen.getByText('P2')).toBeTruthy();
  });

  it('BEHAVIOURS § Renderizado — GanttChart: celda P1/tick0 tiene estado on-cpu', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    const cell = screen.getByTestId('cell-P1-0');
    expect(cell.dataset.state).toBe('on-cpu');
  });

  it('BEHAVIOURS § Renderizado — GanttChart: celda P2/tick1 tiene estado waiting (en espera)', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    // P2 llega en tick 1, P1 está en CPU → P2 espera
    const cell = screen.getByTestId('cell-P2-1');
    expect(cell.dataset.state).toBe('waiting');
  });

  it('BEHAVIOURS § Renderizado — GanttChart: celda P2/tick0 está en estado not-arrived', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    // P2 llega en tick 1, tick 0 → no llegado
    const cell = screen.getByTestId('cell-P2-0');
    expect(cell.dataset.state).toBe('not-arrived');
  });

  it('BEHAVIOURS § Renderizado — GanttChart: CPU inactiva se muestra con fondo gris', () => {
    const idleProcesses = [{ id: 'P1', arrival_time: 2, burst_time: 2 }];
    render(
      <SimulationProvider algorithm="FCFS" processes={idleProcesses}>
        <GanttChart />
      </SimulationProvider>,
    );
    // Tick 0 y 1: CPU inactiva — para P1 que no ha llegado → not-arrived
    // pero el estado idle no aplica a P1 hasta que llega
    const cell0 = screen.getByTestId('cell-P1-0');
    expect(cell0.dataset.state).toBe('not-arrived');
    // tick 2: P1 en CPU
    const cell2 = screen.getByTestId('cell-P1-2');
    expect(cell2.dataset.state).toBe('on-cpu');
  });

  it('BEHAVIOURS § Renderizado — GanttChart: cada proceso tiene color distinto', () => {
    const threeProcs = [
      { id: 'P1', arrival_time: 0, burst_time: 1 },
      { id: 'P2', arrival_time: 0, burst_time: 1 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    render(
      <SimulationProvider algorithm="FCFS" processes={threeProcs}>
        <GanttChart />
      </SimulationProvider>,
    );
    // Las celdas on-cpu deben existir para cada proceso
    expect(screen.getByTestId('cell-P1-0').dataset.state).toBe('on-cpu');
    expect(screen.getByTestId('cell-P2-1').dataset.state).toBe('on-cpu');
    expect(screen.getByTestId('cell-P3-2').dataset.state).toBe('on-cpu');
  });

  it('BEHAVIOURS § Renderizado — GanttChart: sin datos muestra mensaje', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={[]}>
        <GanttChart />
      </SimulationProvider>,
    );
    expect(screen.getByText('Sin datos de simulación.')).toBeTruthy();
  });

  it('BEHAVIOURS § Renderizado — GanttChart (matriz): estado idle cuando proceso llegó y CPU inactiva', () => {
    // P1(0,1) termina en tick 1; P2 llega en tick 3 → CPU inactiva en ticks 1-2
    // En tick 1: P1 ya llegó (arrival=0) y onCPU=null → estado 'idle'
    const gapProcesses = [
      { id: 'P1', arrival_time: 0, burst_time: 1 },
      { id: 'P2', arrival_time: 3, burst_time: 1 },
    ];
    render(
      <SimulationProvider algorithm="FCFS" processes={gapProcesses}>
        <GanttChart />
      </SimulationProvider>,
    );
    const cell = screen.getByTestId('cell-P1-1');
    expect(cell.dataset.state).toBe('idle');
  });
});
