// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
afterEach(cleanup);
import { SimulationProvider } from '../../src/index.js';
import { GanttChart } from '../../src/react/GanttChart.js';

const processes = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('T-27 · GanttChart', () => {
  it('muestra el mensaje del evento actual (texto no vacío)', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    // El mensaje está en el div con role implícito — buscamos por clase conceptual
    // Al menos un elemento contiene texto de mensaje de evento
    expect(document.body.textContent).toMatch(/CPU/);
  });

  it('muestra las cabeceras de ticks (0) y la tabla de Gantt', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    const table = screen.getByLabelText('Diagrama de Gantt');
    expect(table).toBeInTheDocument();
    // La cabecera contiene el tick 0
    expect(table.textContent).toContain('0');
  });

  it('muestra el título "Leyenda" y columnas de leyenda', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    expect(screen.getByText('Leyenda')).toBeInTheDocument();
    expect(screen.getByText('En CPU')).toBeInTheDocument();
    expect(screen.getByText('En espera')).toBeInTheDocument();
  });

  it('celdas de la matriz no contienen texto', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <GanttChart />
      </SimulationProvider>,
    );
    const table = screen.getByLabelText('Diagrama de Gantt');
    const dataCells = table.querySelectorAll('td');
    for (const cell of dataCells) {
      expect(cell.textContent).toBe('');
    }
  });
});
