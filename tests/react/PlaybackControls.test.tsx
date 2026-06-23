import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';
import { register } from '../../src/core/registry.js';
import { FCFS } from '../../src/core/algorithms/non-preemptive/fcfs.js';

beforeAll(() => {
  register(new FCFS());
});

function wrap(processes: Parameters<typeof SimulationProvider>[0]['processes'] = []) {
  return render(
    <SimulationProvider algorithm="fcfs" processes={processes}>
      <PlaybackControls />
    </SimulationProvider>,
  );
}

describe('PlaybackControls — T-41', () => {
  it('renderiza botones y barra de desplazamiento', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    expect(screen.getByRole('button', { name: /ir al inicio/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /paso atrás/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /reproducir/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /paso adelante/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ir al final/i })).toBeTruthy();
    expect(screen.getByRole('slider')).toBeTruthy();
  });

  it('en tick 0 botones de retroceso deshabilitados', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    const back = screen.getByRole('button', { name: /paso atrás/i });
    const first = screen.getByRole('button', { name: /ir al inicio/i });
    expect(back).toBeDisabled();
    expect(first).toBeDisabled();
  });

  it('en tick 0 botones de avance habilitados', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    const fwd = screen.getByRole('button', { name: /paso adelante/i });
    expect(fwd).not.toBeDisabled();
  });

  it('paso adelante avanza el indicador de tick', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    expect(screen.getByText(/Tick: 0 \//)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /paso adelante/i }));
    expect(screen.getByText(/Tick: 1 \//)).toBeTruthy();
  });

  it('sin procesos todos los botones de avance deshabilitados', () => {
    wrap([]);
    expect(screen.getByRole('button', { name: /paso adelante/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /ir al final/i })).toBeDisabled();
  });

  it('muestra indicador Tick: 0 / N', () => {
    wrap([{ id: 'P1', arrival_time: 0, burst_time: 3 }]);
    expect(screen.getByText(/Tick: 0 \/ \d+/)).toBeTruthy();
  });
});
