import { describe, it, expect, beforeAll } from 'vitest';
import { RoundRobin } from '../../../../src/core/algorithms/preemptive/round-robin.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

describe('RoundRobin', () => {
  const algo = new RoundRobin();

  beforeAll(() => { register(() => algo); });

  it('tiene los metadatos correctos', () => {
    expect(algo.name).toBe('round-robin');
    expect(algo.preemptionMode).toBe('on-quantum');
    expect(algo.requires.quantum).toBe(true);
  });

  it('select lanza error con cola vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  // § Simular — Round Robin: P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]
  it('fixture 1: quantum 2, P1[0–2], P2[2–4], P3[4–6], P1[6–8], P2[8–10], P1[10–11]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 5 },
        { id: 'P2', arrival_time: 1, burst_time: 4 },
        { id: 'P3', arrival_time: 2, burst_time: 2 },
      ],
      { algorithm: 'round-robin', quantum: 2 }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 4, end: 6 });
    expect(gantt[3]).toMatchObject({ pid: 'P1', start: 6, end: 8 });
    expect(gantt[4]).toMatchObject({ pid: 'P2', start: 8, end: 10 });
    expect(gantt[5]).toMatchObject({ pid: 'P1', start: 10, end: 11 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(4.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(8.00, 1);
  });

  // § Simular — Round Robin: fixture 2 con CPU inactiva
  it('fixture 2: quantum 3, con CPU inactiva', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 5, burst_time: 4 },
        { id: 'P3', arrival_time: 12, burst_time: 3 },
      ],
      { algorithm: 'round-robin', quantum: 3 }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    // P2 tiene burst=4, quantum=3: primer tramo [5–8], luego reencola y vuelve [8–9]
    // deriveIntervals fusiona ambos en un solo intervalo [5–9] porque no hay cambio de pid
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 5, end: 9 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 12, end: 15 });
  });

  // § Simular — Round Robin: fixture 3 quantum 1
  it('fixture 3: quantum 1, P1[0–1], P2[1–2], P3[2–3], P1[3–4], P2[4–5], P1[5–6]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3 },
        { id: 'P2', arrival_time: 0, burst_time: 2 },
        { id: 'P3', arrival_time: 0, burst_time: 1 },
      ],
      { algorithm: 'round-robin', quantum: 1 }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 2, end: 3 });
    expect(gantt[3]).toMatchObject({ pid: 'P1', start: 3, end: 4 });
    expect(gantt[4]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(gantt[5]).toMatchObject({ pid: 'P1', start: 5, end: 6 });
    const p3 = result.metrics.perProcess.find(m => m.id === 'P3');
    const p2 = result.metrics.perProcess.find(m => m.id === 'P2');
    const p1 = result.metrics.perProcess.find(m => m.id === 'P1');
    expect(p3?.completion).toBe(3);
    expect(p2?.completion).toBe(5);
    expect(p1?.completion).toBe(6);
  });
});
