import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { PriorityP } from '../../../../src/core/algorithms/preemptive/priority-p.js';

const algo = new PriorityP();

describe('Priority P', () => {
  it('Simular PriorityP: P1[0-2], P3[2-4], P1[4-6], P2[6-8]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P1', start: 4, end: 6 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(2.33, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(5.00, 2);
  });

  it('PriorityP sin expropiación cuando prioridades no cambian: P1[0-3], P2[3-5], P3[5-7]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 3 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(1.67, 2);
  });

  it('proceso sin priority se trata con Infinity', () => {
    expect(() => run([
      { id: 'P1', arrival_time: 0, burst_time: 2 },
    ], { algorithm: algo })).not.toThrow();
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new PriorityP().select([])).toThrow();
  });
});
