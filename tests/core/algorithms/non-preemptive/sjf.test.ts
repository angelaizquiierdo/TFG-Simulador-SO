import { describe, it, expect, beforeAll } from 'vitest';
import { SJF } from '../../../../src/core/algorithms/non-preemptive/sjf.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

describe('SJF', () => {
  const sjf = new SJF();

  beforeAll(() => { register(() => sjf); });

  it('tiene los metadatos correctos', () => {
    expect(sjf.name).toBe('sjf');
    expect(sjf.triggers.size).toBe(0);
  });

  it('select lanza error con cola vacía', () => {
    expect(() => sjf.select([])).toThrow();
  });

  it('select elige el proceso con menor remaining', () => {
    const ready = [
      { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 5 },
      { id: 'P2', arrival_time: 1, burst_time: 2, remaining: 2 },
      { id: 'P3', arrival_time: 2, burst_time: 4, remaining: 4 },
    ];
    expect(sjf.select(ready).id).toBe('P2');
  });

  // § Simular — SJF: fixture 1 P1[0–5], P4[5–6], P2[6–8], P3[8–12]
  it('fixture 1: P1[0–5], P4[5–6], P2[6–8], P3[8–12]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 5 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
        { id: 'P3', arrival_time: 2, burst_time: 4 },
        { id: 'P4', arrival_time: 3, burst_time: 1 },
      ],
      { algorithm: 'sjf' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 5 });
    expect(gantt[1]).toMatchObject({ pid: 'P4', start: 5, end: 6 });
    expect(gantt[2]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
    expect(gantt[3]).toMatchObject({ pid: 'P3', start: 8, end: 12 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(3.25, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(6.25, 1);
  });

  // § Simular — SJF: fixture 2 con CPU inactiva
  it('fixture 2: con CPU inactiva', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 5, burst_time: 2 },
        { id: 'P3', arrival_time: 6, burst_time: 3 },
        { id: 'P4', arrival_time: 12, burst_time: 1 },
      ],
      { algorithm: 'sjf' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 5, end: 7 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 7, end: 10 });
    expect(gantt[3]).toMatchObject({ pid: 'P4', start: 12, end: 13 });
  });

  // § Simular — SJF: fixture 3 desempate
  it('fixture 3: P2[0–2], P3[2–5], P1[5–9]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 4 },
        { id: 'P2', arrival_time: 0, burst_time: 2 },
        { id: 'P3', arrival_time: 0, burst_time: 3 },
      ],
      { algorithm: 'sjf' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P2', start: 0, end: 2 });
    expect(gantt[1]).toMatchObject({ pid: 'P3', start: 2, end: 5 });
    expect(gantt[2]).toMatchObject({ pid: 'P1', start: 5, end: 9 });
    expect(result.metrics.aggregate.avgWaiting).toBeCloseTo(2.33, 1);
    expect(result.metrics.aggregate.avgTurnaround).toBeCloseTo(5.33, 1);
  });

  // § Cobertura de ramas defensivas (Tipado estricto)
describe('Cobertura defensiva', () => {
  it('lanza error si el primer elemento del array es undefined (hueco)', () => {
    const algo = new SJF(); // Cambiar por LJF, SRTF, etc. en su respectivo archivo
    expect(() => algo.select([undefined as unknown as import('../../../../src/core/types/algorithm.js').ReadyProcess])).toThrow('Cola de listos vacía');
  });

  it('ignora elementos undefined en el resto del array sin fallar', () => {
    const algo = new SJF(); // Cambiar por LJF, SRTF, etc.
    const p1 = { id: 'P1', arrival_time: 0, burst_time: 5, remaining: 5, priority: 1 };
    const p2 = { id: 'P2', arrival_time: 0, burst_time: 1, remaining: 1, priority: 1 };

    // Inyectamos un undefined en medio para forzar la rama `if (p === undefined) continue;`
    const selected = algo.select([p1, undefined as unknown as import('../../../../src/core/types/algorithm.js').ReadyProcess, p2]);
    expect(selected.id).toBe('P2');
  });
});
});

