import React, { useEffect, useRef, useState } from 'react';
import { useSimulation } from './SimulationContext.js';

export function PlaybackControls(): React.ReactElement {
  const { result, tick, atStart, atEnd, stepForward, stepBackward, goTo } = useSimulation();

  const totalTicks = result ? result.history.length : 0;

  // Estado de reproducción automática
  const [playing, setPlaying] = useState(false);

  // requestAnimationFrame y deltaTime viven exclusivamente aquí
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const TICK_INTERVAL_MS = 500; // ms por tick en reproducción automática

  useEffect(() => {
    if (!playing) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      lastTimeRef.current = null;
      return;
    }

    const animate = (now: number): void => {
      const last = lastTimeRef.current;
      const deltaTime = last !== null ? now - last : TICK_INTERVAL_MS;

      if (deltaTime >= TICK_INTERVAL_MS) {
        lastTimeRef.current = now;
        if (atEnd) {
          setPlaying(false);
          return;
        }
        stepForward();
      }
      rafRef.current = requestAnimationFrame(animate);
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [playing, atEnd, stepForward]);

  const handlePlayForward = (): void => {
    setPlaying((prev) => !prev);
  };

  const btnStyle = (disabled: boolean): React.CSSProperties => ({
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? 'not-allowed' : 'pointer',
    padding: '4px 10px',
    marginRight: 4,
    fontSize: 16,
  });

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, flexWrap: 'wrap' }}>
      {/* ⏮ ir al inicio */}
      <button
        aria-label="ir al inicio"
        disabled={atStart}
        style={btnStyle(atStart)}
        onClick={() => { goTo(0); setPlaying(false); }}
      >
        ⏮
      </button>

      {/* ◀ paso atrás */}
      <button
        aria-label="paso atrás"
        disabled={atStart}
        style={btnStyle(atStart)}
        onClick={() => { stepBackward(); setPlaying(false); }}
      >
        ◀
      </button>

      {/* ▶/⏸ reproducir/pausar */}
      <button
        aria-label={playing ? 'pausar' : 'reproducir'}
        style={btnStyle(false)}
        onClick={handlePlayForward}
      >
        {playing ? '⏸' : '▶'}
      </button>

      {/* ▶| paso adelante */}
      <button
        aria-label="paso adelante"
        disabled={atEnd}
        style={btnStyle(atEnd)}
        onClick={() => { stepForward(); setPlaying(false); }}
      >
        ▶|
      </button>

      {/* ⏭ ir al final */}
      <button
        aria-label="ir al final"
        disabled={atEnd}
        style={btnStyle(atEnd)}
        onClick={() => { goTo(totalTicks - 1); setPlaying(false); }}
      >
        ⏭
      </button>

      {/* Barra de desplazamiento */}
      <input
        type="range"
        min={0}
        max={totalTicks > 0 ? totalTicks - 1 : 0}
        value={tick}
        onChange={(e) => { goTo(Number(e.target.value)); setPlaying(false); }}
        style={{ margin: '0 8px', flexGrow: 1 }}
        aria-label="barra de progreso"
      />

      {/* Indicador de tick */}
      <span aria-label="tick actual" style={{ fontSize: 14 }}>
        Tick: {tick} / {totalTicks > 0 ? totalTicks - 1 : 0}
      </span>
    </div>
  );
}
