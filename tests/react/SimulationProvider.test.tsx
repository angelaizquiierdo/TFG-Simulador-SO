// Tests T-25 — SimulationProvider y useSimulation
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';
import '../../src/index.js'; // registra algoritmos
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { useSimulation } from '../../src/react/SimulationContext.js';
import type { Process } from '../../src/core/types/process.js';

const procs: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

function ContextReader(): React.ReactElement {
  const ctx = useSimulation();
  return (
    <div>
      <span data-testid="error">{ctx.error ?? 'null'}</span>
      <span data-testid="result">{ctx.result !== null ? 'ok' : 'null'}</span>
      <span data-testid="tick">{ctx.tick}</span>
    </div>
  );
}

describe('SimulationProvider', () => {
  it('Provider con procesos válidos → children acceden al contexto', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <ContextReader />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('result').textContent).toBe('ok');
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  it('hook useSimulation() fuera de Provider → lanza error descriptivo', () => {
    const FailingComponent = (): React.ReactElement => {
      useSimulation();
      return <div />;
    };
    expect(() => render(<FailingComponent />)).toThrowError(/SimulationProvider/i);
  });

  it('Provider con burst_time=0 → contexto tiene error, sin resultado', () => {
    const bad: readonly Process[] = [{ id: 'P1', arrival_time: 0, burst_time: 0 }];
    render(
      <SimulationProvider algorithm="fcfs" processes={bad}>
        <ContextReader />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('error').textContent).toContain('ráfaga');
    expect(screen.getByTestId('result').textContent).toBe('null');
  });

  it('Provider sin hijos → renderiza layout por defecto', () => {
    render(<SimulationProvider algorithm="fcfs" processes={procs} />);
    // Tabla de procesos — cabecera
    expect(screen.getByText('id')).toBeDefined();
    expect(screen.getByText('arrival_time')).toBeDefined();
    // Controles
    expect(screen.getByLabelText('Ir al inicio')).toBeDefined();
  });

  it('Provider con hijos personalizados → solo renderiza esos hijos', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <span data-testid="custom">custom-child</span>
      </SimulationProvider>,
    );
    expect(screen.getByTestId('custom').textContent).toBe('custom-child');
    // No debe haber el layout por defecto (arrival_time encabezado de ProcessTable)
    expect(screen.queryByText('arrival_time')).toBeNull();
  });

  it('Provider con algoritmo inexistente → contexto expone error, no lanza excepción no capturada', () => {
    render(
      <SimulationProvider algorithm="INEXISTENTE" processes={procs}>
        <ContextReader />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('error').textContent).toContain('INEXISTENTE');
    expect(screen.getByTestId('result').textContent).toBe('null');
  });
});
