import { describe, it, expect } from 'vitest';
import { SJF } from '../../../src/core/algorithms/non-preemptive/sjf.js';
import { run } from '../../../src/core/simulate.js';

const sjf = new SJF();

describe('T-18: SJF (no expropiativo)', () => {
  it('P1(0,4), P2(1,2), P3(2,1) → P1[0–4], P3[4–5], P2[5–7]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
        { id: 'P3', arrival_time: 2, burst_time: 1 },
      ],
      sjf,
    );
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 4 },
      { pid: 'P3', start: 4, end: 5 },
      { pid: 'P2', start: 5, end: 7 },
    ]);
  });

  it('select elige el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 4, remaining: 4 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2 },
    ] as const;
    expect(sjf.select(ready).id).toBe('P2');
  });
});
