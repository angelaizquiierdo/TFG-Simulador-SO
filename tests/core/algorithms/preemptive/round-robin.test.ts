// T-23 · Tests de Round Robin — cierra § Simular — Round Robin
import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { RoundRobin } from '../../../../src/core/algorithms/preemptive/round-robin.js';

const algo = new RoundRobin();

describe('Round Robin — escenario 1 (quantum 2)', () => {
  // P1(0,5), P2(1,4), P3(2,2), quantum=2
  // → P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 5 },
    { id: 'P2', arrival_time: 1, burst_time: 4 },
    { id: 'P3', arrival_time: 2, burst_time: 2 },
  ];
  const result = run(processes, { algorithm: algo, params: { quantum: 2 } });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 4, end: 6 });
    expect(active[3]).toMatchObject({ pid: 'P1', start: 6, end: 8 });
    expect(active[4]).toMatchObject({ pid: 'P2', start: 8, end: 10 });
    expect(active[5]).toMatchObject({ pid: 'P1', start: 10, end: 11 });
  });

  it('tiempo de espera medio ≈ 4.33', () => {
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(4.33, 2);
  });

  it('tiempo de retorno medio ≈ 8.00', () => {
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(8.0, 2);
  });
});

describe('Round Robin — escenario 2 (CPU inactiva, quantum 3)', () => {
  // P1(0,2), P2(5,4), P3(12,3), quantum=3
  // → P1[0–2], Idle[2–5], P2[5–8], P2[8–9], Idle[9–12], P3[12–15]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 2 },
    { id: 'P2', arrival_time: 5, burst_time: 4 },
    { id: 'P3', arrival_time: 12, burst_time: 3 },
  ];
  const result = run(processes, { algorithm: algo, params: { quantum: 3 } });

  it('CPU inactiva en [2–5] y [9–12]', () => {
    const idle = result.intervals.filter(i => i.pid === null);
    expect(idle[0]).toMatchObject({ start: 2, end: 5 });
    expect(idle[1]).toMatchObject({ start: 9, end: 12 });
  });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    // P2 ejecuta [5–8] (1er quantum) y [8–9] (restante); deriveIntervals los colapsa en [5–9]
    expect(active[1]).toMatchObject({ pid: 'P2', start: 5, end: 9 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 12, end: 15 });
  });
});

describe('Round Robin — escenario 3 (quantum 1, todos llegan en t=0)', () => {
  // P1(0,3), P2(0,2), P3(0,1), quantum=1
  // → P1[0–1], P2[1–2], P3[2–3], P1[3–4], P2[4–5], P1[5–6]
  const processes = [
    { id: 'P1', arrival_time: 0, burst_time: 3 },
    { id: 'P2', arrival_time: 0, burst_time: 2 },
    { id: 'P3', arrival_time: 0, burst_time: 1 },
  ];
  const result = run(processes, { algorithm: algo, params: { quantum: 1 } });

  it('diagrama de Gantt correcto', () => {
    const active = result.intervals.filter(i => i.pid !== null);
    expect(active[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(active[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(active[2]).toMatchObject({ pid: 'P3', start: 2, end: 3 });
    expect(active[3]).toMatchObject({ pid: 'P1', start: 3, end: 4 });
    expect(active[4]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(active[5]).toMatchObject({ pid: 'P1', start: 5, end: 6 });
  });

  it('tiempos de finalización correctos', () => {
    const m = result.metrics.perProcess;
    expect(m.find(p => p.id === 'P3')?.completion).toBe(3);
    expect(m.find(p => p.id === 'P2')?.completion).toBe(5);
    expect(m.find(p => p.id === 'P1')?.completion).toBe(6);
  });
});
