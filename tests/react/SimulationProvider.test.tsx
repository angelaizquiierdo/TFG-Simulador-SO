// @vitest-environment jsdom
/**
 * T-38 — SimulationProvider y SimulationContext
 *
 * Cierra: § Conjunto vacío, § Render — SimulationProvider y Gestión de Estado
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { useSimulation } from '../../src/react/SimulationContext.js';
import type { Process } from '../../src/core/types/process.js';
// Registrar los algoritmos antes de los tests
import '../../src/index.js';

// Componente auxiliar que lee el contexto y renderiza campos básicos
function ConsumerBasic() {
  const { result, error, player } = useSimulation();
  return (
    <div>
      <span data-testid="has-result">{result !== null ? 'yes' : 'no'}</span>
      <span data-testid="error">{error ?? 'none'}</span>
      <span data-testid="has-player">{player !== null ? 'yes' : 'no'}</span>
    </div>
  );
}

// Componente auxiliar que usa el hook fuera del Provider para verificar error
function ConsumerOutsideProvider() {
  const { result } = useSimulation();
  return <div>{result !== null ? 'ok' : 'empty'}</div>;
}

const P1: Process = { id: 'P1', arrival_time: 0, burst_time: 3 };
const P2: Process = { id: 'P2', arrival_time: 0, burst_time: 4 };

describe('§ Render — SimulationProvider y Gestión de Estado', () => {
  afterEach(() => { cleanup(); });
  it('renderiza los hijos sin añadir elementos de UI propios', () => {
    const { container } = render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <span data-testid="child">hijo</span>
      </SimulationProvider>,
    );
    expect(screen.getByTestId('child')).toBeInTheDocument();
    // El Provider no debe añadir wrapping divs extra más allá del Context.Provider
    expect(container.firstChild).toBe(screen.getByTestId('child'));
  });

  it('provee result y player a los hijos cuando la simulación es válida', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[P1, P2]}>
        <ConsumerBasic />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('yes');
    expect(screen.getByTestId('error').textContent).toBe('none');
    expect(screen.getByTestId('has-player').textContent).toBe('yes');
  });

  it('§ Conjunto vacío: lista de procesos vacía no lanza excepción', () => {
    expect(() =>
      render(
        <SimulationProvider algorithm="fcfs" processes={[]}>
          <ConsumerBasic />
        </SimulationProvider>,
      ),
    ).not.toThrow();
    // Con lista vacía, result es null pero no hay error
    expect(screen.getByTestId('has-result').textContent).toBe('no');
    expect(screen.getByTestId('error').textContent).toBe('none');
  });

  it('captura el error de configuración inválida y lo expone en el contexto', () => {
    const invalid: Process = { id: 'P1', arrival_time: 0, burst_time: -1 };
    render(
      <SimulationProvider algorithm="fcfs" processes={[invalid]}>
        <ConsumerBasic />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('has-result').textContent).toBe('no');
    expect(screen.getByTestId('error').textContent).not.toBe('none');
  });

  it('expone error cuando el algoritmo no existe en el registro', () => {
    render(
      <SimulationProvider algorithm="algoritmo-inexistente" processes={[P1]}>
        <ConsumerBasic />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('error').textContent).not.toBe('none');
    expect(screen.getByTestId('has-result').textContent).toBe('no');
  });

  it('useSimulation() lanza error descriptivo si se usa fuera del Provider', () => {
    // Suprimir el error de consola de React durante el test
    const consoleError = console.error;
    console.error = () => undefined;
    expect(() => render(<ConsumerOutsideProvider />)).toThrow(
      /useSimulation\(\) debe usarse dentro de un <SimulationProvider>/,
    );
    console.error = consoleError;
  });

  it('expone currentEvent del tick actual', () => {
    function ConsumerEvent() {
      const { currentEvent } = useSimulation();
      return (
        <span data-testid="tick">{currentEvent !== undefined ? String(currentEvent.tick) : 'none'}</span>
      );
    }
    render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <ConsumerEvent />
      </SimulationProvider>,
    );
    // El player empieza en tick 0
    expect(screen.getByTestId('tick').textContent).toBe('0');
  });
});
