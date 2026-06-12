import { describe, it, expect } from 'vitest';
import { SRTF } from '../../../../src/core/algorithms/preemptive/srtf.js';
import { run } from '../../../../src/core/simulate.js';

describe('SRTF', () => {
  const algo = new SRTF();

  it('tiene preemptionMode on-better', () => {
    expect(algo.preemptionMode).toBe('on-better');
    expect(algo.name).toBe('SRTF');
  });

  it('select lanza error si la lista está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select devuelve el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 8, remaining: 7 },
      { id: 'P2', arrival_time: 1, burst_time: 4, remaining: 4 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  // BEHAVIOURS § Simular — SRTF (caso 1)
  // P1(0,8), P2(1,4), P3(2,2), P4(4,1)
  // Gantt: P1[0-1], P2[1-2], P3[2-4], P4[4-5], P2[5-8], P1[8-15]
  it('fixture 1: P1[0-1], P2[1-2], P3[2-4], P4[4-5], P2[5-8], P1[8-15]', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P4', start: 4, end: 5 });
    expect(result.intervals[4]).toMatchObject({ pid: 'P2', start: 5, end: 8 });
    expect(result.intervals[5]).toMatchObject({ pid: 'P1', start: 8, end: 15 });
    // Verificar tiempos de finalización
    const comp = Object.fromEntries(
      result.metrics.processes.map((m) => [m.id, m.completion]),
    );
    expect(comp.P3).toBe(4);
    expect(comp.P4).toBe(5);
    expect(comp.P2).toBe(8);
    expect(comp.P1).toBe(15);
  });

  // BEHAVIOURS § Simular — SRTF (caso 2): idle gap
  // P1(0,2), P2(4,3), P3(5,1)
  // Gantt: P1[0-2], Idle[2-4], P2[4-5], P3[5-6], P2[6-8]
  it('fixture 2: idle gap y expropiación por P3', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: null, start: 2, end: 4 });
    expect(result.intervals[2]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P3', start: 5, end: 6 });
    expect(result.intervals[4]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
  });

  // BEHAVIOURS § Simular — SRTF (caso 3): múltiples idle gaps
  // P1(2,2), P2(6,4), P3(12,2)
  // Gantt: Idle[0-2], P1[2-4], Idle[4-6], P2[6-10], Idle[10-12], P3[12-14]
  it('fixture 3: múltiples idle gaps', () => {
    const processes = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
      { id: 'P2', arrival_time: 6, burst_time: 4 },
      { id: 'P3', arrival_time: 12, burst_time: 2 },
    ];
    const result = run(processes, algo);
    expect(result.intervals[0]).toMatchObject({ pid: null, start: 0, end: 2 });
    expect(result.intervals[1]).toMatchObject({ pid: 'P1', start: 2, end: 4 });
    expect(result.intervals[2]).toMatchObject({ pid: null, start: 4, end: 6 });
    expect(result.intervals[3]).toMatchObject({ pid: 'P2', start: 6, end: 10 });
    expect(result.intervals[4]).toMatchObject({ pid: null, start: 10, end: 12 });
    expect(result.intervals[5]).toMatchObject({ pid: 'P3', start: 12, end: 14 });
  });
});
