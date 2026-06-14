// Tests T-28 — PlaybackControls
import { describe, it, expect, vi } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import React from 'react';
import '../../src/index.js';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';
import type { Process } from '../../src/core/types/process.js';

const procs: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 2 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('PlaybackControls', () => {
  it('Renderiza botones ⏮ ◀ ▶ ▶| ⏭ y barra y indicador de tick', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText('Ir al inicio')).toBeDefined();
    expect(screen.getByLabelText('Retroceder')).toBeDefined();
    expect(screen.getByLabelText('Reproducir')).toBeDefined();
    expect(screen.getByLabelText('Avanzar')).toBeDefined();
    expect(screen.getByLabelText('Ir al final')).toBeDefined();
    expect(screen.getByLabelText('Barra de progreso')).toBeDefined();
    expect(screen.getByText(/Tick:/)).toBeDefined();
  });

  it('Tick 0 → ⏮ y ◀ disabled', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect((screen.getByLabelText('Ir al inicio')).disabled).toBe(true);
    expect((screen.getByLabelText('Retroceder')).disabled).toBe(true);
  });

  it('Último tick → ▶| y ⏭ disabled', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByLabelText('Ir al final').click();
    });
    expect((screen.getByLabelText('Avanzar')).disabled).toBe(true);
    expect((screen.getByLabelText('Ir al final')).disabled).toBe(true);
  });

  it('Tick intermedio → botones de avance y retroceso habilitados', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    act(() => {
      screen.getByLabelText('Avanzar').click();
    });
    expect((screen.getByLabelText('Ir al inicio')).disabled).toBe(false);
    expect((screen.getByLabelText('Retroceder')).disabled).toBe(false);
    expect((screen.getByLabelText('Avanzar')).disabled).toBe(false);
    expect((screen.getByLabelText('Ir al final')).disabled).toBe(false);
  });

  it('Sin procesos (result null) → tick 0/0 y botones de avance deshabilitados', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByText('Tick: 0 / 0')).toBeDefined();
    expect((screen.getByLabelText('Avanzar')).disabled).toBe(true);
    expect((screen.getByLabelText('Ir al final')).disabled).toBe(true);
  });

  it('Reproducción automática llega al último tick → se detiene (playing=false)', () => {
    let time = 0;
    const rafCallbacks: ((t: number) => void)[] = [];
    const rafSpy = vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation((cb) => {
      rafCallbacks.push(cb);
      return rafCallbacks.length;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => { /* noop */ });

    render(
      <SimulationProvider algorithm="fcfs" processes={procs}>
        <PlaybackControls />
      </SimulationProvider>,
    );

    // Iniciar reproducción
    act(() => {
      screen.getByLabelText('Reproducir').click();
    });

    // Simular frames hasta que el botón vuelva a ser "Reproducir"
    for (let i = 0; i < 20; i++) {
      act(() => {
        time += 1100;
        const cbs = rafCallbacks.splice(0);
        for (const cb of cbs) cb(time);
      });
      if (screen.queryByLabelText('Pausar') === null) break;
    }

    expect(screen.queryByLabelText('Pausar')).toBeNull();
    expect(screen.getByLabelText('Reproducir')).toBeDefined();

    rafSpy.mockRestore();
  });
});
