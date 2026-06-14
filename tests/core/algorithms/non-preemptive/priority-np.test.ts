// T-20 · Tests de Prioridad NP — cierra § Simular — Prioridad (no expropiativa)
import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { PriorityNP } from '../../../../src/core/algorithms/non-preemptive/priority-np.js';

const algo = new PriorityNP();

describe('Prioridad NP — escenario 1', () => {
  // P1(0,3,prio3), P2(1,2,prio2), P3(2,2,prio2) → P1[0–3], P2[3–5], P3[5–7]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 2, priority: 2 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
  });

  it('tiempo de espera medio ≈ 1.67', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 2);
  });

  it('tiempo de retorno medio ≈ 4.00', () => {
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(4.0, 2);
  });
});

describe('Prioridad NP — escenario 2', () => {
  // P1(0,3,prio3), P2(1,2,prio1), P3(2,4,prio2) → P1[0–3], P2[3–5], P3[5–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
    { id: 'P2', arrival_time: 1, burst_time: 2, priority: 1 },
    { id: 'P3', arrival_time: 2, burst_time: 4, priority: 2 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 5, end: 9 });
  });

  it('tiempo de espera medio ≈ 1.67', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 2);
  });
});

describe('Prioridad NP — escenario 3 (CPU inactiva)', () => {
  // P1(0,2,prio1), P2(4,2,prio3), P3(5,2,prio2) → P1[0–2], Idle[2–4], P2[4–6], P3[6–8]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2, priority: 1 },
    { id: 'P2', arrival_time: 4, burst_time: 2, priority: 3 },
    { id: 'P3', arrival_time: 5, burst_time: 2, priority: 2 },
  ];
  const result = run(processes, { algorithm: algo });

  it('CPU inactiva en [2–4]', () => {
    const idle = result.intervals.filter(i => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 4 });
  });

  it('diagrama correcto con hueco', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 4, end: 6 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 6, end: 8 });
  });
});

describe('Prioridad NP — escenario 4 (todos llegan en t=0)', () => {
  // P1(0,4,prio4), P2(0,3,prio2), P3(0,2,prio1) → P3[0–2], P2[2–5], P1[5–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 4, priority: 4 },
    { id: 'P2', arrival_time: 0, burst_time: 3, priority: 2 },
    { id: 'P3', arrival_time: 0, burst_time: 2, priority: 1 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P3', start: 0, end: 2 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 2, end: 5 });
    expect(active[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });
});

describe('Prioridad NP — proceso sin priority', () => {
  it('se trata como prioridad más baja (Infinity) y no lanza error', () => {
    const processes = [{ id: 'P1', arrival_time: 0, burst_time: 2 }];
    expect(() => run(processes, { algorithm: algo })).not.toThrow();
  });
});
