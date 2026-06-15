// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect } from 'vitest';
import { afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
afterEach(cleanup);
import { SimulationProvider } from '../../src/index.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';

const processes = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('T-28 · PlaybackControls', () => {
  it('muestra los 5 botones de control', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText('Ir al inicio')).toBeInTheDocument();
    expect(screen.getByLabelText('Paso atrás')).toBeInTheDocument();
    expect(screen.getByLabelText('Reproducir')).toBeInTheDocument();
    expect(screen.getByLabelText('Paso adelante')).toBeInTheDocument();
    expect(screen.getByLabelText('Ir al final')).toBeInTheDocument();
  });

  it('en tick 0: botones de retroceso deshabilitados', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText('Paso atrás')).toBeDisabled();
    expect(screen.getByLabelText('Ir al inicio')).toBeDisabled();
  });

  it('paso adelante avanza el tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    const fwd = screen.getByLabelText('Paso adelante');
    fireEvent.click(fwd);
    expect(screen.getByText(/Tick: 1/)).toBeInTheDocument();
  });

  it('sin procesos: todos los botones de avance deshabilitados', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText('Paso adelante')).toBeDisabled();
    expect(screen.getByLabelText('Ir al final')).toBeDisabled();
    expect(screen.getByLabelText('Reproducir')).toBeDisabled();
  });

  it('muestra indicador de tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByText(/Tick: 0/)).toBeInTheDocument();
  });
});
