import { describe, it, expect } from 'vitest';
import { RoundRobin } from '../../../src/core/algorithms/preemptive/round-robin.js';
import { run } from '../../../src/core/simulate.js';

const rr = new RoundRobin();

describe('T-23: Round Robin', () => {
  it('P1(0,4), P2(0,3), quantum=2 → P1[0–2], P2[2–4], P1[4–6], P2[6–7]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4 },
        { id: 'P2', arrival_time: 0, burst_time: 3 },
      ],
      rr,
      { quantum: 2 },
    );
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 2 },
      { pid: 'P2', start: 2, end: 4 },
      { pid: 'P1', start: 4, end: 6 },
      { pid: 'P2', start: 6, end: 7 },
    ]);
  });

  it('select FIFO: devuelve el primer elemento', () => {
    const ready = [
      { id: 'P2', arrival_time: 0, burst_time: 3, remaining: 3 },
      { id: 'P1', arrival_time: 0, burst_time: 4, remaining: 2 },
    ] as const;
    expect(rr.select(ready).id).toBe('P2');
  });
});
