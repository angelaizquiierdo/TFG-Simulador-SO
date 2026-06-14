// T-22 · Tests de Prioridad Expropiativa — cierra § Simular — Prioridad (expropiativa)
import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { PriorityP } from '../../../../src/core/algorithms/preemptive/priority-p.js';

const algo = new PriorityP();

describe('Prioridad P — escenario 1', () => {
  // P1(0,4,prio2), P2(1,2,prio2), P3(2,2,prio1)
  // → P1[0–2], P3[2–4], P1[4–6], P2[6–8]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(active[1]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(active[2]).toMatchObject({ pid: 'P1', start: 4, end: 6 });
    expect(active[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
  });

  it('tiempos de finalización correctos', () => {
    const m = result.metrics.perProcess;
    expect(m.find(p => p.id === 'P3')?.completion).toBe(4);
    expect(m.find(p => p.id === 'P1')?.completion).toBe(6);
    expect(m.find(p => p.id === 'P2')?.completion).toBe(8);
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });

  it('tiempo de retorno medio ≈ 5.00', () => {
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.0, 2);
  });
});

describe('Prioridad P — escenario 2', () => {
  // P1(0,5,prio3), P2(1,3,prio2), P3(2,2,prio1)
  // → P1[0–1], P2[1–2], P3[2–4], P2[4–6], P1[6–10]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 5, priority: 3 },
    { id: 'P2', arrival_time: 1, burst_time: 3, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(active[3]).toMatchObject({ pid: 'P2', start: 4, end: 6 });
    expect(active[4]).toMatchObject({ pid: 'P1', start: 6, end: 10 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });
});

describe('Prioridad P — escenario 3 (CPU inactiva)', () => {
  // P1(0,2,prio2), P2(4,4,prio3), P3(5,2,prio1)
  // → P1[0–2], Idle[2–4], P2[4–5], P3[5–7], P2[7–10]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2, priority: 2 },
    { id: 'P2', arrival_time: 4, burst_time: 4, priority: 3 },
    { id: 'P3', arrival_time: 5, burst_time: 2, priority: 1 },
  ];
  const result = run(processes, { algorithm: algo });

  it('CPU inactiva en [2–4]', () => {
    const idle = result.intervals.filter(i => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 4 });
  });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(active[3]).toMatchObject({ pid: 'P2', start: 7, end: 10 });
  });
});

describe('Prioridad P — escenario 4 (P1 tiene prioridad más alta)', () => {
  // P1(0,3,prio1), P2(1,2,prio2), P3(2,2,prio3) → P1[0–3], P2[3–5], P3[5–7]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 3 },
  ];
  const result = run(processes, { algorithm: algo });

  it('P1 no es expropiado (ya tiene la mayor prioridad)', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
  });

  it('tiempo de espera medio ≈ 1.67', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 2);
  });
});

describe('Prioridad P — proceso sin priority', () => {
  it('se trata como prioridad más baja (Infinity) y no lanza error', () => {
    const processes = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    expect(() => run(processes, { algorithm: algo })).not.toThrow();
  });
});
