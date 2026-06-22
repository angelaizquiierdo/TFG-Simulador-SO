import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { RoundRobin } from '../../../../src/core/algorithms/preemptive/round-robin.js';

describe('Round Robin', () => {
  it('RR quantum=2: P1[0-2],P2[2-4],P3[4-6],P1[6-8],P2[8-10],P1[10-11]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ], { algorithm: new RoundRobin(), quantum: 2 });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P3', start: 4, end: 6 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P1', start: 6, end: 8 });
    expect(r.intervals[4]).toMatchObject({ pid: 'P2', start: 8, end: 10 });
    expect(r.intervals[5]).toMatchObject({ pid: 'P1', start: 10, end: 11 });
    expect(r.aggregateMetrics.avgWaiting).toBeCloseTo(4.33, 2);
    expect(r.aggregateMetrics.avgTurnaround).toBeCloseTo(8.00, 2);
  });

  it('RR quantum=3 con CPU inactiva', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ], { algorithm: new RoundRobin(), quantum: 3 });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: null, start: 2, end: 5 });
    // P2 corre tick 5-7 (quantum), quantum-expiry, P2 vuelve a ser el único → ticks 5-8 continuos
    expect(r.intervals[2]).toMatchObject({ pid: 'P2', start: 5, end: 9 });
    expect(r.intervals[3]).toMatchObject({ pid: null, start: 9, end: 12 });
    expect(r.intervals[4]).toMatchObject({ pid: 'P3', start: 12, end: 15 });
  });

  it('RR quantum=1: P1[0-1],P2[1-2],P3[2-3],P1[3-4],P2[4-5],P1[5-6]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ], { algorithm: new RoundRobin(), quantum: 1 });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 3 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P1', start: 3, end: 4 });
    expect(r.intervals[4]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(r.intervals[5]).toMatchObject({ pid: 'P1', start: 5, end: 6 });
    const m = r.metrics;
    expect(m.find(x => x.id === 'P3')?.completion).toBe(3);
    expect(m.find(x => x.id === 'P2')?.completion).toBe(5);
    expect(m.find(x => x.id === 'P1')?.completion).toBe(6);
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new RoundRobin().select([])).toThrow();
  });
});
