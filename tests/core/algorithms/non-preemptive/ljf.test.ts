// T-19 · Tests de LJF — cierra § Simular — LJF
import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { LJF } from '../../../../src/core/algorithms/non-preemptive/ljf.js';

const algo = new LJF();

describe('LJF — escenario 1', () => {
  // P1(0,2), P2(0,4), P3(0,3) → P2[0–4], P3[4–7], P1[7–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 0, burst_time: 4 },
    { id: 'P3', arrival_time: 0, burst_time: 3 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P2', start: 0, end: 4 });
    expect(active[1]).toMatchObject({ pid: 'P3', start: 4, end: 7 });
    expect(active[2]).toMatchObject({ pid: 'P1', start: 7, end: 9 });
  });

  it('tiempo de espera medio ≈ 3.67', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(3.67, 2);
  });

  it('tiempo de retorno medio ≈ 6.67', () => {
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(6.67, 2);
  });
});

describe('LJF — escenario 2 (CPU inactiva)', () => {
  // P1(0,2), P2(0,3), P3(6,3) → P2[0–3], P1[3–5], Inactivo[5–6], P3[6–9]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 0, burst_time: 3 },
    { id: 'P3', arrival_time: 6, burst_time: 3 },
  ];
  const result = run(processes, { algorithm: algo });

  it('diagrama de Gantt correcto con hueco de inactividad', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P2', start: 0, end: 3 });
    expect(active[1]).toMatchObject({ pid: 'P1', start: 3, end: 5 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 6, end: 9 });
  });

  it('CPU inactiva en [5–6]', () => {
    const idle = result.intervals.filter(i => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 5, end: 6 });
  });

  it('tiempo de espera medio ≈ 1', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1, 2);
  });
});
