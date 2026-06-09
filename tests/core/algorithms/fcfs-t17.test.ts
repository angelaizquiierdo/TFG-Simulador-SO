import { describe, it, expect } from 'vitest';
import { FCFS } from '../../../src/core/algorithms/non-preemptive/fcfs.js';
import { run } from '../../../src/core/simulate.js';

const fcfs = new FCFS();

describe('T-17: FCFS', () => {
  it('P1(0,3), P2(2,2) → P1[0–3], P2[3–5]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfs,
    );
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 3 },
      { pid: 'P2', start: 3, end: 5 },
    ]);
  });

  it('avgWaiting=0.5 y avgTurnaround=3', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfs,
    );
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(0.5);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3);
  });
});
