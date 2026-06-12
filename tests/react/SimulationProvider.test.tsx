// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { useSimulation } from '../../src/react/SimulationContext.js';

// Componente auxiliar que expone el contexto para inspección
function ContextInspector(): React.ReactElement {
  const ctx = useSimulation();
  return (
    <div>
      <span data-testid="error">{ctx.error ?? 'null'}</span>
      <span data-testid="has-result">{ctx.result !== null ? 'yes' : 'no'}</span>
      <span data-testid="tick">{ctx.tick}</span>
      <span data-testid="process-count">{ctx.processes.length}</span>
      <button data-testid="fwd" onClick={ctx.stepForward}>fwd</button>
      <button data-testid="bwd" onClick={ctx.stepBackward}>bwd</button>
    </div>
  );
}

const fcfsProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
];

describe('SimulationProvider', () => {
  afterEach(() => { cleanup(); });
  it('BEHAVIOURS § Renderizado — SimulationProvider: monta con procesos válidos y FCFS', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={fcfsProcesses}>
        <ContextInspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('error').textContent).toBe('null');
    expect(screen.getByTestId('has-result').textContent).toBe('yes');
  });

  it('BEHAVIOURS § Conjunto vacío: processes vacío → estado vacío sin error', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={[]}>
        <ContextInspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('error').textContent).toBe('null');
    expect(screen.getByTestId('has-result').textContent).toBe('no');
  });

  it('BEHAVIOURS § Configuración inválida: burst_time=0 → error, sin resultado', () => {
    render(
      <SimulationProvider
        algorithm="FCFS"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 0 }]}
      >
        <ContextInspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('error').textContent).toBe('La ráfaga debe ser mayor que 0');
    expect(screen.getByTestId('has-result').textContent).toBe('no');
  });

  it('BEHAVIOURS § Renderizado — SimulationProvider: useSimulation fuera de Provider lanza error', () => {
    // Silenciar el error de React en consola
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<ContextInspector />)).toThrow(
      'useSimulation debe usarse dentro de un SimulationProvider',
    );
    consoleSpy.mockRestore();
  });

  it('BEHAVIOURS § Navegación: stepBackward en tick 0 permanece en tick 0', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={fcfsProcesses}>
        <ContextInspector />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByTestId('bwd'));
    expect(screen.getByTestId('tick').textContent).toBe('0');
  });

  it('BEHAVIOURS § Navegación: stepForward avanza y stepBackward retrocede', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={fcfsProcesses}>
        <ContextInspector />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByTestId('fwd'));
    expect(screen.getByTestId('tick').textContent).toBe('1');
    fireEvent.click(screen.getByTestId('bwd'));
    expect(screen.getByTestId('tick').textContent).toBe('0');
  });

  it('BEHAVIOURS § Escenario de ejemplo: FCFS con 3 procesos devuelve resultado con history', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <ContextInspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('yes');
    expect(screen.getByTestId('process-count').textContent).toBe('3');
  });
});
