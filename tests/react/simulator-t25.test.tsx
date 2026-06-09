import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';

afterEach(cleanup);
import { Simulator } from '../../src/react/Simulator.js';

describe('T-25 — Simulator: integración con core', () => {
  it('BEHAVIOURS § Conjunto vacío: sin procesos → estado vacío sin error', () => {
    render(<Simulator algorithm="fcfs" processes={[]} />);
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
  });

  it('BEHAVIOURS § Configuración inválida: burst_time=0 → muestra error sin simular', () => {
    render(
      <Simulator
        algorithm="fcfs"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 0 }]}
      />,
    );
    expect(screen.getByRole('alert')).toHaveTextContent('La ráfaga debe ser mayor que 0');
    expect(screen.queryByTestId('simulator')).not.toBeInTheDocument();
  });

  it('BEHAVIOURS § Escenario de ejemplo: FCFS P1(0,3) P2(2,2) → renderiza simulación', () => {
    render(
      <Simulator
        algorithm="fcfs"
        processes={[
          { id: 'P1', arrival_time: 0, burst_time: 3 },
          { id: 'P2', arrival_time: 2, burst_time: 2 },
        ]}
      />,
    );
    expect(screen.getByTestId('simulator')).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    // El gráfico de Gantt muestra P1[0–3] y P2[3–5]
    expect(screen.getByTestId('interval-P1-0-3')).toBeInTheDocument();
    expect(screen.getByTestId('interval-P2-3-5')).toBeInTheDocument();
  });
});
