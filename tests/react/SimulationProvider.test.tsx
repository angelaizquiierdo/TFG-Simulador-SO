// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';

afterEach(() => { cleanup(); });
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { useSimulation } from '../../src/react/SimulationContext.js';

const PROCESSES_FCFS = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
  { id: 'P3', arrival_time: 1, burst_time: 4 },
];

function ContextReader() {
  const { result, error, tick } = useSimulation();
  return (
    <div>
      <span data-testid="has-result">{result !== null ? 'si' : 'no'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="tick">{tick}</span>
    </div>
  );
}

function OutsideConsumer() {
  useSimulation();
  return <div />;
}

describe('SimulationProvider — T-25', () => {
  it('expone el contexto a los hijos con procesos válidos y FCFS', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES_FCFS}>
        <ContextReader />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('si');
    expect(screen.getByTestId('error').textContent).toBe('none');
    expect(screen.getByTestId('tick').textContent).toBe('0');
  });

  it('useSimulation() fuera de un proveedor lanza error descriptivo', () => {
    const origConsoleError = console.error;
    console.error = () => undefined;
    expect(() => render(<OutsideConsumer />)).toThrow(
      /useSimulation\(\) debe usarse dentro de un <SimulationProvider>/,
    );
    console.error = origConsoleError;
  });

  it('burst_time = 0 → contexto con error, sin resultado', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[{ id: 'P1', arrival_time: 0, burst_time: 0 }]}>
        <ContextReader />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('no');
    expect(screen.getByTestId('error').textContent).toMatch(/ráfaga/i);
  });

  it('processes vacío → estado vacío sin error', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <ContextReader />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('no');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('algoritmo desconocido → error descriptivo en el contexto, sin excepción', () => {
    render(
      <SimulationProvider algorithm="no-existe" processes={PROCESSES_FCFS}>
        <ContextReader />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('no');
    expect(screen.getByTestId('error').textContent).toMatch(/no-existe/);
  });

  it('sin hijos → renderiza el layout por defecto (cuatro componentes)', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES_FCFS} />,
    );
    // ProcessTable renderiza una tabla con cabecera id
    const tables = screen.getAllByRole('table');
    expect(tables.length).toBeGreaterThanOrEqual(1);
  });

  it('con hijos explícitos → renderiza solo los hijos pasados', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES_FCFS}>
        <span data-testid="custom-child">solo yo</span>
      </SimulationProvider>,
    );
    expect(screen.getByTestId('custom-child').textContent).toBe('solo yo');
  });
});
