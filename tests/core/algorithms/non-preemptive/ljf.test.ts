import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { LJF } from '../../../../src/core/algorithms/non-preemptive/ljf.js';

const algo = new LJF();

describe('LJF', () => {
  it('Simular LJF: P2[0-4], P3[4-7], P1[7-9]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4 },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 4 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P3', start: 4, end: 7 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P1', start: 7, end: 9 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(3.67, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(6.67, 2);
  });

  it('LJF con CPU inactiva: P2[0-3], P1[3-5], inactivo[5-6], P3[6-9]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
      { id: 'P3', arrival_time: 6, burst_time: 3 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 3 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P1', start: 3, end: 5 });
    expect(r.intervals[2]).toMatchObject({ pid: null, start: 5, end: 6 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P3', start: 6, end: 9 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(1, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(3.67, 2);
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new LJF().select([])).toThrow();
  });
});
