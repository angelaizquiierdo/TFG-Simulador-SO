import { describe, it, expect, beforeAll } from 'vitest';
import { PriorityP } from '../../../../src/core/algorithms/preemptive/priority-p.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

const algo = new PriorityP();

beforeAll(() => {
  register(algo);
});

describe('PriorityP — select()', () => {
  it('devuelve el proceso con menor prioridad numérica', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 4, remaining: 4, priority: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 2, remaining: 2, priority: 1 },
    ];
    expect(algo.select(ready).id).toBe('P3');
  });

  it('trata procesos sin priority como Infinity', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 2, remaining: 2, priority: 3 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  it('lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });
});

describe('PriorityP — BEHAVIOURS § Simular — Prioridad P (escenario 1)', () => {
  // P1(0,4,prio2), P2(1,2,prio2), P3(2,2,prio1)
  // → P1[0–2], P3[2–4], P1[4–6], P2[6–8]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
  ];

  it('diagrama de Gantt: P1[0–2], P3[2–4], P1[4–6], P2[6–8]', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(intervals[1]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(intervals[2]).toMatchObject({ pid: 'P1', start: 4, end: 6 });
    expect(intervals[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
  });

  it('P3 en tick 4, P1 en tick 6, P2 en tick 8', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    const metrics = result.metrics.perProcess;
    const find = (id: string) => metrics.find((m) => m.id === id);
    expect(find('P3')?.completion).toBe(4);
    expect(find('P1')?.completion).toBe(6);
    expect(find('P2')?.completion).toBe(8);
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('tiempo de retorno medio ≈ 5.00', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.00, 2);
  });
});

describe('PriorityP — BEHAVIOURS § Simular — Prioridad P (escenario 2)', () => {
  // P1(0,5,prio3), P2(1,3,prio2), P3(2,2,prio1)
  // → P1[0–1], P2[1–2], P3[2–4], P2[4–6], P1[6–10]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 5, priority: 3 },
    { id: 'P2', arrival_time: 1, burst_time: 3, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
  ];

  it('diagrama de Gantt: P1[0–1], P2[1–2], P3[2–4], P2[4–6], P1[6–10]', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(intervals[3]).toMatchObject({ pid: 'P2', start: 4, end: 6 });
    expect(intervals[4]).toMatchObject({ pid: 'P1', start: 6, end: 10 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('tiempo de retorno medio ≈ 5.67', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.67, 2);
  });
});

describe('PriorityP — BEHAVIOURS § Simular — Prioridad P (escenario 3, CPU inactiva)', () => {
  // P1(0,2,prio2), P2(4,4,prio3), P3(5,2,prio1)
  // → P1[0–2], Inactivo[2–4], P2[4–5], P3[5–7], P2[7–10]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2, priority: 2 },
    { id: 'P2', arrival_time: 4, burst_time: 4, priority: 3 },
    { id: 'P3', arrival_time: 5, burst_time: 2, priority: 1 },
  ];

  it('CPU inactiva en [2–4]', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    const idle = result.intervals.filter((i) => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 4 });
  });

  it('diagrama: P1[0–2], P2[4–5], P3[5–7], P2[7–10]', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    const withPid = result.intervals.filter((i) => i.pid !== null);
    expect(withPid[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(withPid[1]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(withPid[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(withPid[3]).toMatchObject({ pid: 'P2', start: 7, end: 10 });
  });
});

describe('PriorityP — BEHAVIOURS § Simular — Prioridad P (escenario 4, sin expropiación)', () => {
  // P1(0,3,prio1), P2(1,2,prio2), P3(2,2,prio3) → P1[0–3], P2[3–5], P3[5–7]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 3 },
  ];

  it('diagrama: P1[0–3], P2[3–5], P3[5–7]', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(intervals[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
  });

  it('tiempo de espera medio ≈ 1.67', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 2);
  });

  it('tiempo de retorno medio ≈ 4.00', () => {
    const result = run(processes, { algorithm: 'priority-p' });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(4.00, 2);
  });
});

describe('PriorityP — BEHAVIOURS § proceso sin priority', () => {
  it('proceso sin priority se trata con prioridad más baja', () => {
    const processes = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    const result = run(processes, { algorithm: 'priority-p' });
    expect(result.intervals.find((i) => i.pid !== null)).toMatchObject({ pid: 'P1' });
  });
});
