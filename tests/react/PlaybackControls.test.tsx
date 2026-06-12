// @vitest-environment jsdom
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';

afterEach(() => { cleanup(); });

// P1(0,3), P2(1,2) con FCFS → 5 ticks (0..4)
const processes = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('PlaybackControls', () => {
  it('BEHAVIOURS § Renderizado — PlaybackControls: muestra los 5 botones y la barra', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByRole('button', { name: /ir al inicio/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /paso atrás/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /reproducir|pausar/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /paso adelante/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /ir al final/i })).toBeTruthy();
    expect(screen.getByRole('slider')).toBeTruthy();
  });

  it('BEHAVIOURS § Renderizado — PlaybackControls: en tick 0 los botones atrás e inicio están deshabilitados', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    expect(screen.getByRole('button', { name: /paso atrás/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /ir al inicio/i }).hasAttribute('disabled')).toBe(true);
  });

  it('BEHAVIOURS § Renderizado — PlaybackControls: en último tick los botones adelante y final están deshabilitados', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '4' } });
    expect(screen.getByRole('button', { name: /paso adelante/i }).hasAttribute('disabled')).toBe(true);
    expect(screen.getByRole('button', { name: /ir al final/i }).hasAttribute('disabled')).toBe(true);
  });

  it('BEHAVIOURS § Navegación manual: paso adelante avanza el tick', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    const indicator = screen.getByLabelText('tick actual');
    expect(indicator.textContent).toContain('Tick: 0');
    fireEvent.click(screen.getByRole('button', { name: /paso adelante/i }));
    expect(indicator.textContent).toContain('Tick: 1');
  });

  it('BEHAVIOURS § Renderizado — PlaybackControls: tick intermedio — todos los botones habilitados', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    expect(screen.getByRole('button', { name: /paso atrás/i }).hasAttribute('disabled')).toBe(false);
    expect(screen.getByRole('button', { name: /paso adelante/i }).hasAttribute('disabled')).toBe(false);
  });

  it('BEHAVIOURS § Reproducción automática: click ir al final va al último tick', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /ir al final/i }));
    expect(screen.getByLabelText('tick actual').textContent).toContain('Tick: 4');
  });

  it('BEHAVIOURS § Reproducción automática: click ir al inicio vuelve a tick 0', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /ir al inicio/i }));
    expect(screen.getByLabelText('tick actual').textContent).toContain('Tick: 0');
  });

  it('BEHAVIOURS § Navegación manual: paso atrás desde tick 2 va a tick 1', () => {
    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );
    fireEvent.change(screen.getByRole('slider'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: /paso atrás/i }));
    expect(screen.getByLabelText('tick actual').textContent).toContain('Tick: 1');
  });

  it('BEHAVIOURS § Reproducción automática: RAF avanza tick al reproducir', () => {
    let storedCb: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { storedCb = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );

    act(() => { fireEvent.click(screen.getByRole('button', { name: /reproducir/i })); });
    act(() => { storedCb?.(600); });

    expect(screen.getByLabelText('tick actual').textContent).toContain('Tick: 1');
    vi.unstubAllGlobals();
  });

  it('BEHAVIOURS § Reproducción automática: al llegar al final la reproducción se detiene', () => {
    // Avanzamos tick a tick con RAF desde el inicio hasta que atEnd dispara setPlaying(false)
    let storedCb: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { storedCb = cb; return 1; });
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );

    // Iniciar reproducción desde tick 0
    act(() => { fireEvent.click(screen.getByRole('button', { name: /reproducir/i })); });
    // 4 avances: 0→1, 1→2, 2→3, 3→4 (al llegar a 4, atEnd=true y effect re-runs)
    act(() => { storedCb?.(600); });
    act(() => { storedCb?.(1200); });
    act(() => { storedCb?.(1800); });
    act(() => { storedCb?.(2400); });
    // El effect re-corrió con atEnd=true; este disparo llama setPlaying(false)
    act(() => { storedCb?.(3000); });

    expect(screen.getByRole('button', { name: /reproducir/i })).toBeTruthy();
    vi.unstubAllGlobals();
  });

  it('BEHAVIOURS § Reproducción automática: pausar detiene la reproducción', () => {
    vi.stubGlobal('requestAnimationFrame', vi.fn().mockReturnValue(1));
    vi.stubGlobal('cancelAnimationFrame', vi.fn());

    render(
      <SimulationProvider algorithm="FCFS" processes={processes}>
        <PlaybackControls />
      </SimulationProvider>,
    );

    act(() => { fireEvent.click(screen.getByRole('button', { name: /reproducir/i })); });
    act(() => { fireEvent.click(screen.getByRole('button', { name: /pausar/i })); });

    expect(screen.getByRole('button', { name: /reproducir/i })).toBeTruthy();
    vi.unstubAllGlobals();
  });
});
