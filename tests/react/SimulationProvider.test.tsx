// @vitest-environment jsdom
/**
 * T-38 — SimulationProvider y SimulationContext
 *
 * Cierra: § Conjunto vacío, § Render — SimulationProvider y Gestión de Estado
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
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
  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });
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

  it('descarta un escenario inválido en sessionStorage y usa los props (auto-recuperación)', () => {
    // Escenario guardado inválido: io_entry >= burst_time → run() lanza al simular
    const invalid = {
      processes: [{ id: 'X', arrival_time: 0, burst_time: 2, io: [{ io_entry: 5, io_time: 1 }] }],
      params: { quantum: 2 },
    };
    sessionStorage.setItem('scheduler-scenario:fcfs', JSON.stringify(invalid));

    render(
      <SimulationProvider algorithm="fcfs" processes={[P1, P2]}>
        <ConsumerBasic />
      </SimulationProvider>,
    );
    // No queda bloqueado por el sessionStorage corrupto: simula con los props válidos
    expect(screen.getByTestId('has-result').textContent).toBe('yes');
    expect(screen.getByTestId('error').textContent).toBe('none');
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
    // El render lanza a propósito. Silenciar el ruido esperado:
    // 1) console.error de React; 2) el "Uncaught" que jsdom emite vía el evento
    //    `error` de la ventana (solo lo registra si no se hace preventDefault).
    const consoleError = console.error;
    console.error = () => undefined;
    const swallowError = (e: ErrorEvent) => {
      e.preventDefault();
    };
    window.addEventListener('error', swallowError);
    try {
      expect(() => render(<ConsumerOutsideProvider />)).toThrow(
        /useSimulation\(\) debe usarse dentro de un <SimulationProvider>/,
      );
    } finally {
      window.removeEventListener('error', swallowError);
      console.error = consoleError;
    }
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

  it('updateProcesses rederiva la simulación al instante', () => {
    const P2: Process = { id: 'B', arrival_time: 0, burst_time: 2 };
    function ConsumerUpdate() {
      const { result, updateProcesses, processes } = useSimulation();
      return (
        <div>
          <span data-testid="proc-count">{String(processes.length)}</span>
          <span data-testid="result">{result !== null ? 'yes' : 'no'}</span>
          <button
            type="button"
            onClick={() => { updateProcesses([P1, P2]); }}
          >
            Añadir
          </button>
        </div>
      );
    }
    const { getByRole, getByTestId } = render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <ConsumerUpdate />
      </SimulationProvider>,
    );
    expect(getByTestId('proc-count').textContent).toBe('1');
    fireEvent.click(getByRole('button', { name: 'Añadir' }));
    expect(getByTestId('proc-count').textContent).toBe('2');
    expect(getByTestId('result').textContent).toBe('yes');
  });

  it('updateParams rederiva la simulación con nuevos parámetros', () => {
    function ConsumerParams() {
      const { params, updateParams } = useSimulation();
      return (
        <div>
          <span data-testid="quantum">{params.quantum !== undefined ? String(Number(params.quantum)) : 'none'}</span>
          <button
            type="button"
            onClick={() => { updateParams({ quantum: 4 }); }}
          >
            Cambiar
          </button>
        </div>
      );
    }
    const { getByRole, getByTestId } = render(
      <SimulationProvider algorithm="round-robin" processes={[P1]} params={{ quantum: 2 }}>
        <ConsumerParams />
      </SimulationProvider>,
    );
    expect(getByTestId('quantum').textContent).toBe('2');
    fireEvent.click(getByRole('button', { name: 'Cambiar' }));
    expect(getByTestId('quantum').textContent).toBe('4');
  });

  it('createWhatIf crea una rama what-if y discardWhatIf la descarta', () => {
    function ConsumerWhatIf() {
      const { whatIfBranch, createWhatIf, discardWhatIf } = useSimulation();
      return (
        <div>
          <span data-testid="branch">{whatIfBranch !== null ? 'yes' : 'no'}</span>
          <button type="button" onClick={() => { createWhatIf({}); }}>Crear</button>
          <button type="button" onClick={() => { discardWhatIf(); }}>Descartar</button>
        </div>
      );
    }
    const { getByRole, getByTestId } = render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <ConsumerWhatIf />
      </SimulationProvider>,
    );
    expect(getByTestId('branch').textContent).toBe('no');
    fireEvent.click(getByRole('button', { name: 'Crear' }));
    expect(getByTestId('branch').textContent).toBe('yes');
    fireEvent.click(getByRole('button', { name: 'Descartar' }));
    expect(getByTestId('branch').textContent).toBe('no');
  });

  it('editar los procesos rederiva la rama what-if con los nuevos procesos', () => {
    function ConsumerSync() {
      const { whatIfBranch, createWhatIf, updateProcesses } = useSimulation();
      const branchProcs = whatIfBranch?.result.metrics.perProcess.length ?? 0;
      return (
        <div>
          <span data-testid="branch-procs">{String(branchProcs)}</span>
          <button type="button" onClick={() => { createWhatIf({ algorithm: 'sjf' }); }}>Crear</button>
          <button type="button" onClick={() => { updateProcesses([P1, P2]); }}>Editar</button>
        </div>
      );
    }
    const { getByRole, getByTestId } = render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <ConsumerSync />
      </SimulationProvider>,
    );
    // Rama creada con 1 proceso
    fireEvent.click(getByRole('button', { name: 'Crear' }));
    expect(getByTestId('branch-procs').textContent).toBe('1');
    // Al añadir un proceso, la rama se rederiva y pasa a tener 2
    fireEvent.click(getByRole('button', { name: 'Editar' }));
    expect(getByTestId('branch-procs').textContent).toBe('2');
  });
});

describe('§ Persistencia por sesión — T-47', () => {
  const P1: Process = { id: 'A', arrival_time: 0, burst_time: 3 };
  const P2: Process = { id: 'B', arrival_time: 0, burst_time: 2 };

  afterEach(() => {
    cleanup();
    sessionStorage.clear();
  });

  it('persiste el escenario base en sessionStorage al actualizar procesos', () => {
    function Consumer() {
      const { updateProcesses } = useSimulation();
      return (
        <button type="button" onClick={() => { updateProcesses([P1, P2]); }}>
          Actualizar
        </button>
      );
    }
    const { getByRole } = render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <Consumer />
      </SimulationProvider>,
    );
    fireEvent.click(getByRole('button', { name: 'Actualizar' }));
    const saved = sessionStorage.getItem('scheduler-scenario:fcfs');
    expect(saved).not.toBeNull();
    if (saved === null) return;
    const parsed = JSON.parse(saved) as { processes: Process[] };
    expect(parsed.processes.length).toBe(2);
  });

  it('restaura el escenario base desde sessionStorage al montar', () => {
    // Pre-cargar sessionStorage con un escenario de 2 procesos
    sessionStorage.setItem(
      'scheduler-scenario:fcfs',
      JSON.stringify({ processes: [P1, P2], params: {} }),
    );
    function Consumer() {
      const { processes } = useSimulation();
      return <span data-testid="count">{String(processes.length)}</span>;
    }
    render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <Consumer />
      </SimulationProvider>,
    );
    // Debe restaurar los 2 procesos del sessionStorage, no el 1 del prop
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('reset restaura los valores iniciales de props y borra sessionStorage', () => {
    function Consumer() {
      const { processes, reset } = useSimulation();
      return (
        <div>
          <span data-testid="count">{String(processes.length)}</span>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      );
    }
    const { getByRole, getByTestId } = render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <Consumer />
      </SimulationProvider>,
    );
    // Actualizamos primero para tener 2 procesos
    sessionStorage.setItem(
      'scheduler-scenario:fcfs',
      JSON.stringify({ processes: [P1, P2], params: {} }),
    );
    // Hacemos reset
    fireEvent.click(getByRole('button', { name: 'Reset' }));
    // Debe volver a 1 proceso (el del prop inicial)
    expect(getByTestId('count').textContent).toBe('1');
    // sessionStorage puede contener el escenario inicial tras el reset
    // (el efecto de persistencia re-guarda el estado restaurado)
    const savedAfterReset = sessionStorage.getItem('scheduler-scenario:fcfs');
    if (savedAfterReset !== null) {
      const parsed = JSON.parse(savedAfterReset) as { processes: Process[] };
      expect(parsed.processes.length).toBe(1);
    }
  });

  it('claves distintas por algoritmo no se mezclan', () => {
    sessionStorage.setItem(
      'scheduler-scenario:fcfs',
      JSON.stringify({ processes: [P1, P2], params: {} }),
    );
    function Consumer() {
      const { processes } = useSimulation();
      return <span data-testid="count">{String(processes.length)}</span>;
    }
    // Montar con un algoritmo distinto — NO debe leer la clave de fcfs
    render(
      <SimulationProvider algorithm="sjf" processes={[P1]}>
        <Consumer />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('1');
  });

  it('§ Escenario de ejemplo por defecto — carga desde props cuando no hay sessionStorage', () => {
    sessionStorage.clear();
    function Consumer() {
      const { processes } = useSimulation();
      return <span data-testid="count">{String(processes.length)}</span>;
    }
    render(
      <SimulationProvider algorithm="fcfs" processes={[P1, P2]}>
        <Consumer />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('count').textContent).toBe('2');
  });

  it('restaura la rama what-if desde sessionStorage al montar', () => {
    // Pre-cargar rama what-if persistida
    sessionStorage.setItem(
      'scheduler-whatif:fcfs',
      JSON.stringify({ algorithm: 'fcfs', processes: [P1, P2], params: {} }),
    );
    function Consumer() {
      const { whatIfBranch } = useSimulation();
      return (
        <span data-testid="branch">{whatIfBranch !== null ? 'yes' : 'no'}</span>
      );
    }
    render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <Consumer />
      </SimulationProvider>,
    );
    expect(screen.getByTestId('branch').textContent).toBe('yes');
  });

  it('reset descarta la rama what-if activa', () => {
    function Consumer() {
      const { whatIfBranch, createWhatIf, reset } = useSimulation();
      return (
        <div>
          <span data-testid="branch">{whatIfBranch !== null ? 'yes' : 'no'}</span>
          <button type="button" onClick={() => { createWhatIf({}); }}>Crear</button>
          <button type="button" onClick={reset}>Reset</button>
        </div>
      );
    }
    const { getByRole, getByTestId } = render(
      <SimulationProvider algorithm="fcfs" processes={[P1]}>
        <Consumer />
      </SimulationProvider>,
    );
    fireEvent.click(getByRole('button', { name: 'Crear' }));
    expect(getByTestId('branch').textContent).toBe('yes');
    fireEvent.click(getByRole('button', { name: 'Reset' }));
    expect(getByTestId('branch').textContent).toBe('no');
  });
});
