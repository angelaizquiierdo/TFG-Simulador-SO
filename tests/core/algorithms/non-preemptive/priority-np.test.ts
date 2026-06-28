import { describe, it, expect, beforeAll } from 'vitest';
import { PriorityNP } from '../../../../src/core/algorithms/non-preemptive/priority-np.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

describe('PriorityNP', () => {
  const algo = new PriorityNP();

  beforeAll(() => { register(() => algo); });

  it('tiene los metadatos correctos', () => {
    expect(algo.name).toBe('priority-np');
    expect(algo.preemptionMode).toBe('none');
  });

  it('select lanza error con cola vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  it('select elige el de menor priority', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 3, remaining: 3, priority: 3 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2, priority: 1 },
    ];
    expect(algo.select(ready).id).toBe('P2');
  });

  it('proceso sin priority se trata como Infinity (más baja)', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 2, remaining: 2, priority: 5 },
    ];
    // P2 tiene priority 5 < Infinity → P2 gana
    expect(algo.select(ready).id).toBe('P2');
  });

  // § Simular — Prioridad (no expropiativa): fixture 1 P1[0–3], P2[3–5], P3[5–7]
  it('fixture 1: P1[0–3], P2[3–5], P3[5–7]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
        { id: 'P2', arrival_time: 1, burst_time: 2, priority: 2 },
        { id: 'P3', arrival_time: 2, burst_time: 2, priority: 2 },
      ],
      { algorithm: 'priority-np' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 5, end: 7 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1.67, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(4.00, 1);
  });

  // § Simular — Prioridad (no expropiativa): fixture 2
  it('fixture 2: P1[0–3], P2[3–5], P3[5–9]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 3, priority: 3 },
        { id: 'P2', arrival_time: 1, burst_time: 2, priority: 1 },
        { id: 'P3', arrival_time: 2, burst_time: 4, priority: 2 },
      ],
      { algorithm: 'priority-np' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 3 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 3, end: 5 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 5, end: 9 });
  });

  // § Simular — Prioridad (no expropiativa): fixture 4 P3[0–2], P2[2–5], P1[5–9]
  it('fixture 4: P3[0–2], P2[2–5], P1[5–9]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4, priority: 4 },
        { id: 'P2', arrival_time: 0, burst_time: 3, priority: 2 },
        { id: 'P3', arrival_time: 0, burst_time: 2, priority: 1 },
      ],
      { algorithm: 'priority-np' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P3', start: 0, end: 2 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 2, end: 5 });
    expect(gantt[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 1);
  });

  it('proceso sin priority no lanza error en simulación', () => {
    expect(() =>
      run(
        [{ id: 'P1', arrival_time: 0, burst_time: 2 }],
        { algorithm: 'priority-np' }
      )
    ).not.toThrow();
  });
});
