import { describe, it, expect, beforeAll } from 'vitest';
import { SRTF } from '../../../../src/core/algorithms/preemptive/srtf.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

const algo = new SRTF();

beforeAll(() => {
  register(algo);
});

describe('SRTF — select()', () => {
  it('devuelve el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 8, remaining: 7 },
      { id: 'P2', arrival_time: 1, burst_time: 4, remaining: 3 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  it('lanza error si la cola está vacía', () => {
    expect(() => algo.select([])).toThrow();
  });
});

describe('SRTF — BEHAVIOURS § Simular — SRTF (escenario 1)', () => {
  // P1(0,8), P2(1,4), P3(2,2), P4(4,1)
  // → P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 8 },
    { id: 'P2', arrival_time: 1, burst_time: 4 },
    { id: 'P3', arrival_time: 2, burst_time: 2 },
    { id: 'P4', arrival_time: 4, burst_time: 1 },
  ];

  it('diagrama de Gantt: P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15]', () => {
    const result = run(processes, { algorithm: 'srtf' });
    const intervals = result.intervals.filter((i) => i.pid !== null);
    expect(intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(intervals[3]).toMatchObject({ pid: 'P4', start: 4, end: 5 });
    expect(intervals[4]).toMatchObject({ pid: 'P2', start: 5, end: 8 });
    expect(intervals[5]).toMatchObject({ pid: 'P1', start: 8, end: 15 });
  });

  it('P3 finaliza en tick 4, P4 en tick 5, P2 en tick 8, P1 en tick 15', () => {
    const result = run(processes, { algorithm: 'srtf' });
    const metrics = result.metrics.perProcess;
    const find = (id: string) => metrics.find((m) => m.id === id);
    expect(find('P3')?.completion).toBe(4);
    expect(find('P4')?.completion).toBe(5);
    expect(find('P2')?.completion).toBe(8);
    expect(find('P1')?.completion).toBe(15);
  });
});

describe('SRTF — BEHAVIOURS § Simular — SRTF (escenario 2, CPU inactiva)', () => {
  // P1(0,2), P2(4,3), P3(5,1) → P1[0–2], Inactivo[2–4], P2[4–5], P3[5–6], P2[6–8]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 4, burst_time: 3 },
    { id: 'P3', arrival_time: 5, burst_time: 1 },
  ];

  it('CPU inactiva en [2–4]', () => {
    const result = run(processes, { algorithm: 'srtf' });
    const idle = result.intervals.filter((i) => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 4 });
  });

  it('diagrama: P1[0–2], P2[4–5], P3[5–6], P2[6–8]', () => {
    const result = run(processes, { algorithm: 'srtf' });
    const withPid = result.intervals.filter((i) => i.pid !== null);
    expect(withPid[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(withPid[1]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(withPid[2]).toMatchObject({ pid: 'P3', start: 5, end: 6 });
    expect(withPid[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
  });
});

describe('SRTF — BEHAVIOURS § Simular — SRTF (escenario 3, múltiples ociosos)', () => {
  // P1(2,2), P2(6,4), P3(12,2) → Inactivo[0–2], P1[2–4], Inactivo[4–6], P2[6–10], Inactivo[10–12], P3[12–14]
  const processes = [
    { id: 'P1', arrival_time: 2, burst_time: 2 },
    { id: 'P2', arrival_time: 6, burst_time: 4 },
    { id: 'P3', arrival_time: 12, burst_time: 2 },
  ];

  it('CPU inactiva en [0–2], [4–6] y [10–12]', () => {
    const result = run(processes, { algorithm: 'srtf' });
    const idle = result.intervals.filter((i) => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 0, end: 2 });
    expect(idle[1]).toMatchObject({ start: 4, end: 6 });
    expect(idle[2]).toMatchObject({ start: 10, end: 12 });
  });

  it('diagrama: P1[2–4], P2[6–10], P3[12–14]', () => {
    const result = run(processes, { algorithm: 'srtf' });
    const withPid = result.intervals.filter((i) => i.pid !== null);
    expect(withPid[0]).toMatchObject({ pid: 'P1', start: 2, end: 4 });
    expect(withPid[1]).toMatchObject({ pid: 'P2', start: 6, end: 10 });
    expect(withPid[2]).toMatchObject({ pid: 'P3', start: 12, end: 14 });
  });
});
