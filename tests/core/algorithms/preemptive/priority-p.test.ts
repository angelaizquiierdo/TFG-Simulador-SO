import { describe, it, expect } from 'vitest';
import { PriorityP } from '../../../../src/core/algorithms/preemptive/priority-p.js';
import { run } from '../../../../src/core/simulate.js';

describe('Priority-P', () => {
  const algo = new PriorityP();

  it('tiene preemptionMode on-better y requires priority', () => {
    expect(algo.preemptionMode).toBe('on-better');
    expect(algo.requires.priority).toBe(true);
    expect(algo.name).toBe('Priority-P');
  });

  it('select lanza error si la lista está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select devuelve el proceso con menor prioridad numérica', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 4, remaining: 4, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, remaining: 2, priority: 1 },
    ];
    expect(algo.select(ready).id).toBe('P3');
  });

  // BEHAVIOURS § Simular — Prioridad (P) caso 1
  // P1(0,4,prio2), P2(1,2,prio2), P3(2,2,prio1)
  // Gantt: P1[0-2], P3[2-4], P1[4-6], P2[6-8]
  // avgWaiting=2.33, avgTurnaround=5.00
  it('fixture 1: P1[0-2], P3[2-4], P1[4-6], P2[6-8]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P1', start: 4, end: 6 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
    const comp = Object.fromEntries(
      result.metrics.processes.map((m) => [m.id, m.completion]),
    );
    expect(comp.P3).toBe(4);
    expect(comp.P1).toBe(6);
    expect(comp.P2).toBe(8);
    expect(result.metrics.aggregate.avgWaiting).toBe(2.33);
    expect(result.metrics.aggregate.avgTurnaround).toBe(5);
  });

  // BEHAVIOURS § Simular — Prioridad (P) caso 2
  // P1(0,5,prio3), P2(1,3,prio2), P3(2,2,prio1)
  // Gantt: P1[0-1], P2[1-2], P3[2-4], P2[4-6], P1[6-10]
  it('fixture 2: P1[0-1], P2[1-2], P3[2-4], P2[4-6], P1[6-10]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 5, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 3, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P2', start: 4, end: 6 });
    expect(result.intervals[4]).toMatchObject({ pid: 'P1', start: 6, end: 10 });
    expect(result.metrics.aggregate.avgWaiting).toBe(2.33);
    expect(result.metrics.aggregate.avgTurnaround).toBe(5.67);
  });

  // BEHAVIOURS § Simular — Prioridad (P) caso 3: idle gap + expropiación
  // P1(0,2,prio2), P2(4,4,prio3), P3(5,2,prio1)
  // Gantt: P1[0-2], Idle[2-4], P2[4-5], P3[5-7], P2[7-10]
  it('fixture 3: idle gap y expropiación de P2 por P3', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2, priority: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 4, priority: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 2, priority: 1 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: null, start: 2, end: 4 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(result.intervals[4]).toMatchObject({ pid: 'P2', start: 7, end: 10 });
  });

  // BEHAVIOURS § Simular — Prioridad (P) caso 4: sin expropiación (P1 tiene mayor prio)
  // P1(0,3,prio1), P2(1,2,prio2), P3(2,2,prio3)
  // Gantt: P1[0-3], P2[3-5], P3[5-7]
  it('fixture 4: sin expropiación P1[0-3], P2[3-5], P3[5-7]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
      { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, priority: 3 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(result.metrics.aggregate.avgWaiting).toBe(1.67);
    expect(result.metrics.aggregate.avgTurnaround).toBe(4);
  });
});
