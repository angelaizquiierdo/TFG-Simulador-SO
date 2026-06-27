import { describe, it, expect, beforeAll } from 'vitest';
import { LJF } from '../../../../src/core/algorithms/non-preemptive/ljf.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

describe('LJF', () => {
  const ljf = new LJF();

  beforeAll(() => { register(ljf); });

  it('tiene los metadatos correctos', () => {
    expect(ljf.name).toBe('ljf');
    expect(ljf.preemptionMode).toBe('none');
    expect(ljf.requires.io).toBe(false);
  });

  it('select lanza error con cola vacía', () => {
    expect(() => ljf.select([])).toThrow();
  });

  it('select elige el proceso con mayor burst_time', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 2, remaining: 2 },
      { id: 'P2', arrival_time: 0, burst_time: 4, remaining: 4 },
      { id: 'P3', arrival_time: 0, burst_time: 3, remaining: 3 },
    ];
    expect(ljf.select(ready).id).toBe('P2');
  });

  // § Simular — LJF: fixture 1 P2[0–4], P3[4–7], P1[7–9]
  it('fixture 1: P2[0–4], P3[4–7], P1[7–9]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 0, burst_time: 4 },
        { id: 'P3', arrival_time: 0, burst_time: 3 },
      ],
      { algorithm: 'ljf' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P2', start: 0, end: 4 });
    expect(gantt[1]).toMatchObject({ pid: 'P3', start: 4, end: 7 });
    expect(gantt[2]).toMatchObject({ pid: 'P1', start: 7, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(3.67, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(6.67, 1);
  });

  // § Simular — LJF: fixture 2 con CPU inactiva
  it('fixture 2: P2[0–3], P1[3–5], Inactivo[5–6], P3[6–9]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 0, burst_time: 3 },
        { id: 'P3', arrival_time: 6, burst_time: 3 },
      ],
      { algorithm: 'ljf' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P2', start: 0, end: 3 });
    expect(gantt[1]).toMatchObject({ pid: 'P1', start: 3, end: 5 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 6, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(1, 0);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(3.67, 1);
  });
});
