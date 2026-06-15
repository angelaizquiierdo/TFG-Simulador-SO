import React, { useState, useEffect, useRef } from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/PlaybackControls.module.css';

const FRAME_INTERVAL_MS = 600;

export function PlaybackControls(): React.ReactElement {
  const { result, currentEvent, stepForward, stepBackward, goToStart, goToEnd, setTick } =
    useSimulation();

  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  // Ref para que el loop de RAF pueda leer el estado actual sin stale closure
  const playingRef = useRef(playing);
  const atEndRef = useRef(false);

  const total = result !== null ? result.history.length - 1 : 0;
  const tick = currentEvent?.tick ?? 0;
  const atStart = tick === 0;
  const atEnd = total === 0 || tick === total;

  // Sincronizar refs con estado/derivaciones
  useEffect(() => { playingRef.current = playing; }, [playing]);
  useEffect(() => { atEndRef.current = atEnd; }, [atEnd]);

  // Iniciar/detener el loop de RAF cuando cambia `playing`
  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      return;
    }

    const loop = (time: number) => {
      // Si ya no estamos reproduciendo o llegamos al final, parar
      if (!playingRef.current || atEndRef.current) {
        setPlaying(false);
        return;
      }
      if (time - lastTimeRef.current >= FRAME_INTERVAL_MS) {
        lastTimeRef.current = time;
        stepForward();
      }
      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, stepForward]);

  const togglePlay = () => { setPlaying((p) => !p); };

  const handleSlider = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTick(Number(e.target.value));
  };

  const disabled = result === null;

  return (
    <div className={styles.controls}>
      <button
        className={styles.btn}
        aria-label="Ir al inicio"
        onClick={goToStart}
        disabled={disabled || atStart}
      >
        ⏮
      </button>
      <button
        className={styles.btn}
        aria-label="Paso atrás"
        onClick={stepBackward}
        disabled={disabled || atStart}
      >
        ◀
      </button>
      <button
        className={styles.btn}
        aria-label={playing ? 'Pausar' : 'Reproducir'}
        onClick={togglePlay}
        disabled={disabled}
      >
        {playing ? '⏸' : '▶'}
      </button>
      <button
        className={styles.btn}
        aria-label="Paso adelante"
        onClick={stepForward}
        disabled={disabled || atEnd}
      >
        ▶|
      </button>
      <button
        className={styles.btn}
        aria-label="Ir al final"
        onClick={goToEnd}
        disabled={disabled || atEnd}
      >
        ⏭
      </button>
      <input
        className={styles.slider}
        type="range"
        min={0}
        max={total}
        value={tick}
        onChange={handleSlider}
        disabled={disabled}
        aria-label="Posición en la simulación"
      />
      <span className={styles.tickIndicator}>
        Tick: {tick} / {total}
      </span>
    </div>
  );
}
