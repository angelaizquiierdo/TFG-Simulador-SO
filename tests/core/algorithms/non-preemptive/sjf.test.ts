import { describe, it, expect, beforeAll } from 'vitest';
import { SJF } from '../../../../src/core/algorithms/non-preemptive/sjf.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

const algo = new SJF();

beforeAll(() => {
  register(algo);
});

describe('SJF — select()', () => {
  it('devuelve el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 5 },
      { id: 'P4', arrival_time: 3, burst_time: 1, remaining: 1 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2 },
    ];
    expect(algo.select(ready).id).toBe('P4');
  });

  it('lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });
});

describe('SJF — BEHAVIOURS § Simular — SJF (escenario 1)', () => {
  // P1(0,5), P2(1,2), P3(2,4), P4(3,1) → P1[0–5], P4[5–6], P2[6–8], P3[8–12]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 5 },
    { id: 'P2', arrival_time: 1, burst_time: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 4 },
    { id: 'P4', arrival_time: 3, burst_time: 1 },
  ];

  it('diagrama de Gantt: P1[0–5], P4[5–6], P2[6–8], P3[8–12]', () => {
    const result = run(processes, { algorithm: 'sjf' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 5 });
    expect(intervals[1]).toMatchObject({ pid: 'P4', start: 5, end: 6 });
    expect(intervals[2]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
    expect(intervals[3]).toMatchObject({ pid: 'P3', start: 8, end: 12 });
  });

  it('tiempo de espera medio ≈ 3.25', () => {
    const result = run(processes, { algorithm: 'sjf' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(3.25, 2);
  });

  it('tiempo de retorno medio ≈ 6.25', () => {
    const result = run(processes, { algorithm: 'sjf' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(6.25, 2);
  });
});

describe('SJF — BEHAVIOURS § Simular — SJF (escenario 2, CPU inactiva)', () => {
  // P1(0,2), P2(5,2), P3(6,3), P4(12,1)
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 5, burst_time: 2 },
    { id: 'P3', arrival_time: 6, burst_time: 3 },
    { id: 'P4', arrival_time: 12, burst_time: 1 },
  ];

  it('CPU inactiva en [2–5] y [10–12]', () => {
    const result = run(processes, { algorithm: 'sjf' });
    const idle = result.intervals.filter((i) => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 5 });
    expect(idle[1]).toMatchObject({ start: 10, end: 12 });
  });

  it('diagrama de Gantt: P1[0–2], P2[5–7], P3[7–10], P4[12–13]', () => {
    const result = run(processes, { algorithm: 'sjf' });
    const withPid = result.intervals.filter((i) => i.pid !== null);
    expect(withPid[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(withPid[1]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(withPid[2]).toMatchObject({ pid: 'P3', start: 7, end: 10 });
    expect(withPid[3]).toMatchObject({ pid: 'P4', start: 12, end: 13 });
  });
});

describe('SJF — BEHAVIOURS § Simular — SJF (escenario 3, desempate)', () => {
  // P1(0,4), P2(0,2), P3(0,3) → P2[0–2], P3[2–5], P1[5–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 4 },
    { id: 'P2', arrival_time: 0, burst_time: 2 },
    { id: 'P3', arrival_time: 0, burst_time: 3 },
  ];

  it('diagrama de Gantt: P2[0–2], P3[2–5], P1[5–9]', () => {
    const result = run(processes, { algorithm: 'sjf' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P2', start: 0, end: 2 });
    expect(intervals[1]).toMatchObject({ pid: 'P3', start: 2, end: 5 });
    expect(intervals[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    const result = run(processes, { algorithm: 'sjf' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('tiempo de retorno medio ≈ 5.33', () => {
    const result = run(processes, { algorithm: 'sjf' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 2);
  });
});
