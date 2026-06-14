import { describe, it, expect, beforeAll } from 'vitest';
import { FCFS } from '../../../../src/core/algorithms/non-preemptive/fcfs.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

const algo = new FCFS();

beforeAll(() => {
  register(algo);
});

describe('FCFS — select()', () => {
  it('devuelve el primer proceso de la cola', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3 },
      { id: 'P3', arrival_time: 1, burst_time: 4, remaining: 4 },
    ];
    expect(algo.select(ready).id).toBe('P1');
  });

  it('lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });
});

describe('FCFS — BEHAVIOURS § Simular — FCFS (escenario 1)', () => {
  // P1(0,3), P2(2,2), P3(1,4) → P1[0–3], P3[3–7], P2[7–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 2, burst_time: 2 },
    { id: 'P3', arrival_time: 1, burst_time: 4 },
  ];

  it('diagrama de Gantt: P1[0–3], P3[3–7], P2[7–9]', () => {
    const result = run(processes, { algorithm: 'fcfs' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(intervals[1]).toMatchObject({ pid: 'P3', start: 3, end: 7 });
    expect(intervals[2]).toMatchObject({ pid: 'P2', start: 7, end: 9 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    const result = run(processes, { algorithm: 'fcfs' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('tiempo de retorno medio ≈ 5.33', () => {
    const result = run(processes, { algorithm: 'fcfs' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 2);
  });
});

describe('FCFS — BEHAVIOURS § Simular — FCFS (escenario 2, CPU inactiva)', () => {
  // P1(0,3), P2(5,2), P3(6,4) → P1[0–3], Inactivo[3–5], P2[5–7], P3[7–11]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 5, burst_time: 2 },
    { id: 'P3', arrival_time: 6, burst_time: 4 },
  ];

  it('diagrama de Gantt: P1[0–3], P2[5–7], P3[7–11]', () => {
    const result = run(processes, { algorithm: 'fcfs' });
    const withPid = result.intervals.filter((i) => i.pid !== null);
    expect(withPid[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(withPid[1]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(withPid[2]).toMatchObject({ pid: 'P3', start: 7, end: 11 });
  });

  it('tiempo de espera medio ≈ 0.33', () => {
    const result = run(processes, { algorithm: 'fcfs' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(0.33, 2);
  });

  it('tiempo de retorno medio ≈ 3.33', () => {
    const result = run(processes, { algorithm: 'fcfs' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3.33, 2);
  });
});
