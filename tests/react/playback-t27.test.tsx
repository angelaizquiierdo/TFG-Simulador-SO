import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, afterEach, vi, beforeEach } from 'vitest';
import React, { useState } from 'react';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';

afterEach(cleanup);

// Componente auxiliar para manejar el estado del tick en los tests
function ControlledPlayback({ initial, max }: { initial: number; max: number }): React.JSX.Element {
  const [tick, setTick] = useState(initial);
  return (
    <>
      <span data-testid="tick-value">{tick}</span>
      <PlaybackControls tick={tick} maxTick={max} onTickChange={setTick} />
    </>
  );
}

describe('T-27 — PlaybackControls: navegación manual', () => {
  it('BEHAVIOURS § Navegación manual: paso adelante desde tick 3 → 4', () => {
    render(<ControlledPlayback initial={3} max={10} />);
    fireEvent.click(screen.getByTestId('btn-step-forward'));
    expect(screen.getByTestId('tick-value')).toHaveTextContent('4');
  });

  it('BEHAVIOURS § Navegación manual: paso atrás desde tick 3 → 2', () => {
    render(<ControlledPlayback initial={3} max={10} />);
    fireEvent.click(screen.getByTestId('btn-step-backward'));
    expect(screen.getByTestId('tick-value')).toHaveTextContent('2');
  });

  it('BEHAVIOURS § Navegación manual: paso atrás en tick 0 → permanece en 0', () => {
    render(<ControlledPlayback initial={0} max={10} />);
    fireEvent.click(screen.getByTestId('btn-step-backward'));
    expect(screen.getByTestId('tick-value')).toHaveTextContent('0');
  });

  it('BEHAVIOURS § Navegación manual: paso adelante en último tick → permanece', () => {
    render(<ControlledPlayback initial={5} max={5} />);
    fireEvent.click(screen.getByTestId('btn-step-forward'));
    expect(screen.getByTestId('tick-value')).toHaveTextContent('5');
  });

  it('BEHAVIOURS § Navegación manual: salto con barra al tick N', () => {
    render(<ControlledPlayback initial={0} max={10} />);
    fireEvent.change(screen.getByTestId('seek-bar'), { target: { value: '7' } });
    expect(screen.getByTestId('tick-value')).toHaveTextContent('7');
  });
});

describe('T-27 — PlaybackControls: reproducción automática (fake timers)', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it('BEHAVIOURS § Reproducción automática: desde 0 avanza al final y se detiene', () => {
    // Con fake timers: simular rAF manualmente
    let rafCallback: ((time: number) => void) | null = null;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);

    render(<ControlledPlayback initial={0} max={2} />);
    act(() => { fireEvent.click(screen.getByTestId('btn-play-forward')); });

    // Simular frames: avanzar 3 veces con 500ms de delta cada vez
    for (let i = 0; i < 3; i++) {
      act(() => { if (rafCallback) rafCallback((i + 1) * 500); });
    }

    // Debe estar en el tick 2 (final)
    expect(screen.getByTestId('tick-value')).toHaveTextContent('2');
  });

  it('BEHAVIOURS § Reproducción automática: desde el final retrocede a 0 y se detiene', () => {
    let rafCallback: ((time: number) => void) | null = null;
    vi.spyOn(globalThis, 'requestAnimationFrame').mockImplementation(cb => {
      rafCallback = cb;
      return 1;
    });
    vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => undefined);

    render(<ControlledPlayback initial={2} max={2} />);
    act(() => { fireEvent.click(screen.getByTestId('btn-play-backward')); });

    for (let i = 0; i < 3; i++) {
      act(() => { if (rafCallback) rafCallback((i + 1) * 500); });
    }

    expect(screen.getByTestId('tick-value')).toHaveTextContent('0');
  });
});
