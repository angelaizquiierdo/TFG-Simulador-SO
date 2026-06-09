import { describe, it, expect } from 'vitest';
import { run, deriveIntervals, deriveMetrics } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Stub FCFS
const fcfsStub: IAlgorithm = {
  name: 'fcfs-stub-t12',
  preemptionMode: 'none',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('Sin procesos');
    return first;
  },
};

describe('T-12: deriveIntervals y deriveMetrics', () => {
  it('deriveIntervals colapsa tramos consecutivos del mismo pid', () => {
    // FCFS P1(0,3), P2(2,2) → history con P1 en 0,1,2 y P2 en 3,4
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfsStub,
    );
    expect(result.intervals).toEqual([
      { pid: 'P1', start: 0, end: 3 },
      { pid: 'P2', start: 3, end: 5 },
    ]);
  });

  it('métricas FCFS: P1(0,3), P2(2,2) → avgWaiting=0.5, avgTurnaround=3', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 2, burst_time: 2 },
      ],
      fcfsStub,
    );
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(0.5);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3);
  });

  it('deriveIntervals sobre history vacío devuelve []', () => {
    expect(deriveIntervals([])).toEqual([]);
  });

  it('deriveMetrics sobre history vacío devuelve métricas vacías', () => {
    const m = deriveMetrics([], []);
    expect(m.perProcess).toEqual([]);
    expect(m.aggregate.avgWaiting).toBe(0);
  });
});
