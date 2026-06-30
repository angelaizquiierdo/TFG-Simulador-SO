// @vitest-environment jsdom
/**
 * T-42 — PlaybackControls
 *
 * Cierra: § Reproducción automática, § Navegación manual, § Render — PlaybackControls,
 *         § Iconos SVG, § Tamaño consistente de botones
 */
import React from 'react';
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue } from '../../src/react/SimulationContext.js';
import { PlaybackControls } from '../../src/react/PlaybackControls.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
import type { Process } from '../../src/core/types/process.js';
import '../../src/index.js';

const PROCS: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 0, burst_time: 2 },
];

/** Construye un valor de contexto mutable para los tests de navegación */
function makeCtxValue(tickOverride = 0): {
  value: SimulationContextValue;
  stepForward: ReturnType<typeof vi.fn>;
  stepBackward: ReturnType<typeof vi.fn>;
  seekTo: ReturnType<typeof vi.fn>;
} {
  const result = run(PROCS, { algorithm: 'fcfs' });
  const player = new Player(result.history);
  const stepForward = vi.fn();
  const stepBackward = vi.fn();
  const seekTo = vi.fn();
  const value: SimulationContextValue = {
    result,
    currentEvent: result.history[tickOverride],
    player,
    error: null,
    whatIfBranch: null,
    processes: PROCS,
    algorithmName: 'fcfs',
    requires: {},
    params: {},
    stepForward,
    stepBackward,
    seekTo,
    updateProcesses: () => undefined,
    updateParams: () => undefined,
    createWhatIf: () => undefined,
    discardWhatIf: () => undefined,
    reset: () => undefined,
  };
  return { value, stepForward, stepBackward, seekTo };
}

function renderControls(tickOverride = 0) {
  const mocks = makeCtxValue(tickOverride);
  render(
    <SimulationCtx.Provider value={mocks.value}>
      <PlaybackControls />
    </SimulationCtx.Provider>,
  );
  return mocks;
}

describe('§ Render — PlaybackControls', () => {
  afterEach(() => { cleanup(); });

  it('renderiza el contenedor con data-testid="playback-controls"', () => {
    renderControls();
    expect(screen.getByTestId('playback-controls')).toBeInTheDocument();
  });

  it('muestra exactamente 5 botones en orden correcto', () => {
    renderControls();
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(5);
    expect(buttons[0]).toHaveAttribute('aria-label', 'Ir al inicio');
    expect(buttons[1]).toHaveAttribute('aria-label', 'Paso atrás');
    // Botón 2: Play o Pausa según estado
    expect(buttons[3]).toHaveAttribute('aria-label', 'Paso adelante');
    expect(buttons[4]).toHaveAttribute('aria-label', 'Ir al final');
  });

  it('§ Iconos SVG: cada botón contiene un elemento <svg>', () => {
    renderControls();
    const buttons = screen.getAllByRole('button');
    buttons.forEach((btn) => {
      expect(btn.querySelector('svg')).not.toBeNull();
    });
  });

  it('§ Tamaño consistente de botones: todos los botones tienen la misma clase', () => {
    renderControls();
    const buttons = screen.getAllByRole('button');
    const classes = buttons.map((b) => b.className);
    // Todos deben compartir la misma clase CSS
    expect(new Set(classes).size).toBe(1);
  });

  it('muestra el indicador de tick con formato "Tick: N / Total"', () => {
    renderControls(0);
    expect(screen.getByTestId('playback-controls-tick').textContent).toMatch(/Tick:\s*0\s*\/\s*\d+/);
  });

  it('muestra el input range vinculado al tick actual', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const totalTicks = result.history.length;
    renderControls(0);
    const range = screen.getByTestId('playback-controls-range');
    expect(range).toHaveAttribute('type', 'range');
    expect(range).toHaveAttribute('min', '0');
    expect(range).toHaveAttribute('max', String(totalTicks - 1));
    expect(range).toHaveAttribute('value', '0');
  });
});

