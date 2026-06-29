import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { useSimulation } from './SimulationContext.js';
import { FirstIcon } from './icons/FirstIcon.js';
import { PreviousIcon } from './icons/PreviousIcon.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { PauseIcon } from './icons/PauseIcon.js';
import { NextIcon } from './icons/NextIcon.js';
import { LastIcon } from './icons/LastIcon.js';
import styles from './style/PlaybackControls.module.css';

/** Velocidad de reproducción: 1 tick por segundo */
const MS_PER_TICK = 1000;

/**
 * Controles de reproducción del simulador.
 * ÚNICO componente con requestAnimationFrame y deltaTime.
 */
export function PlaybackControls(): React.ReactElement {
  const { result, currentEvent, stepForward, stepBackward, seekTo } = useSimulation();

  const totalTicks = result?.history.length ?? 0;
  const lastTick = Math.max(0, totalTicks - 1);
  const currentTick = currentEvent?.tick ?? 0;

  const atStart = currentTick === 0;
  const atEnd = currentTick >= lastTick;
  const hasHistory = totalTicks > 0;

  const [isPlaying, setIsPlaying] = useState(false);

  // Refs para el loop RAF — solo se leen/escriben en effects, nunca en render
  const rafIdRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);
  const accumulatedRef = useRef(0);
  const lastTsRef = useRef<number | null>(null);

  // Refs que capturan los valores más recientes para el closure RAF
  // Se actualizan en useLayoutEffect (no en render)
  const stepFwdRef = useRef(stepForward);
  const currentTickRef = useRef(currentTick);
  const lastTickRef = useRef(lastTick);
  const setPlayingRef = useRef(setIsPlaying);

  // Sync de refs cuando cambian los valores capturados — en layoutEffect, nunca en
  // render. `setIsPlaying` es estable (setter de useState), por eso no va en las deps.
  useLayoutEffect(() => {
    stepFwdRef.current = stepForward;
    currentTickRef.current = currentTick;
    lastTickRef.current = lastTick;
    setPlayingRef.current = setIsPlaying;
  }, [stepForward, currentTick, lastTick]);

  // Ref que almacena la función RAF (evita la referencia circular)
  const loopRef = useRef<FrameRequestCallback | null>(null);

  // Definir el loop en un effect (no en render)
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
          // Llegamos al final: pausar
          setPlayingRef.current(false);
          return;
        }
      }
      if (loopRef.current !== null) {
        rafIdRef.current = requestAnimationFrame(loopRef.current);
      }
    };
  });

  // Arrancar/detener el loop según isPlaying y atEnd
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
    <div className={styles.controls} data-testid="playback-controls">
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

      {/* Barra de desplazamiento que abarca todo el ancho */}
      <input
        type="range"
        className={styles.range}
        min={0}
        max={lastTick}
        value={currentTick}
        onChange={handleRange}
        disabled={!hasHistory}
        aria-label="Posición en la simulación"
        data-testid="playback-range"
      />

      {/* Indicador de tick: formato estricto "Tick: N / Total" */}
      <div className={styles.tickIndicator} data-testid="playback-tick">
        {`Tick: ${String(currentTick)} / ${String(lastTick)}`}
      </div>
    </div>
  );
}
