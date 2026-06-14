import { describe, it, expect, beforeAll } from 'vitest';
import { LJF } from '../../../../src/core/algorithms/non-preemptive/ljf.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

const algo = new LJF();

beforeAll(() => {
  register(algo);
});

describe('LJF — select()', () => {
  it('devuelve el proceso con mayor burst_time', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4, remaining: 4 },
      { id: 'P3', arrival_time: 0, burst_time: 3, remaining: 3 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  it('lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });
});

describe('LJF — BEHAVIOURS § Simular — LJF (escenario 1)', () => {
  // P1(0,2), P2(0,4), P3(0,3) → P2[0–4], P3[4–7], P1[7–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 0, burst_time: 4 },
    { id: 'P3', arrival_time: 0, burst_time: 3 },
  ];

  it('diagrama de Gantt: P2[0–4], P3[4–7], P1[7–9]', () => {
    const result = run(processes, { algorithm: 'ljf' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 4 });
    expect(intervals[1]).toMatchObject({ pid: 'P3', start: 4, end: 7 });
    expect(intervals[2]).toMatchObject({ pid: 'P1', start: 7, end: 9 });
  });

  it('tiempo de espera medio ≈ 3.67', () => {
    const result = run(processes, { algorithm: 'ljf' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(3.67, 2);
  });

  it('tiempo de retorno medio ≈ 6.67', () => {
    const result = run(processes, { algorithm: 'ljf' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(6.67, 2);
  });
});

describe('LJF — BEHAVIOURS § Simular — LJF (escenario 2, CPU inactiva)', () => {
  // P1(0,2), P2(0,3), P3(6,3) → P2[0–3], P1[3–5], Inactivo[5–6], P3[6–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 0, burst_time: 3 },
    { id: 'P3', arrival_time: 6, burst_time: 3 },
  ];

  it('diagrama de Gantt: P2[0–3], P1[3–5], Inactivo[5–6], P3[6–9]', () => {
    const result = run(processes, { algorithm: 'ljf' });
    const intervals = result.intervals;
    const withPid = intervals.filter((i) => i.pid !== null);
    const idle = intervals.filter((i) => i.pid === null);
    expect(withPid[0]).toMatchObject({ pid: 'P2', start: 0, end: 3 });
    expect(withPid[1]).toMatchObject({ pid: 'P1', start: 3, end: 5 });
    expect(idle[0]).toMatchObject({ start: 5, end: 6 });
    expect(withPid[2]).toMatchObject({ pid: 'P3', start: 6, end: 9 });
  });

  it('tiempo de espera medio ≈ 1', () => {
    const result = run(processes, { algorithm: 'ljf' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1, 2);
  });

  it('tiempo de retorno medio ≈ 3.67', () => {
    const result = run(processes, { algorithm: 'ljf' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3.67, 2);
  });
});
