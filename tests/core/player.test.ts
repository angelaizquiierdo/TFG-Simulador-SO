import { describe, it, expect } from 'vitest';
import { Player } from '../../src/core/player.js';
import type { History } from '../../src/core/types/history.js';

// History de 5 eventos (ticks 0..4)
const history: History = [0, 1, 2, 3, 4].map((tick) => ({
  tick,
  onCPU: tick === 0 ? null : 'P1',
  ready: [],
  pending: [],
  completed: tick === 4 ? ['P1'] : [],
  message: `tick ${String(tick)}`,
}));

describe('T-16 · Player — navegación manual', () => {
  it('tick 3 → stepForward → tick 4', () => {
    const p = new Player(history);
    p.goTo(3);
    p.stepForward();
    expect(p.tick).toBe(4);
  });

  it('tick 3 → stepBackward → tick 2', () => {
    const p = new Player(history);
    p.goTo(3);
    p.stepBackward();
    expect(p.tick).toBe(2);
  });

  it('tick 0 → stepBackward → permanece en 0', () => {
    const p = new Player(history);
    p.stepBackward();
    expect(p.tick).toBe(0);
  });

  it('último tick → stepForward → permanece en el último', () => {
    const p = new Player(history);
    p.goTo(history.length - 1);
    p.stepForward();
    expect(p.tick).toBe(history.length - 1);
  });

  it('goTo(N) va directamente a N sin recalcular', () => {
    const p = new Player(history);
    p.goTo(3);
    expect(p.tick).toBe(3);
  });

  it('atStart es true en tick 0', () => {
    const p = new Player(history);
    expect(p.atStart).toBe(true);
  });

  it('atEnd es true en el último tick', () => {
    const p = new Player(history);
    p.goTo(history.length - 1);
    expect(p.atEnd).toBe(true);
  });

  it('current devuelve el HistoryEvent del tick actual', () => {
    const p = new Player(history);
    p.goTo(2);
    expect(p.current?.tick).toBe(2);
  });

  it('history vacío: goTo se ignora, tick permanece en 0', () => {
    const p = new Player([]);
    p.goTo(3);
    expect(p.tick).toBe(0);
  });

  it('history vacío: atStart y atEnd son true', () => {
    const p = new Player([]);
    expect(p.atStart).toBe(true);
    expect(p.atEnd).toBe(true);
  });
});
