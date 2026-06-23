import { useState, useEffect, useRef, useCallback } from 'react';
import { useSimulation } from './SimulationContext.js';
import { FirstIcon } from './icons/FirstIcon.js';
import { PreviousIcon } from './icons/PreviousIcon.js';
import { PlayIcon } from './icons/PlayIcon.js';
import { PauseIcon } from './icons/PauseIcon.js';
import { NextIcon } from './icons/NextIcon.js';
import { LastIcon } from './icons/LastIcon.js';
import styles from './style/PlaybackControls.module.css';

const TICK_INTERVAL_MS = 500;

export function PlaybackControls() {
  const { result, tick, stepForward, stepBackward, goTo } = useSimulation();

  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const maxTick = result ? result.history.length - 1 : 0;
  const atStart = tick === 0;
  const atEnd = tick >= maxTick;

  // Refs para valores que cambian pero que el loop de RAF necesita sin registrarse como deps
  const atEndRef = useRef(false);
  const stepForwardRef = useRef(stepForward);

  useEffect(() => {
    atEndRef.current = atEnd;
  }, [atEnd]);

  useEffect(() => {
    stepForwardRef.current = stepForward;
  }, [stepForward]);

  const stopPlayback = useCallback(() => {
    setPlaying(false);
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
  }, []);

  // Reproducción automática con requestAnimationFrame
  useEffect(() => {
    if (!playing) return;

    const step = (timestamp: number) => {
      lastTimeRef.current ??= timestamp;
      const elapsed = timestamp - lastTimeRef.current;

      if (elapsed >= TICK_INTERVAL_MS) {
        lastTimeRef.current = timestamp;
        if (atEndRef.current) {
          setPlaying(false);
          rafRef.current = null;
          return;
        }
        stepForwardRef.current();
      }
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing]);

  const handlePlayPause = () => {
    if (playing) {
      stopPlayback();
    } else {
      if (atEnd) goTo(0);
      setPlaying(true);
    }
  };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    goTo(Number(e.target.value));
  };

  const total = maxTick;

  return (
    <div className={styles.controls}>
      <div className={styles.buttons}>
        <button
          aria-label="Ir al inicio"
          className={styles.btn}
          disabled={atStart}
          onClick={() => { goTo(0); }}
        >
          <FirstIcon />
        </button>
        <button
          aria-label="Paso atrás"
          className={styles.btn}
          disabled={atStart}
          onClick={() => { stepBackward(); }}
        >
          <PreviousIcon />
        </button>
        <button
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          className={styles.btn}
          disabled={result === null}
          onClick={handlePlayPause}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>
        <button
          aria-label="Paso adelante"
          className={styles.btn}
          disabled={atEnd}
          onClick={() => { stepForward(); }}
        >
          <NextIcon />
        </button>
        <button
          aria-label="Ir al final"
          className={styles.btn}
          disabled={atEnd}
          onClick={() => { goTo(maxTick); }}
        >
          <LastIcon />
        </button>
      </div>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={total}
        value={tick}
        onChange={handleSlider}
        aria-label="Barra de progreso"
      />
      <div className={styles.indicator}>
        {`Tick: ${String(tick)} / ${String(total)}`}
      </div>
    </div>
  );
}
