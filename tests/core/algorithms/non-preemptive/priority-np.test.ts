import { describe, it, expect } from 'vitest';
import { PriorityNP } from '../../../../src/core/algorithms/non-preemptive/priority-np.js';
import { run } from '../../../../src/core/simulate.js';

describe('Priority-NP', () => {
  const algo = new PriorityNP();

  it('tiene preemptionMode none y requires priority', () => {
    expect(algo.preemptionMode).toBe('none');
    expect(algo.requires.priority).toBe(true);
    expect(algo.name).toBe('Priority-NP');
  });

  it('select lanza error si la lista está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select devuelve el proceso con menor prioridad numérica', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2, priority: 1 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  // BEHAVIOURS § Simular — Prioridad (NP) caso 1
  // P1(0,3,prio3), P2(1,2,prio2), P3(2,2,prio2) → P1[0-3], P2[3-5], P3[5-7]
  // avgWaiting=1.67, avgTurnaround=4.00
  it('fixture 1: P1[0-3], P2[3-5], P3[5-7]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 2 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(result.metrics.aggregate.avgWaiting).toBe(1.67);
    expect(result.metrics.aggregate.avgTurnaround).toBe(4);
  });

  // BEHAVIOURS § Simular — Prioridad (NP) caso 2
  // P1(0,3,prio3), P2(1,2,prio1), P3(2,4,prio2) → P1[0-3], P2[3-5], P3[5-9]
  it('fixture 2: P1[0-3], P2[3-5], P3[5-9]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 1 },
      { id: 'P3', arrival_time: 2, burst_time: 4, priority: 2 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBe(1.67);
    expect(result.metrics.aggregate.avgTurnaround).toBe(4.67);
  });

  // BEHAVIOURS § Simular — Prioridad (NP) caso 3: idle gap + P2 antes de P3
  // P1(0,2,prio1), P2(4,2,prio3), P3(5,2,prio2) → P1[0-2], Idle[2-4], P2[4-6], P3[6-8]
  it('fixture 3: idle gap y P2 antes de P3 (prio3 > prio2 pero llega primero)', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2, priority: 1 },
      { id: 'P2', arrival_time: 4, burst_time: 2, priority: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 2, priority: 2 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: null, start: 2, end: 4 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P2', start: 4, end: 6 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P3', start: 6, end: 8 });
  });

  // BEHAVIOURS § Simular — Prioridad (NP) caso 4
  // P1(0,4,prio4), P2(0,3,prio2), P3(0,2,prio1) → P3[0-2], P2[2-5], P1[5-9]
  it('fixture 4: P3[0-2], P2[2-5], P1[5-9]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 4, priority: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 3, priority: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P3', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBe(2.33);
    expect(result.metrics.aggregate.avgTurnaround).toBe(5.33);
  });
});
