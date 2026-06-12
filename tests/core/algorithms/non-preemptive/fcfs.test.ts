import { describe, it, expect } from 'vitest';
import { FCFS } from '../../../../src/core/algorithms/non-preemptive/fcfs.js';
import { run } from '../../../../src/core/simulate.js';

describe('FCFS', () => {
  const algo = new FCFS();

  it('tiene preemptionMode none y requires vacío', () => {
    expect(algo.preemptionMode).toBe('none');
    expect(algo.requires).toEqual({});
    expect(algo.name).toBe('FCFS');
  });

  it('select lanza error si la lista está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select devuelve el primer elemento', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2, remaining: 2 },
    ];
    expect(algo.select(ready).id).toBe('P1');
  });

  // BEHAVIOURS § Simular — FCFS (caso 1)
  // P1(llegada 0, ráfaga 3), P2(llegada 2, ráfaga 2), P3(llegada 1, ráfaga 4)
  // Gantt: P1[0–3], P3[3–7], P2[7–9]
  // avgWaiting=2.33, avgTurnaround=5.33
  it('fixture 1: P1[0-3], P3[3-7], P2[7-9]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 2, burst_time: 2 },
      { id: 'P3', arrival_time: 1, burst_time: 4 },
    ];
    const result = run(processes, algo);
    const ids = result.intervals.map((i) => i.pid);
    expect(ids).toEqual(['P1', 'P3', 'P2']);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P3', start: 3, end: 7 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P2', start: 7, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBe(2.33);
    expect(result.metrics.aggregate.avgTurnaround).toBe(5.33);
  });

  // BEHAVIOURS § Simular — FCFS (caso 2): idle gap
  // P1(llegada 0, ráfaga 3), P2(llegada 5, ráfaga 2), P3(llegada 6, ráfaga 4)
  // Gantt: P1[0–3], P2[5–7], P3[7–11]
  // avgWaiting=0.33, avgTurnaround=3.33
  it('fixture 2: gap inactivo entre P1 y P2', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 5, burst_time: 2 },
      { id: 'P3', arrival_time: 6, burst_time: 4 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(result.intervals[1]).toMatchObject({ pid: null, start: 3, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P3', start: 7, end: 11 });
    expect(result.metrics.aggregate.avgWaiting).toBe(0.33);
    expect(result.metrics.aggregate.avgTurnaround).toBe(3.33);
  });
});
