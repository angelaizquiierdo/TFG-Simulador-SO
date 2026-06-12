import { describe, it, expect } from 'vitest';
import { SJF } from '../../../../src/core/algorithms/non-preemptive/sjf.js';
import { run } from '../../../../src/core/simulate.js';

describe('SJF', () => {
  const algo = new SJF();

  it('tiene preemptionMode none', () => {
    expect(algo.preemptionMode).toBe('none');
    expect(algo.name).toBe('SJF');
  });

  it('select lanza error si la lista está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select devuelve el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  // BEHAVIOURS § Simular — SJF (caso 1)
  // P1(0,5), P2(1,2), P3(2,4), P4(3,1) → P1[0-5], P4[5-6], P2[6-8], P3[8-12]
  // avgWaiting=3.25, avgTurnaround=6.25
  it('fixture 1: P1[0-5], P4[5-6], P2[6-8], P3[8-12]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 4 },
      { id: 'P4', arrival_time: 3, burst_time: 1 },
    ];
    const result = run(processes, algo);
    const ids = result.intervals.map((i) => i.pid);
    expect(ids).toEqual(['P1', 'P4', 'P2', 'P3']);
    expect(result.metrics.aggregate.avgWaiting).toBe(3.25);
    expect(result.metrics.aggregate.avgTurnaround).toBe(6.25);
  });

  // BEHAVIOURS § Simular — SJF (caso 2): idle gaps
  // P1(0,2), P2(5,2), P3(6,3), P4(12,1)
  // Gantt: P1[0-2], Idle[2-5], P2[5-7], P3[7-10], Idle[10-12], P4[12-13]
  it('fixture 2: idle gaps entre procesos', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 3 },
      { id: 'P4', arrival_time: 12, burst_time: 1 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: null, start: 2, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P3', start: 7, end: 10 });
    expect(result.intervals[4]).toMatchObject({ pid: null, start: 10, end: 12 });
    expect(result.intervals[5]).toMatchObject({ pid: 'P4', start: 12, end: 13 });
  });

  // BEHAVIOURS § Simular — SJF (caso 3): todos llegan en t=0
  // P1(0,4), P2(0,2), P3(0,3) → P2[0-2], P3[2-5], P1[5-9]
  it('fixture 3: P2[0-2], P3[2-5], P1[5-9]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P3', start: 2, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBe(2.33);
    expect(result.metrics.aggregate.avgTurnaround).toBe(5.33);
  });
});
