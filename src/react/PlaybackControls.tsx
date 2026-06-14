// T-28 — Controles de reproducción — ÚNICO lugar con requestAnimationFrame
import React, { useEffect, useRef, useState } from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/PlaybackControls.module.css';

export function PlaybackControls(): React.ReactElement {
  const { result, tick, atStart, atEnd, stepForward, stepBackward, goTo } = useSimulation();
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  const total = result !== null ? result.history.length - 1 : 0;

  // Reproducción automática con rAF y deltaTime (~1 tick/seg)
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const loop = (time: number): void => {
      lastTimeRef.current ??= time;
      const delta = time - lastTimeRef.current;
      if (delta >= 1000) {
        lastTimeRef.current = time;
        stepForward();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing]);

  // Detener si llegamos al final
  useEffect(() => {
    if (atEnd && playing) {
      setPlaying(false);
    }
  }, [atEnd, playing]);

  const handlePlayPause = (): void => {
    if (result === null) return;
    setPlaying((p) => !p);
  };

  const handleRange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    goTo(Number(e.target.value));
  };

  const noResult = result === null;

  return (
    <div className={styles.container}>
      <div className={styles.buttons}>
        {/* ⏮ ir al inicio */}
        <button
          aria-label="Ir al inicio"
          disabled={atStart || noResult}
          onClick={() => { goTo(0); }}
        >
          ⏮
        </button>
        {/* ◀ retroceder */}
        <button
          aria-label="Retroceder"
          disabled={atStart || noResult}
          onClick={stepBackward}
        >
          ◀
        </button>
        {/* ▶ / ⏸ reproducción */}
        <button
          aria-label={playing ? 'Pausar' : 'Reproducir'}
          disabled={noResult}
          onClick={handlePlayPause}
        >
          {playing ? '⏸' : '▶'}
        </button>
        {/* ▶| avanzar */}
        <button
          aria-label="Avanzar"
          disabled={atEnd || noResult}
          onClick={stepForward}
        >
          ▶|
        </button>
        {/* ⏭ ir al final */}
        <button
          aria-label="Ir al final"
          disabled={atEnd || noResult}
          onClick={() => { goTo(total); }}
        >
          ⏭
        </button>
      </div>
      <input
        type="range"
        min={0}
        max={total}
        value={tick}
        onChange={handleRange}
        disabled={noResult}
        className={styles.range}
        aria-label="Barra de progreso"
      />
      <span className={styles.indicator}>
        {`Tick: ${String(tick)} / ${String(total)}`}
      </span>
    </div>
  );
}
