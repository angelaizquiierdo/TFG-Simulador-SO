// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { ProcessTable } from '../../src/react/ProcessTable.js';

const fcfsProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
  { id: 'P3', arrival_time: 2, burst_time: 4 },
];

const priorityProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2, priority: 1 },
];

describe('ProcessTable', () => {
  afterEach(() => { cleanup(); });

  it('BEHAVIOURS § Renderizado — ProcessTable: muestra cabecera y 3 filas con FCFS', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={fcfsProcesses}>
        <ProcessTable />
      </SimulationProvider>,
    );
    expect(screen.getByText('id')).toBeTruthy();
    expect(screen.getByText('arrival_time')).toBeTruthy();
    expect(screen.getByText('burst_time')).toBeTruthy();
    // 3 filas de datos
    expect(screen.getByText('P1')).toBeTruthy();
    expect(screen.getByText('P2')).toBeTruthy();
    expect(screen.getByText('P3')).toBeTruthy();
  });

  it('BEHAVIOURS § Página de algoritmo y campos declarados: FCFS no muestra columna priority', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={fcfsProcesses}>
        <ProcessTable />
      </SimulationProvider>,
    );
    // No debe haber columna priority
    const headers = screen.queryAllByRole('columnheader');
    const texts = headers.map((h) => h.textContent);
    expect(texts).not.toContain('priority');
  });

  it('BEHAVIOURS § Página de algoritmo y campos declarados: Prioridad muestra columna priority', () => {
    render(
      <SimulationProvider algorithm="Priority-NP" processes={priorityProcesses}>
        <ProcessTable />
      </SimulationProvider>,
    );
    const headers = screen.queryAllByRole('columnheader');
    const texts = headers.map((h) => h.textContent);
    expect(texts).toContain('priority');
  });
});
