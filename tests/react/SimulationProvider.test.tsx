import { describe, it, expect, beforeAll, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { useSimulation } from '../../src/react/SimulationContext.js';
import { register } from '../../src/core/registry.js';
import { FCFS } from '../../src/core/algorithms/non-preemptive/fcfs.js';

beforeAll(() => {
  register(new FCFS());
});

function ContextReader() {
  const ctx = useSimulation();
  return (
    <div>
      <span data-testid="error">{ctx.error?.message ?? 'null'}</span>
      <span data-testid="has-result">{ctx.result !== null ? 'yes' : 'no'}</span>
      <span data-testid="tick">{String(ctx.tick)}</span>
    </div>
  );
}

function OutsideConsumer() {
  const ctx = useSimulation();
  return <div>{ctx.tick}</div>;
}

describe('SimulationProvider — T-38', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('monta con procesos válidos y FCFS sin error', async () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[
          { id: 'P1', arrival_time: 0, burst_time: 3 },
          { id: 'P2', arrival_time: 2, burst_time: 2 },
        ]}
      >
        <ContextReader />
      </SimulationProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('has-result').textContent).toBe('yes');
    });
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  it('useSimulation fuera del provider lanza error descriptivo', () => {
    expect(() => render(<OutsideConsumer />)).toThrow(/SimulationProvider/);
  });

  it('expone error cuando burst_time = 0', async () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 0 }]}
      >
        <ContextReader />
      </SimulationProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('has-result').textContent).toBe('no');
    });
    const errText = screen.getByTestId('error').textContent;
    expect(errText).not.toBe('null');
  });

  it('conjunto vacío produce estado vacío sin error', async () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <ContextReader />
      </SimulationProvider>,
    );
    await waitFor(() => {
      expect(screen.getByTestId('has-result').textContent).toBe('no');
    });
    expect(screen.getByTestId('error').textContent).toBe('null');
  });

  it('algoritmo desconocido expone error descriptivo', async () => {
    render(
      <SimulationProvider
        algorithm="algoritmo-inexistente"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 2 }]}
      >
        <ContextReader />
      </SimulationProvider>,
    );
    await waitFor(() => {
      const errText = screen.getByTestId('error').textContent;
      expect(errText).not.toBe('null');
      expect(errText).toMatch(/algoritmo-inexistente/i);
    });
  });

  it('renderiza solo los hijos pasados', () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 2 }]}
      >
        <span data-testid="custom-child">hola</span>
      </SimulationProvider>,
    );
    expect(screen.getByTestId('custom-child').textContent).toBe('hola');
  });
});

describe('SimulationProvider — T-45 Persistencia sessionStorage', () => {
  beforeEach(() => {
    sessionStorage.clear();
  });

  it('guarda escenario en sessionStorage con clave por algoritmo', async () => {
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 3 }]}
      >
        <ContextReader />
      </SimulationProvider>,
    );
    await waitFor(() => {
      expect(sessionStorage.getItem('scheduler-scenario:fcfs')).not.toBeNull();
    });
  });

  it('claves distintas para distintos algoritmos no se mezclan', () => {
    sessionStorage.setItem(
      'scheduler-scenario:fcfs',
      JSON.stringify({ processes: [{ id: 'STORED', arrival_time: 0, burst_time: 5 }], params: {} }),
    );
    // Un algoritmo distinto no lee el escenario de fcfs
    render(
      <SimulationProvider
        algorithm="algoritmo-inexistente"
        processes={[{ id: 'DEFAULT', arrival_time: 0, burst_time: 2 }]}
      >
        <ContextReader />
      </SimulationProvider>,
    );
    // No debe mezclar escenarios de claves distintas
    expect(sessionStorage.getItem('scheduler-scenario:fcfs')).not.toBeNull();
  });

  it('reset limpia sessionStorage y restaura el escenario inicial', async () => {
    function ResetButton() {
      const { reset } = useSimulation();
      return <button onClick={reset}>Reset</button>;
    }
    sessionStorage.setItem(
      'scheduler-scenario:fcfs',
      JSON.stringify({ processes: [{ id: 'STORED', arrival_time: 0, burst_time: 5 }], params: {} }),
    );
    render(
      <SimulationProvider
        algorithm="fcfs"
        processes={[{ id: 'DEFAULT', arrival_time: 0, burst_time: 2 }]}
      >
        <ResetButton />
      </SimulationProvider>,
    );
    const btn = screen.getByRole('button', { name: /reset/i });
    btn.click();
    await waitFor(() => {
      expect(sessionStorage.getItem('scheduler-scenario:fcfs')).toBeNull();
    });
  });
});
