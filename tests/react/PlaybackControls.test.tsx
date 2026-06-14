// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';

afterEach(() => { cleanup(); });

const PROCESSES = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 2, burst_time: 2 },
];

describe('PlaybackControls — T-28', () => {
  it('muestra los cinco botones, barra e indicador de tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText('Ir al inicio')).toBeTruthy();
    expect(screen.getByLabelText('Paso atrás')).toBeTruthy();
    expect(screen.getByLabelText('Reproducir')).toBeTruthy();
    expect(screen.getByLabelText('Paso adelante')).toBeTruthy();
    expect(screen.getByLabelText('Ir al final')).toBeTruthy();
    expect(screen.getByLabelText('Barra de progreso')).toBeTruthy();
    expect(screen.getByText(/Tick:/)).toBeTruthy();
  });

  it('en tick 0 los botones atrás e inicio están deshabilitados', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText('Paso atrás').hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Ir al inicio').hasAttribute('disabled')).toBe(true);
  });

  it('paso adelante avanza el tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByText('Tick: 0 / 4')).toBeTruthy();
    fireEvent.click(screen.getByLabelText('Paso adelante'));
    expect(screen.getByText('Tick: 1 / 4')).toBeTruthy();
  });

  it('paso atrás retrocede el tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByLabelText('Paso adelante'));
    fireEvent.click(screen.getByLabelText('Paso adelante'));
    fireEvent.click(screen.getByLabelText('Paso atrás'));
    expect(screen.getByText('Tick: 1 / 4')).toBeTruthy();
  });

  it('sin procesos todos los botones de avance están deshabilitados', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText('Paso adelante').hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Ir al final').hasAttribute('disabled')).toBe(true);
    expect(screen.getByText('Tick: 0 / 0')).toBeTruthy();
  });

  it('ir al final salta al último tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={PROCESSES}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByLabelText('Ir al final'));
    // PROCESSES con FCFS produce 5 ticks (0-4)
    expect(screen.getByText('Tick: 4 / 4')).toBeTruthy();
    expect(screen.getByLabelText('Paso adelante').hasAttribute('disabled')).toBe(true);
    expect(screen.getByLabelText('Ir al final').hasAttribute('disabled')).toBe(true);
  });
});
