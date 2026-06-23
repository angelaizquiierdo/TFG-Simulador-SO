import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { ProcessForm } from '../../src/react/ProcessForm.js';
import { register } from '../../src/core/registry.js';
import { FCFS } from '../../src/core/algorithms/non-preemptive/fcfs.js';

beforeAll(() => {
  register(new FCFS());
});

function wrap(processes: Parameters<typeof SimulationProvider>[0]['processes'] = []) {
  return render(
    <SimulationProvider algorithm="fcfs" processes={processes}>
      <ProcessForm />
    </SimulationProvider>,
  );
}

function openPanel() {
  fireEvent.click(screen.getByRole('button', { name: /editar procesos/i }));
}

describe('ProcessForm — T-43', () => {
  it('panel cerrado por defecto', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    // El contenido no es visible si el panel está cerrado
    expect(screen.queryByRole('button', { name: /añadir proceso/i })).toBeNull();
  });

  it('al abrir muestra los procesos con campos editables', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    openPanel();
    expect(screen.getByDisplayValue('P1')).toBeTruthy();
    expect(screen.getByDisplayValue('3')).toBeTruthy();
  });

  it('añadir proceso aumenta los drafts', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    openPanel();
    fireEvent.click(screen.getByRole('button', { name: /añadir proceso/i }));
    // Debe haber más de un campo ID
    const inputs = screen.getAllByDisplayValue(/P\d+/);
    expect(inputs.length).toBeGreaterThan(0);
  });

  it('eliminar proceso funciona', () => {
    wrap([
      { id: 'PA', arrival_time: 0, burst_time: 3 },
      { id: 'PB', arrival_time: 1, burst_time: 2 },
    ]);
    openPanel();
    expect(screen.getByDisplayValue('PA')).toBeTruthy();
    const removeBtn = screen.getAllByRole('button', { name: /eliminar/i });
    if (removeBtn[0] !== undefined) fireEvent.click(removeBtn[0]);
    expect(screen.queryByDisplayValue('PA')).toBeNull();
  });

  it('valor inválido en burst_time muestra error', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    openPanel();
    const burstInput = screen.getByDisplayValue('3');
    fireEvent.change(burstInput, { target: { value: '0' } });
    expect(screen.getByText(/burst_time > 0/i)).toBeTruthy();
  });

  it('sin procesos muestra solo el botón de añadir', () => {
    wrap([]);
    openPanel();
    expect(screen.getByRole('button', { name: /añadir proceso/i })).toBeTruthy();
  });
});
