import React, { useState, useEffect, useLayoutEffect, useRef, useContext } from 'react';
import { SimulationCtx, type SimulationContextValue } from './SimulationContext.js';
import { FirstIcon } from './icons/FirstIcon.js';
import { PreviousIcon } from './icons/PreviousIcon.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { PauseIcon } from './icons/PauseIcon.js';
import { NextIcon } from './icons/NextIcon.js';
import { LastIcon } from './icons/LastIcon.js';
import styles from './style/PlaybackControls.module.css';

/** Velocidad de reproducción: 1 tick por segundo */
const MS_PER_TICK = 1000;

/** Fuente de reproducción: cursor, límites y acciones de navegación. */
export interface PlaybackController {
  readonly currentTick: number;
  readonly lastTick: number;
  readonly hasHistory: boolean;
  stepForward: () => void;
  stepBackward: () => void;
  seekTo: (n: number) => void;
}

function controllerFromContext(ctx: SimulationContextValue | null): PlaybackController {
  if (ctx === null) {
    throw new Error('<PlaybackControls> sin `controller` debe usarse dentro de <SimulationProvider>.');
  }
  const totalTicks = ctx.result?.history.length ?? 0;
  return {
    currentTick: ctx.currentEvent?.tick ?? 0,
    lastTick: Math.max(0, totalTicks - 1),
    hasHistory: totalTicks > 0,
    stepForward: ctx.stepForward,
    stepBackward: ctx.stepBackward,
    seekTo: ctx.seekTo,
  };
}

export interface PlaybackControlsProps {
  /** Controlador externo. Si se omite, se deriva del `SimulationProvider` (simulador principal). */
  readonly controller?: PlaybackController;
  /** Prefijo de `data-testid` (raíz, `-range`, `-tick`). Permite varias instancias. */
  readonly testId?: string;
}

/** Controles de reproducción. */
export function PlaybackControls({
  controller,
  testId = 'playback-controls',
}: PlaybackControlsProps = {}): React.ReactElement {
  const ctx = useContext(SimulationCtx);
  const ctrl = controller ?? controllerFromContext(ctx);

  const { currentTick, lastTick, hasHistory, stepForward, stepBackward, seekTo } = ctrl;

  const atStart = currentTick === 0;
  const atEnd = currentTick >= lastTick;

  const [isPlaying, setIsPlaying] = useState(false);

  const rafIdRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const accumulatedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  const stepFwdRef = useRef(stepForward);
  const currentTickRef = useRef(currentTick);
  const lastTickRef = useRef(lastTick);
  const setPlayingRef = useRef(setIsPlaying);

  useLayoutEffect(() => {
    stepFwdRef.current = stepForward;
    currentTickRef.current = currentTick;
    lastTickRef.current = lastTick;
    setPlayingRef.current = setIsPlaying;
  }, [stepForward, currentTick, lastTick]);

  const loopRef = useRef<FrameRequestCallback | null>(null);

  useEffect(() => {
    loopRef.current = (timestamp: number) => {
      lastTsRef.current ??= timestamp;
      const delta = timestamp - lastTsRef.current;
      lastTsRef.current = timestamp;
      accumulatedRef.current += delta;

      if (accumulatedRef.current >= MS_PER_TICK) {
        accumulatedRef.current -= MS_PER_TICK;
        if (currentTickRef.current < lastTickRef.current) {
          stepFwdRef.current();
        } else {
          setPlayingRef.current(false);
          return;
        }
      }
      if (loopRef.current !== null) {
        rafIdRef.current = requestAnimationFrame(loopRef.current);
      }
    };
  });

  useEffect(() => {
    const running = isPlaying && !atEnd;
    if (running) {
      lastTsRef.current = null;
      accumulatedRef.current = 0;
      if (loopRef.current !== null) {
        rafIdRef.current = requestAnimationFrame(loopRef.current);
      }
    } else if (rafIdRef.current !== null) {
      cancelAnimationFrame(rafIdRef.current);
      rafIdRef.current = null;
    }
    return () => {
      if (rafIdRef.current !== null) {
        cancelAnimationFrame(rafIdRef.current);
        rafIdRef.current = null;
      }
    };
  }, [isPlaying, atEnd]);

  // Handlers de botones
  const handlePlayPause = () => { setIsPlaying((p) => !p); };
  const handleFirst = () => { seekTo(0); setIsPlaying(false); };
  const handleLast = () => { seekTo(lastTick); setIsPlaying(false); };
  const handlePrev = () => { stepBackward(); setIsPlaying(false); };
  const handleNext = () => { stepForward(); };
  const handleRange = (e: React.ChangeEvent<HTMLInputElement>) => {
    seekTo(Number(e.target.value));
    setIsPlaying(false);
  };

  return (
    <div className={styles.controls} data-testid={testId}>
      {/* Botones: Inicio · Anterior · Play/Pausa · Siguiente · Final */}
      <div className={styles.buttons}>
        <button
          className={styles.btn}
          onClick={handleFirst}
          disabled={!hasHistory || atStart}
          aria-label="Ir al inicio"
          type="button"
        >
          <FirstIcon />
        </button>
        <button
          className={styles.btn}
          onClick={handlePrev}
          disabled={!hasHistory || atStart}
          aria-label="Paso atrás"
          type="button"
        >
          <PreviousIcon />
        </button>
        <button
          className={styles.btn}
          onClick={handlePlayPause}
          disabled={!hasHistory || atEnd}
          aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
          type="button"
        >
          {isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          className={styles.btn}
          onClick={handleNext}
          disabled={!hasHistory || atEnd}
          aria-label="Paso adelante"
          type="button"
        >
          <NextIcon />
        </button>
        <button
          className={styles.btn}
          onClick={handleLast}
          disabled={!hasHistory || atEnd}
          aria-label="Ir al final"
          type="button"
        >
          <LastIcon />
        </button>
      </div>

      {/* Barra de desplazamiento */}
      <input
        type="range"
        className={styles.range}
        min={0}
        max={lastTick}
        value={currentTick}
        onChange={handleRange}
        disabled={!hasHistory}
        aria-label="Posición en la simulación"
        data-testid={`${testId}-range`}
      />

      {/* Indicador de tick */}
      <div className={styles.tickIndicator} data-testid={`${testId}-tick`}>
        {`Tick: ${String(currentTick)} / ${String(lastTick)}`}
      </div>
    </div>
  );
}
