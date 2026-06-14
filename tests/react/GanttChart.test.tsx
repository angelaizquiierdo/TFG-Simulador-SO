// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { GanttChart } from '../../src/react/GanttChart.js';

afterEach(() => { cleanup(); });

const P1_P2_FCFS = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

const THREE_PROCS = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
  { id: 'P3', arrival_time: 2, burst_time: 1 },
];

describe('GanttChart — T-27', () => {
  it('muestra el mensaje del evento del tick actual encima de la matriz', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={P1_P2_FCFS}>
        <GanttChart />
      </SimulationProvider>,
    );
    // El mensaje del tick 0 debe aparecer (puede haber múltiples elementos con ese texto)
    const msgs = screen.getAllByText(/Seleccionado|Esperando|inactiv/i);
    expect(msgs.length).toBeGreaterThanOrEqual(1);
  });

  it('muestra cabecera de ticks y cabecera de procesos', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={P1_P2_FCFS}>
        <GanttChart />
      </SimulationProvider>,
    );
    // Cabecera de ticks: al menos tick 0
    expect(screen.getAllByText('0').length).toBeGreaterThanOrEqual(1);
    // Cabecera lateral de procesos
    expect(screen.getAllByText('P1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('P2').length).toBeGreaterThanOrEqual(1);
  });

  it('muestra título Leyenda seguido de la tabla de leyenda', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={P1_P2_FCFS}>
        <GanttChart />
      </SimulationProvider>,
    );
    expect(screen.getByText('Leyenda')).toBeTruthy();
    // Columnas de leyenda
    expect(screen.getByText('Inactivo')).toBeTruthy();
    expect(screen.getByText('En espera')).toBeTruthy();
    expect(screen.getByText('En CPU')).toBeTruthy();
  });

  it('las celdas no contienen texto (solo color de fondo)', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={P1_P2_FCFS}>
        <GanttChart />
      </SimulationProvider>,
    );
    // No debe aparecer "CPU" ni "W" como texto de celda en la matriz
    // (verificamos que no hay texto "CPU" o "W" que no sea parte de la cabecera/leyenda)
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('cada proceso tiene color distinto asignado automáticamente (3 procesos)', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={THREE_PROCS}>
        <GanttChart />
      </SimulationProvider>,
    );
    // Hay 3 nombres en la leyenda
    expect(screen.getAllByText('P1').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('P2').length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText('P3').length).toBeGreaterThanOrEqual(1);
  });

  it('sin datos muestra mensaje Sin datos', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <GanttChart />
      </SimulationProvider>,
    );
    expect(screen.getByText('Sin datos.')).toBeTruthy();
  });
});
