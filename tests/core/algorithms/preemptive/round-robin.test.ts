import { describe, it, expect, beforeAll } from 'vitest';
import { RoundRobin } from '../../../../src/core/algorithms/preemptive/round-robin.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

const algo = new RoundRobin();

beforeAll(() => {
  register(algo);
});

describe('RoundRobin — select()', () => {
  it('devuelve el primer proceso de la cola', () => {
    const ready = [
      { id: 'P2', arrival_time: 1, burst_time: 4, remaining: 4 },
      { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 3 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  it('lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });
});

describe('RoundRobin — BEHAVIOURS § Simular — Round Robin (escenario 1, quantum 2)', () => {
  // P1(0,5), P2(1,4), P3(2,2) quantum=2
  // → P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 5 },
    { id: 'P2', arrival_time: 1, burst_time: 4 },
    { id: 'P3', arrival_time: 2, burst_time: 2 },
  ];

  it('diagrama: P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]', () => {
    const result = run(processes, { algorithm: 'round-robin', params: { quantum: 2 } });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    expect(intervals[2]).toMatchObject({ pid: 'P3', start: 4, end: 6 });
    expect(intervals[3]).toMatchObject({ pid: 'P1', start: 6, end: 8 });
    expect(intervals[4]).toMatchObject({ pid: 'P2', start: 8, end: 10 });
    expect(intervals[5]).toMatchObject({ pid: 'P1', start: 10, end: 11 });
  });

  it('tiempo de espera medio ≈ 4.33', () => {
    const result = run(processes, { algorithm: 'round-robin', params: { quantum: 2 } });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(4.33, 2);
  });

  it('tiempo de retorno medio ≈ 8.00', () => {
    const result = run(processes, { algorithm: 'round-robin', params: { quantum: 2 } });
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(8.00, 2);
  });
});

describe('RoundRobin — BEHAVIOURS § Simular — Round Robin (escenario 2, quantum 3, CPU inactiva)', () => {
  // P1(0,2), P2(5,4), P3(12,3) quantum=3
  // → P1[0–2], Inactivo[2–5], P2[5–8], P2[8–9], Inactivo[9–12], P3[12–15]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 5, burst_time: 4 },
    { id: 'P3', arrival_time: 12, burst_time: 3 },
  ];

  it('CPU inactiva en [2–5] y [9–12]', () => {
    const result = run(processes, { algorithm: 'round-robin', params: { quantum: 3 } });
    const idle = result.intervals.filter((i) => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 5 });
    expect(idle[1]).toMatchObject({ start: 9, end: 12 });
  });

  it('diagrama: P1[0–2], P2[5–8], P2[8–9], P3[12–15]', () => {
    const result = run(processes, { algorithm: 'round-robin', params: { quantum: 3 } });
    const withPid = result.intervals.filter((i) => i.pid !== null);
    expect(withPid[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(withPid[1]).toMatchObject({ pid: 'P2', start: 5, end: 8 });
    expect(withPid[2]).toMatchObject({ pid: 'P2', start: 8, end: 9 });
    expect(withPid[3]).toMatchObject({ pid: 'P3', start: 12, end: 15 });
  });
});

describe('RoundRobin — BEHAVIOURS § Simular — Round Robin (escenario 3, quantum 1)', () => {
  // P1(0,3), P2(0,2), P3(0,1) quantum=1
  // → P1[0–1], P2[1–2], P3[2–3], P1[3–4], P2[4–5], P1[5–6]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 0, burst_time: 2 },
    { id: 'P3', arrival_time: 0, burst_time: 1 },
  ];

  it('diagrama: P1[0–1], P2[1–2], P3[2–3], P1[3–4], P2[4–5], P1[5–6]', () => {
    const result = run(processes, { algorithm: 'round-robin', params: { quantum: 1 } });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 3 });
    expect(intervals[3]).toMatchObject({ pid: 'P1', start: 3, end: 4 });
    expect(intervals[4]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(intervals[5]).toMatchObject({ pid: 'P1', start: 5, end: 6 });
  });

  it('P3 finaliza en tick 3, P2 en tick 5, P1 en tick 6', () => {
    const result = run(processes, { algorithm: 'round-robin', params: { quantum: 1 } });
    const metrics = result.metrics.perProcess;
    const find = (id: string) => metrics.find((m) => m.id === id);
    expect(find('P3')?.completion).toBe(3);
    expect(find('P2')?.completion).toBe(5);
    expect(find('P1')?.completion).toBe(6);
  });
});