describe('§ Navegación manual', () => {
  afterEach(() => { cleanup(); });

  it('botón "Paso adelante" llama a stepForward()', () => {
    const { stepForward } = renderControls(0);
    const nextBtn = screen.getByRole('button', { name: 'Paso adelante' });
    fireEvent.click(nextBtn);
    expect(stepForward).toHaveBeenCalledTimes(1);
  });

  it('botón "Paso atrás" llama a stepBackward()', () => {
    const { value, stepBackward } = makeCtxValue(2);
    render(
      <SimulationCtx.Provider value={value}>
        <PlaybackControls />
      </SimulationCtx.Provider>,
    );
    const prevBtn = screen.getByRole('button', { name: 'Paso atrás' });
    fireEvent.click(prevBtn);
    expect(stepBackward).toHaveBeenCalledTimes(1);
  });

  it('botón "Ir al inicio" llama a seekTo(0)', () => {
    const { value, seekTo } = makeCtxValue(2);
    render(
      <SimulationCtx.Provider value={value}>
        <PlaybackControls />
      </SimulationCtx.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ir al inicio' }));
    expect(seekTo).toHaveBeenCalledWith(0);
  });

  it('botón "Ir al final" llama a seekTo(lastTick)', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const lastTick = result.history.length - 1;
    const { value, seekTo } = makeCtxValue(0);
    render(
      <SimulationCtx.Provider value={value}>
        <PlaybackControls />
      </SimulationCtx.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Ir al final' }));
    expect(seekTo).toHaveBeenCalledWith(lastTick);
  });

  it('cambiar el range llama a seekTo con el valor seleccionado', () => {
    const { seekTo } = renderControls(0);
    const range = screen.getByTestId('playback-controls-range');
    fireEvent.change(range, { target: { value: '2' } });
    expect(seekTo).toHaveBeenCalledWith(2);
  });
});

describe('§ Estados deshabilitados', () => {
  afterEach(() => { cleanup(); });

  it('botones "Ir al inicio" y "Paso atrás" están disabled en el tick 0', () => {
    renderControls(0);
    expect(screen.getByRole('button', { name: 'Ir al inicio' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Paso atrás' })).toBeDisabled();
  });

  it('botones "Paso adelante", "Ir al final" y "Reproducir" están disabled en el último tick', () => {
    const result = run(PROCS, { algorithm: 'fcfs' });
    const lastTick = result.history.length - 1;
    const { value } = makeCtxValue(lastTick);
    render(
      <SimulationCtx.Provider value={value}>
        <PlaybackControls />
      </SimulationCtx.Provider>,
    );
    expect(screen.getByRole('button', { name: 'Paso adelante' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Ir al final' })).toBeDisabled();
    // Play/Pause deshabilitado en el último tick
    const playBtn = screen.getAllByRole('button')[2];
    expect(playBtn).toBeDisabled();
  });
});

describe('§ Reproducción automática', () => {
  afterEach(() => { cleanup(); });

  it('botón "Reproducir" muestra PlayIcon (svg) cuando está pausado', () => {
    renderControls(0);
    // El botón Play/Pausa es el tercero (índice 2) — usar aria-label directo
    const playBtn = screen.getByRole('button', { name: 'Reproducir' });
    expect(playBtn).toBeInTheDocument();
    expect(playBtn.querySelector('svg')).not.toBeNull();
  });

  it('al hacer clic en Reproducir, el aria-label cambia a "Pausar"', () => {
    renderControls(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' }));
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument();
  });

  it('al hacer clic en Pausar (durante reproducción), el aria-label vuelve a "Reproducir"', () => {
    renderControls(0);
    fireEvent.click(screen.getByRole('button', { name: 'Reproducir' })); // → Pausar
    fireEvent.click(screen.getByRole('button', { name: 'Pausar' })); // → Reproducir
    expect(screen.getByRole('button', { name: 'Reproducir' })).toBeInTheDocument();
  });
});

describe('§ PlaybackControls con `controller` externo (sin contexto)', () => {
  afterEach(() => { cleanup(); });

  function makeController(currentTick: number, lastTick: number) {
    return {
      currentTick,
      lastTick,
      hasHistory: true,
      stepForward: vi.fn(),
      stepBackward: vi.fn(),
      seekTo: vi.fn(),
    };
  }

  it('usa el `testId` parametrizado y el rango/valor del controlador', () => {
    const ctrl = makeController(2, 5);
    render(<PlaybackControls controller={ctrl} testId="whatif-playback" />);
    expect(screen.getByTestId('whatif-playback')).toBeInTheDocument();
    const range = screen.getByTestId('whatif-playback-range');
    expect(range).toHaveAttribute('max', '5');
    expect(range).toHaveAttribute('value', '2');
    expect(screen.getByTestId('whatif-playback-tick').textContent).toMatch(/Tick:\s*2\s*\/\s*5/);
  });

  it('los controles llaman a los handlers del controlador, no al contexto', () => {
    const ctrl = makeController(2, 5);
    render(<PlaybackControls controller={ctrl} testId="whatif-playback" />);
    fireEvent.click(screen.getByRole('button', { name: 'Paso adelante' }));
    expect(ctrl.stepForward).toHaveBeenCalledTimes(1);
    fireEvent.change(screen.getByTestId('whatif-playback-range'), { target: { value: '4' } });
    expect(ctrl.seekTo).toHaveBeenCalledWith(4);
  });
});
