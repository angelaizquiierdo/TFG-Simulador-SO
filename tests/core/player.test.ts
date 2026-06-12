import { describe, it, expect } from 'vitest';
import { Player } from '../../src/core/player.js';
import type { HistoryEvent, History } from '../../src/core/types/history.js';

// Historia de N ticks para las pruebas
function makeHistory(length: number): History {
  const events: HistoryEvent[] = [];
  for (let i = 0; i < length; i++) {
    events.push({
      tick: i,
      onCPU: null,
      ready: [],
      pending: [],
      completed: [],
      message: `tick ${i.toString()}`,
    });
  }
  return events;
}

describe('Player — Navegación manual', () => {
  it('tick 3 → stepForward() → 4', () => {
    const player = new Player(makeHistory(6));
    player.goTo(3);
    player.stepForward();
    expect(player.tick).toBe(4);
  });

  it('tick 3 → stepBackward() → 2', () => {
    const player = new Player(makeHistory(6));
    player.goTo(3);
    player.stepBackward();
    expect(player.tick).toBe(2);
  });

  it('tick 0 → stepBackward() → 0 (no baja de 0)', () => {
    const player = new Player(makeHistory(6));
    player.stepBackward();
    expect(player.tick).toBe(0);
  });

  it('último tick → stepForward() → último (no supera el final)', () => {
    const history = makeHistory(6);
    const player = new Player(history);
    player.goTo(history.length - 1);
    player.stepForward();
    expect(player.tick).toBe(history.length - 1);
  });

  it('goTo(N) → N sin recalcular', () => {
    const player = new Player(makeHistory(6));
    player.goTo(4);
    expect(player.tick).toBe(4);
  });

  it('atStart es true en tick 0', () => {
    const player = new Player(makeHistory(6));
    expect(player.atStart).toBe(true);
    player.stepForward();
    expect(player.atStart).toBe(false);
  });

  it('atEnd es true en el último tick', () => {
    const history = makeHistory(6);
    const player = new Player(history);
    player.goTo(history.length - 1);
    expect(player.atEnd).toBe(true);
    player.stepBackward();
    expect(player.atEnd).toBe(false);
  });
});
