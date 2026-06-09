import React, { useEffect, useRef } from 'react';

export interface PlaybackControlsProps {
  tick: number;
  maxTick: number;
  onTickChange: (tick: number) => void;
}

// Velocidad de reproducción: ms por tick
const MS_PER_TICK = 500;

export function PlaybackControls({ tick, maxTick, onTickChange }: PlaybackControlsProps): React.JSX.Element {
  const playingRef = useRef<'forward' | 'backward' | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);
  const accRef = useRef<number>(0);
  const tickRef = useRef<number>(tick);

  // Mantener tickRef sincronizado con el prop
  tickRef.current = tick;

  const stopPlayback = (): void => {
    playingRef.current = null;
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    lastTimeRef.current = null;
    accRef.current = 0;
  };

  const startPlayback = (direction: 'forward' | 'backward'): void => {
    stopPlayback();
    playingRef.current = direction;

    const loop = (timestamp: number): void => {
      if (playingRef.current === null) return;

      lastTimeRef.current ??= timestamp;
      const deltaTime = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;
      accRef.current += deltaTime;

      if (accRef.current >= MS_PER_TICK) {
        accRef.current -= MS_PER_TICK;
        const current = tickRef.current;
        if (direction === 'forward') {
          if (current >= maxTick) {
            stopPlayback();
            return;
          }
          onTickChange(current + 1);
        } else {
          if (current <= 0) {
            stopPlayback();
            return;
          }
          onTickChange(current - 1);
        }
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
  };

  // Limpiar al desmontar
  useEffect(() => {
    return () => { stopPlayback(); };
  }, []);

  // Detener reproducción si se llega al límite
  useEffect(() => {
    if (playingRef.current === 'forward' && tick >= maxTick) {
      stopPlayback();
    } else if (playingRef.current === 'backward' && tick <= 0) {
      stopPlayback();
    }
  }, [tick, maxTick]);

  const isPlaying = playingRef.current !== null;

  return (
    <div data-testid="playback-controls">
      <button
        data-testid="btn-play-forward"
        onClick={() => { startPlayback('forward'); }}
        aria-label="Reproducir hacia delante"
      >
        ▶
      </button>
      <button
        data-testid="btn-play-backward"
        onClick={() => { startPlayback('backward'); }}
        aria-label="Reproducir hacia atrás"
      >
        ◀
      </button>
      <button
        data-testid="btn-pause"
        onClick={() => { stopPlayback(); }}
        aria-label="Pausar"
      >
        ⏸
      </button>
      <button
        data-testid="btn-step-forward"
        onClick={() => { onTickChange(Math.min(maxTick, tick + 1)); }}
        aria-label="Paso adelante"
      >
        ⏭
      </button>
      <button
        data-testid="btn-step-backward"
        onClick={() => { onTickChange(Math.max(0, tick - 1)); }}
        aria-label="Paso atrás"
      >
        ⏮
      </button>
      <input
        type="range"
        data-testid="seek-bar"
        min={0}
        max={maxTick}
        value={tick}
        onChange={e => { onTickChange(Number(e.target.value)); }}
        aria-label="Barra de tiempo"
      />
      <span data-testid="tick-display">{tick}</span>
      {isPlaying && <span data-testid="playing-indicator">Reproduciendo</span>}
    </div>
  );
}
