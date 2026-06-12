import { describe, it, expect } from 'vitest';
import { RoundRobin } from '../../../../src/core/algorithms/preemptive/round-robin.js';
import { run } from '../../../../src/core/simulate.js';

describe('Round-Robin', () => {
  const algo = new RoundRobin();

  it('tiene preemptionMode on-quantum y requires quantum', () => {
    expect(algo.preemptionMode).toBe('on-quantum');
    expect(algo.requires.quantum).toBe(true);
    expect(algo.name).toBe('Round-Robin');
  });

  it('select lanza error si la lista está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select devuelve el primer elemento de la lista', () => {
    const ready = [
      { id: 'P2', arrival_time: 1, burst_time: 4, remaining: 4 },
      { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 3 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  // BEHAVIOURS § Simular — Round Robin (caso 1) quantum=2
  // P1(0,5), P2(1,4), P3(2,2)
  // Gantt: P1[0-2], P2[2-4], P3[4-6], P1[6-8], P2[8-10], P1[10-11]
  // avgWaiting=4.33, avgTurnaround=8.00
  it('fixture 1 quantum=2: P1[0-2], P2[2-4], P3[4-6], P1[6-8], P2[8-10], P1[10-11]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
    ];
    const result = run(processes, algo, { quantum: 2 });
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P3', start: 4, end: 6 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P1', start: 6, end: 8 });
    expect(result.intervals[4]).toMatchObject({ pid: 'P2', start: 8, end: 10 });
    expect(result.intervals[5]).toMatchObject({ pid: 'P1', start: 10, end: 11 });
    expect(result.metrics.aggregate.avgWaiting).toBe(4.33);
    expect(result.metrics.aggregate.avgTurnaround).toBe(8);
  });

  // BEHAVIOURS § Simular — Round Robin (caso 2) quantum=3 con idle gaps
  // P1(0,2), P2(5,4), P3(12,3)
  // Gantt: P1[0-2], Idle[2-5], P2[5-8], P2[8-9], Idle[9-12], P3[12-15]
  it('fixture 2 quantum=3: idle gaps', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 5, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 3 },
    ];
    const result = run(processes, algo, { quantum: 3 });
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: null, start: 2, end: 5 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P2', start: 5, end: 8 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P2', start: 8, end: 9 });
    expect(result.intervals[4]).toMatchObject({ pid: null, start: 9, end: 12 });
    expect(result.intervals[5]).toMatchObject({ pid: 'P3', start: 12, end: 15 });
  });

  // BEHAVIOURS § Simular — Round Robin (caso 3) quantum=1
  // P1(0,3), P2(0,2), P3(0,1)
  // Gantt: P1[0-1], P2[1-2], P3[2-3], P1[3-4], P2[4-5], P1[5-6]
  it('fixture 3 quantum=1: P1[0-1], P2[1-2], P3[2-3], P1[3-4], P2[4-5], P1[5-6]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2 },
      { id: 'P3', arrival_time: 0, burst_time: 1 },
    ];
    const result = run(processes, algo, { quantum: 1 });
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 3 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P1', start: 3, end: 4 });
    expect(result.intervals[4]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(result.intervals[5]).toMatchObject({ pid: 'P1', start: 5, end: 6 });
    const comp = Object.fromEntries(
      result.metrics.processes.map((m) => [m.id, m.completion]),
    );
    expect(comp.P3).toBe(3);
    expect(comp.P2).toBe(5);
    expect(comp.P1).toBe(6);
  });
});
