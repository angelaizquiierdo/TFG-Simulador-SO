import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { SJF } from '../../../../src/core/algorithms/non-preemptive/sjf.js';

const algo = new SJF();

describe('SJF', () => {
  it('Simular SJF: P1[0-5], P4[5-6], P2[6-8], P3[8-12]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 4 },
      { id: 'P4', arrival_time: 3, burst_time: 1 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 5 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P4', start: 5, end: 6 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P3', start: 8, end: 12 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(3.25, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(6.25, 2);
  });

  it('SJF con CPU inactiva', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 3 },
      { id: 'P4', arrival_time: 12, burst_time: 1 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: null, start: 2, end: 5 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P3', start: 7, end: 10 });
  });

  it('SJF desempate por menor burst_time luego id: P2[0-2], P3[2-5], P1[5-9]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P3', start: 2, end: 5 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new SJF().select([])).toThrow();
  });
});
