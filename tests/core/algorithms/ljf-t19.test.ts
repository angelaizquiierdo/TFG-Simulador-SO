import { describe, it, expect } from 'vitest';
import { LJF } from '../../../src/core/algorithms/non-preemptive/ljf.js';
import { run } from '../../../src/core/simulate.js';

const ljf = new LJF();

describe('T-19: LJF (no expropiativo)', () => {
  it('P1(0,2), P2(0,4), P3(0,3) → P2[0–4], P3[4–7], P1[7–9]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 0, burst_time: 4 },
        { id: 'P3', arrival_time: 0, burst_time: 3 },
      ],
      ljf,
    );
    expect(result.intervals).toEqual([
      { pid: 'P2', start: 0, end: 4 },
      { pid: 'P3', start: 4, end: 7 },
      { pid: 'P1', start: 7, end: 9 },
    ]);
  });

  it('select elige el proceso con mayor burst_time', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4, remaining: 4 },
    ] as const;
    expect(ljf.select(ready).id).toBe('P2');
  });
});
