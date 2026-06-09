import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Stub Round Robin: selecciona el primer elemento (FIFO)
const rrStub: IAlgorithm = {
  name: 'rr-stub-t11',
  preemptionMode: 'on-quantum',
  requires: { quantum: true },
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-11: Modo on-quantum (Round Robin)', () => {
  it('P1(0,4), P2(0,3), quantum=2 → P1[0–2], P2[2–4], P1[4–6], P2[6–7]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4 },
        { id: 'P2', arrival_time: 0, burst_time: 3 },
      ],
      rrStub,
      { quantum: 2 },
    );
    expect(result.intervals).toContainEqual({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals).toContainEqual({ pid: 'P2', start: 2, end: 4 });
    expect(result.intervals).toContainEqual({ pid: 'P1', start: 4, end: 6 });
    expect(result.intervals).toContainEqual({ pid: 'P2', start: 6, end: 7 });
    expect(result.intervals).toHaveLength(4);
  });

  it('el proceso que llega en el mismo tick entra en ready antes que el reencolado', () => {
    // P2 llega en tick 2 (mismo tick que P1 agota su quantum),
    // debe ir a ready ANTES que P1 reencolado → P2 se ejecuta primero
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      rrStub,
      { quantum: 2 },
    );
    // Tick 0-1: P1; tick 2: P2 llega y se encola antes del reencolado de P1
    expect(result.intervals[0]).toEqual({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toEqual({ pid: 'P2', start: 2, end: 4 });
    expect(result.intervals[2]).toEqual({ pid: 'P1', start: 4, end: 6 });
  });
});
