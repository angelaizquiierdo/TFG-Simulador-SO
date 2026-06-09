import { describe, it, expect } from 'vitest';
import { Player } from '../../src/core/player.js';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub-player',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

// Historial con 5 ticks (P1 burst=3, P2 burst=2)
function makeHistory() {
  return run(
    [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
    ],
    fcfsStub,
  ).history;
}

describe('T-16: Player — cursor sobre history', () => {
  it('stepForward avanza de tick 3 a tick 4', () => {
    const player = new Player(makeHistory());
    player.goTo(3);
    expect(player.tick).toBe(3);
    player.stepForward();
    expect(player.tick).toBe(4);
  });

  it('stepBackward retrocede de tick 3 a tick 2', () => {
    const player = new Player(makeHistory());
    player.goTo(3);
    player.stepBackward();
    expect(player.tick).toBe(2);
  });

  it('stepBackward en tick 0 permanece en 0', () => {
    const player = new Player(makeHistory());
    expect(player.tick).toBe(0);
    player.stepBackward();
    expect(player.tick).toBe(0);
    expect(player.atStart).toBe(true);
  });

  it('stepForward en el último tick permanece en el último', () => {
    const history = makeHistory();
    const player = new Player(history);
    const last = history.length - 1;
    player.goTo(last);
    expect(player.atEnd).toBe(true);
    player.stepForward();
    expect(player.tick).toBe(last);
  });

  it('goTo(N) posiciona en N sin recalcular', () => {
    const player = new Player(makeHistory());
    player.goTo(2);
    expect(player.tick).toBe(2);
    player.goTo(0);
    expect(player.tick).toBe(0);
  });
});
