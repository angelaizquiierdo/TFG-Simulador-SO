import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useSimulation } from './SimulationContext.js';
import styles from './style/PlaybackControls.module.css';

const FRAME_MS = 400;

export function PlaybackControls() {
  const { tick, atStart, atEnd, totalTicks, stepForward, stepBackward, goTo } = useSimulation();
  const [playing, setPlaying] = useState(false);

  // Refs para acceder a los valores actuales dentro del rAF
  const atEndRef = useRef(atEnd);
  const stepForwardRef = useRef(stepForward);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  // Sincronizar refs después del render (dentro de un efecto, no durante el render)
  useLayoutEffect(() => {
    atEndRef.current = atEnd;
  }, [atEnd]);

  useLayoutEffect(() => {
    stepForwardRef.current = stepForward;
  }, [stepForward]);

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    function frame(now: number) {
      if (atEndRef.current) {
        setPlaying(false);
        return;
      }
      lastTimeRef.current ??= now;
      const delta = now - lastTimeRef.current;
      if (delta >= FRAME_MS) {
        lastTimeRef.current = now;
        stepForwardRef.current();
      }
      rafRef.current = requestAnimationFrame(frame);
    }

    rafRef.current = requestAnimationFrame(frame);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [playing]);

  const handlePlayForward = () => { setPlaying(prev => !prev); };
  const handleGoStart = () => { setPlaying(false); goTo(0); };
  const handleGoEnd   = () => { setPlaying(false); goTo(Math.max(0, totalTicks - 1)); };
  const handleBack    = () => { setPlaying(false); stepBackward(); };
  const handleForward = () => { setPlaying(false); stepForward(); };

  const isNoData = totalTicks === 0;

  return (
    <div className={styles.controls}>
      <button onClick={handleGoStart} disabled={atStart || isNoData} aria-label="Ir al inicio">⏮</button>
      <button onClick={handleBack}    disabled={atStart || isNoData} aria-label="Paso atrás">◀</button>
      <button onClick={handlePlayForward} disabled={isNoData} aria-label={playing ? 'Pausar' : 'Reproducir'}>
        {playing ? '⏸' : '▶'}
      </button>
      <button onClick={handleForward} disabled={atEnd || isNoData} aria-label="Paso adelante">▶|</button>
      <button onClick={handleGoEnd}   disabled={atEnd || isNoData} aria-label="Ir al final">⏭</button>
      <input
        type="range"
        className={styles.slider}
        min={0}
        max={totalTicks > 0 ? totalTicks - 1 : 0}
        value={tick}
        disabled={isNoData}
        onChange={e => { setPlaying(false); goTo(Number(e.target.value)); }}
        aria-label="Barra de progreso"
      />
      <span className={styles.tickLabel}>Tick: {tick} / {totalTicks > 0 ? totalTicks - 1 : 0}</span>
    </div>
  );
}
