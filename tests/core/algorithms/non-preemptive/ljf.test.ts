import { describe, it, expect } from 'vitest';
import { LJF } from '../../../../src/core/algorithms/non-preemptive/ljf.js';
import { run } from '../../../../src/core/simulate.js';

describe('LJF', () => {
  const algo = new LJF();

  it('tiene preemptionMode none', () => {
    expect(algo.preemptionMode).toBe('none');
    expect(algo.name).toBe('LJF');
  });

  it('select lanza error si la lista está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select devuelve el proceso con mayor burst_time', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4, remaining: 4 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  // BEHAVIOURS § Simular — LJF (caso 1)
  // P1(0,2), P2(0,4), P3(0,3) → P2[0-4], P3[4-7], P1[7-9]
  // avgWaiting=3.67, avgTurnaround=6.67
  it('fixture 1: P2[0-4], P3[4-7], P1[7-9]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4 },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 4 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P3', start: 4, end: 7 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P1', start: 7, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBe(3.67);
    expect(result.metrics.aggregate.avgTurnaround).toBe(6.67);
  });

  // BEHAVIOURS § Simular — LJF (caso 2)
  // P1(0,2), P2(0,3), P3(6,3) → P2[0-3], P1[3-5], Idle[5-6], P3[6-9]
  // avgWaiting=1, avgTurnaround=3.67
  it('fixture 2: P2[0-3], P1[3-5], Idle[5-6], P3[6-9]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
      { id: 'P3', arrival_time: 6, burst_time: 3 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 3 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P1', start: 3, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: null, start: 5, end: 6 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P3', start: 6, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBe(1);
    expect(result.metrics.aggregate.avgTurnaround).toBe(3.67);
  });
});
