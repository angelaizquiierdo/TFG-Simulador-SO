// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationProvider } from '../../src/index.js';
import { useSimulation } from '../../src/react/SimulationContext.js';

afterEach(cleanup);

function Inspector(): React.ReactElement {
  const ctx = useSimulation();
  return (
    <div>
      <span data-testid="has-result">{ctx.result !== null ? 'yes' : 'no'}</span>
      <span data-testid="error">{ctx.error ?? ''}</span>
      <span data-testid="tick">{String(ctx.currentEvent?.tick ?? -1)}</span>
    </div>
  );
}

const fcfsProcesses = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
  { id: 'P3', arrival_time: 1, burst_time: 4 },
];

describe('T-25 · SimulationProvider', () => {
  it('monta con procesos válidos y expone resultado al contexto', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={fcfsProcesses}>
        <Inspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('yes');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('processes vacío → estado vacío sin error', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <Inspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('no');
    expect(screen.getByTestId('error').textContent).toBe('');
  });

  it('burst_time = 0 → contexto expone error', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 0 }]}
      >
        <Inspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('no');
    expect(screen.getByTestId('error').textContent).toContain('ráfaga');
  });

  it('algoritmo inexistente → contexto expone error sin excepción no capturada', () => {
    render(
      <SimulationProvider algorithm="no-existe" processes={fcfsProcesses}>
        <Inspector />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('error').textContent).not.toBe('');
  });

  it('useSimulation fuera de Provider lanza error descriptivo', () => {
    const orig = console.error;
    console.error = () => undefined;
    expect(() => render(<Inspector />)).toThrow(
      'useSimulation debe usarse dentro de un <SimulationProvider>',
    );
    console.error = orig;
  });

  it('children explícitos se renderizan en lugar del layout por defecto', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={fcfsProcesses}>
        <span data-testid="custom-child">custom</span>
      </SimulationProvider>,
    );
    expect(screen.getByTestId('custom-child').textContent).toBe('custom');
  });
});
