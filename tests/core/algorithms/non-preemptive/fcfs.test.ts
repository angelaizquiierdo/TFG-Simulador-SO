import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { FCFS } from '../../../../src/core/algorithms/non-preemptive/fcfs.js';

const algo = new FCFS();

describe('FCFS', () => {
  it('Simular FCFS: P1[0-3], P3[3-7], P2[7-9]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P3', start: 3, end: 7 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P2', start: 7, end: 9 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(2.33, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(5.33, 2);
  });

  it('Simular FCFS con CPU inactiva: P1[0-3], P2[5-7], P3[7-11]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(r.intervals[1]).toMatchObject({ pid: null, start: 3, end: 5 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(0.33, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(3.33, 2);
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new FCFS().select([])).toThrow();
  });
});
