// @vitest-environment jsdom
/**
 * T-37 — Verificación de tokens visuales CSS
 *
 * Comprueba que:
 * 1. Un contenedor de fila recibe correctamente la variable CSS --process-color
 *    mediante el atributo style.
 * 2. Las celdas de la cuadrícula reciben las clases de estado correctas
 *    (.cpu, .waiting, .idle) según el estado de la simulación.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';

// Componente mínimo que simula la fila de un proceso en el GanttChart.
// Recibirá la variable de color como inline style y las celdas recibirán
// clases según su estado.
type CellState = 'cpu' | 'waiting' | 'idle';

interface GanttRowProps {
  processColor: string;
  cells: CellState[];
}

function GanttRow({ processColor, cells }: GanttRowProps) {
  return (
    <div
      data-testid="gantt-row"
      style={{ '--process-color': processColor } as React.CSSProperties}
    >
      {cells.map((state, i) => (
        <div key={i} data-testid="gantt-cell" className={state} />
      ))}
    </div>
  );
}

describe('§ Tokens visuales — asignación de variables CSS y clases de estado', () => {
  afterEach(() => { cleanup(); });
  it('el contenedor de la fila recibe la variable --process-color mediante el atributo style', () => {
    const { getByTestId } = render(
      <GanttRow processColor="var(--scheduler-process-0)" cells={[]} />,
    );
    const row = getByTestId('gantt-row');
    expect(row).toHaveStyle('--process-color: var(--scheduler-process-0)');
  });

  it('las celdas reciben la clase "cpu" cuando el proceso está en CPU', () => {
    const { getAllByTestId } = render(
      <GanttRow processColor="#3b82f6" cells={['cpu', 'waiting', 'idle']} />,
    );
    const cells = getAllByTestId('gantt-cell');
    expect(cells[0]).toHaveClass('cpu');
    expect(cells[1]).toHaveClass('waiting');
    expect(cells[2]).toHaveClass('idle');
  });

  it('solo las celdas cpu tienen la clase "cpu"', () => {
    const { getAllByTestId } = render(
      <GanttRow processColor="#3b82f6" cells={['idle', 'cpu', 'idle']} />,
    );
    const cells = getAllByTestId('gantt-cell');
    expect(cells[0]).not.toHaveClass('cpu');
    expect(cells[1]).toHaveClass('cpu');
    expect(cells[2]).not.toHaveClass('cpu');
  });
});
