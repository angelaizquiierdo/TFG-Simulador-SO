import { describe, it, expect, beforeAll } from 'vitest';
import { PriorityNP } from '../../../../src/core/algorithms/non-preemptive/priority-np.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

const algo = new PriorityNP();

beforeAll(() => {
  register(algo);
});

describe('PriorityNP — select()', () => {
  it('devuelve el proceso con menor prioridad numérica', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3, priority: 3 },
      { id: 'P2', arrival_time: 0, burst_time: 2, remaining: 2, priority: 1 },
      { id: 'P3', arrival_time: 0, burst_time: 2, remaining: 2, priority: 2 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  it('trata procesos sin priority como Infinity (menor prioridad)', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 2, remaining: 2, priority: 5 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  it('lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });
});

describe('PriorityNP — BEHAVIOURS § Simular — Prioridad NP (escenario 1)', () => {
  // P1(0,3,prio3), P2(1,2,prio2), P3(2,2,prio2) → P1[0–3], P2[3–5], P3[5–7]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 2 },
  ];

  it('diagrama de Gantt: P1[0–3], P2[3–5], P3[5–7]', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
  });

  it('tiempo de espera medio ≈ 1.67', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 2);
  });

  it('tiempo de retorno medio ≈ 4.00', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(4.00, 2);
  });
});

describe('PriorityNP — BEHAVIOURS § Simular — Prioridad NP (escenario 2)', () => {
  // P1(0,3,prio3), P2(1,2,prio1), P3(2,4,prio2) → P1[0–3], P2[3–5], P3[5–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 1 },
    { id: 'P3', arrival_time: 2, burst_time: 4, priority: 2 },
  ];

  it('diagrama de Gantt: P1[0–3], P2[3–5], P3[5–9]', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 9 });
  });

  it('tiempo de espera medio ≈ 1.67', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 2);
  });

  it('tiempo de retorno medio ≈ 4.67', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(4.67, 2);
  });
});

describe('PriorityNP — BEHAVIOURS § Simular — Prioridad NP (escenario 3, CPU inactiva)', () => {
  // P1(0,2,prio1), P2(4,2,prio3), P3(5,2,prio2) → P1[0–2], Inactivo[2–4], P2[4–6], P3[6–8]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2, priority: 1 },
    { id: 'P2', arrival_time: 4, burst_time: 2, priority: 3 },
    { id: 'P3', arrival_time: 5, burst_time: 2, priority: 2 },
  ];

  it('CPU inactiva en [2–4]', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    const idle = result.intervals.filter((i) => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 4 });
  });

  it('diagrama de Gantt: P1[0–2], P2[4–6], P3[6–8]', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    const withPid = result.intervals.filter((i) => i.pid !== null);
    expect(withPid[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(withPid[1]).toMatchObject({ pid: 'P2', start: 4, end: 6 });
    expect(withPid[2]).toMatchObject({ pid: 'P3', start: 6, end: 8 });
  });
});

describe('PriorityNP — BEHAVIOURS § Simular — Prioridad NP (escenario 4, desempate)', () => {
  // P1(0,4,prio4), P2(0,3,prio2), P3(0,2,prio1) → P3[0–2], P2[2–5], P1[5–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 4, priority: 4 },
    { id: 'P2', arrival_time: 0, burst_time: 3, priority: 2 },
    { id: 'P3', arrival_time: 0, burst_time: 2, priority: 1 },
  ];

  it('diagrama de Gantt: P3[0–2], P2[2–5], P1[5–9]', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P3', start: 0, end: 2 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 5 });
    expect(intervals[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('tiempo de retorno medio ≈ 5.33', () => {
    const result = run(processes, { algorithm: 'priority-np' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 2);
  });
});

describe('PriorityNP — BEHAVIOURS § proceso sin priority (Infinity)', () => {
  it('proceso sin priority se trata con prioridad más baja', () => {
    const processes = [
      { id: 'P1', arrival_time: 0, burst_time: 2 },
    ];
    const result = run(processes, { algorithm: 'priority-np' });
    expect(result.intervals.find((i) => i.pid !== null)).toMatchObject({ pid: 'P1', start: 0, end: 2 });
  });
});
