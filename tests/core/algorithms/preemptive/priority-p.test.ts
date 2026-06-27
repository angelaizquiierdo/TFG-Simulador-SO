import { describe, it, expect, beforeAll } from 'vitest';
import { PriorityP } from '../../../../src/core/algorithms/preemptive/priority-p.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

describe('PriorityP', () => {
  const algo = new PriorityP();

  beforeAll(() => { register(algo); });

  it('tiene los metadatos correctos', () => {
    expect(algo.name).toBe('priority-p');
    expect(algo.preemptionMode).toBe('on-better');
    expect(algo.requires.io).toBe(false);
  });

  it('select lanza error con cola vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  // § Simular — Prioridad (expropiativa): fixture 1 P1[0–2], P3[2–4], P1[4–6], P2[6–8]
  it('fixture 1: P1[0–2], P3[2–4], P1[4–6], P2[6–8]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4, priority: 2 },
        { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
        { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
      ],
      { algorithm: 'priority-p' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(gantt[1]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(gantt[2]).toMatchObject({ pid: 'P1', start: 4, end: 6 });
    expect(gantt[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
    const p3 = result.metrics.perProcess.find(m => m.id === 'P3');
    const p1 = result.metrics.perProcess.find(m => m.id === 'P1');
    const p2 = result.metrics.perProcess.find(m => m.id === 'P2');
    expect(p3?.completion).toBe(4);
    expect(p1?.completion).toBe(6);
    expect(p2?.completion).toBe(8);
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.00, 1);
  });

  // § Simular — Prioridad (expropiativa): fixture 2 P1[0–1], P2[1–2], P3[2–4], P2[4–6], P1[6–10]
  it('fixture 2: P1[0–1], P2[1–2], P3[2–4], P2[4–6], P1[6–10]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 5, priority: 3 },
        { id: 'P2', arrival_time: 1, burst_time: 3, priority: 2 },
        { id: 'P3', arrival_time: 2, burst_time: 2, priority: 1 },
      ],
      { algorithm: 'priority-p' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(gantt[3]).toMatchObject({ pid: 'P2', start: 4, end: 6 });
    expect(gantt[4]).toMatchObject({ pid: 'P1', start: 6, end: 10 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.67, 1);
  });

  // § Simular — Prioridad (expropiativa): fixture 4 sin expropiación P1[0–3], P2[3–5], P3[5–7]
  it('fixture 4: sin expropiación P1[0–3], P2[3–5], P3[5–7]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3, priority: 1 },
        { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
        { id: 'P3', arrival_time: 2, burst_time: 2, priority: 3 },
      ],
      { algorithm: 'priority-p' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(4.00, 1);
  });

  it('proceso sin priority no lanza error en simulación', () => {
    expect(() =>
      run(
        [{ id: 'P1', arrival_time: 0, burst_time: 2 }],
        { algorithm: 'priority-p' }
      )
    ).not.toThrow();
  });
});
