import { describe, it, expect } from 'vitest';
import { Player } from '../../src/core/player.js';
import type { HistoryEvent } from '../../src/core/types/history.js';

function makeEvent(tick: number): HistoryEvent {
  return {
    tick,
    onCPU: null,
    ready: [],
    pending: [],
    completed: [],
    inIO: null,
    waitingIO: [],
    message: '',
  };
}

const history = [makeEvent(0), makeEvent(1), makeEvent(2), makeEvent(3)];

describe('Player — Navegación manual', () => {
  it('comienza en tick 0 y atStart es true', () => {
    const p = new Player(history);
    expect(p.tick).toBe(0);
    expect(p.atStart).toBe(true);
    expect(p.atEnd).toBe(false);
  });

  it('stepForward avanza el tick', () => {
    const p = new Player(history);
    p.stepForward();
    expect(p.tick).toBe(1);
    expect(p.atStart).toBe(false);
  });

  it('stepBackward retrocede el tick', () => {
    const p = new Player(history);
    p.goTo(2);
    p.stepBackward();
    expect(p.tick).toBe(1);
  });

  it('stepBackward no baja de 0', () => {
    const p = new Player(history);
    p.stepBackward();
    expect(p.tick).toBe(0);
  });

  it('stepForward no supera el último tick', () => {
    const p = new Player(history);
    p.goTo(3);
    p.stepForward();
    expect(p.tick).toBe(3);
    expect(p.atEnd).toBe(true);
  });

  it('goTo salta al tick indicado', () => {
    const p = new Player(history);
    p.goTo(3);
    expect(p.tick).toBe(3);
    expect(p.atEnd).toBe(true);
  });

  it('goTo fuera de rango se satura', () => {
    const p = new Player(history);
    p.goTo(100);
    expect(p.tick).toBe(3);
    p.goTo(-5);
    expect(p.tick).toBe(0);
  });

  it('current devuelve el HistoryEvent del tick actual', () => {
    const p = new Player(history);
    p.goTo(2);
    expect(p.current?.tick).toBe(2);
  });
});
