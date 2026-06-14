// T-18 · Tests de SJF — cierra § Simular — SJF
import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { SJF } from '../../../../src/core/algorithms/non-preemptive/sjf.js';

const algo = new SJF();

describe('SJF — escenario 1', () => {
  // P1(0,5), P2(1,2), P3(2,4), P4(3,1) → P1[0–5], P4[5–6], P2[6–8], P3[8–12]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 5 },
    { id: 'P2', arrival_time: 1, burst_time: 2 },
    { id: 'P3', arrival_time: 2, burst_time: 4 },
    { id: 'P4', arrival_time: 3, burst_time: 1 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 5 });
    expect(active[1]).toMatchObject({ pid: 'P4', start: 5, end: 6 });
    expect(active[2]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
    expect(active[3]).toMatchObject({ pid: 'P3', start: 8, end: 12 });
  });

  it('tiempo de espera medio ≈ 3.25', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(3.25, 2);
  });

  it('tiempo de retorno medio ≈ 6.25', () => {
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(6.25, 2);
  });
});

describe('SJF — escenario 2 (CPU inactiva)', () => {
  // P1(0,2), P2(5,2), P3(6,3), P4(12,1)
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 5, burst_time: 2 },
    { id: 'P3', arrival_time: 6, burst_time: 3 },
    { id: 'P4', arrival_time: 12, burst_time: 1 },
  ];
  const result = run(processes, { algorithm: algo });

  it('CPU inactiva en [2–5] y [10–12]', () => {
    const idle = result.intervals.filter(i => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 5 });
    expect(idle[1]).toMatchObject({ start: 10, end: 12 });
  });
});

describe('SJF — escenario 3 (desempate por burst_time igual)', () => {
  // P1(0,4), P2(0,2), P3(0,3) → P2[0–2], P3[2–5], P1[5–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 4 },
    { id: 'P2', arrival_time: 0, burst_time: 2 },
    { id: 'P3', arrival_time: 0, burst_time: 3 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P2', start: 0, end: 2 });
    expect(active[1]).toMatchObject({ pid: 'P3', start: 2, end: 5 });
    expect(active[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
  });

  it('tiempo de espera medio ≈ 2.33', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 2);
  });
});
