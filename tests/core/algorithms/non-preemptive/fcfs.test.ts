// T-17 · Tests de FCFS — cierra § Simular — FCFS
import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { FCFS } from '../../../../src/core/algorithms/non-preemptive/fcfs.js';

const algo = new FCFS();

describe('FCFS — escenario 1', () => {
  // P1(0,3), P2(2,2), P3(1,4) → P1[0–3], P3[3–7], P2[7–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 2, burst_time: 2 },
    { id: 'P3', arrival_time: 1, burst_time: 4 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const intervals = result.intervals.filter(i => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(intervals[1]).toMatchObject({ pid: 'P3', start: 3, end: 7 });
    expect(intervals[2]).toMatchObject({ pid: 'P2', start: 7, end: 9 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('tiempo de retorno medio ≈ 5.33', () => {
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 2);
  });
});

describe('FCFS — escenario 2 (CPU inactiva)', () => {
  // P1(0,3), P2(5,2), P3(6,4) → P1[0–3], P2[5–7], P3[7–11]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 5, burst_time: 2 },
    { id: 'P3', arrival_time: 6, burst_time: 4 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto con hueco de inactividad', () => {
    const intervals = result.intervals;
    const active = intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 7, end: 11 });
  });

  it('tiempo de espera medio ≈ 0.33', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(0.33, 2);
  });

  it('tiempo de retorno medio ≈ 3.33', () => {
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3.33, 2);
  });
});
