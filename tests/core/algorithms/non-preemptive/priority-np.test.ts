import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { PriorityNP } from '../../../../src/core/algorithms/non-preemptive/priority-np.js';

const algo = new PriorityNP();

describe('Priority NP', () => {
  it('Simular PriorityNP: P1[0-3], P2[3-5], P3[5-7] (empate prioridad → menor id)', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 2 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(1.67, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(4.00, 2);
  });

  it('Simular PriorityNP con mayor prioridad primero: P3[0-2], P2[2-5], P1[5-9]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 4, priority: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 3, priority: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 2, priority: 1 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P3', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 5 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(2.33, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(5.33, 2);
  });

  it('proceso sin priority se trata con Infinity (prioridad más baja)', () => {
    expect(() => run([
      { id: 'P1', arrival_time: 0, burst_time: 2 },
    ], { algorithm: algo })).not.toThrow();
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new PriorityNP().select([])).toThrow();
  });
});
