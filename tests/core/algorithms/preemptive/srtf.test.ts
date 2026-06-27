import { describe, it, expect, beforeAll } from 'vitest';
import { SRTF } from '../../../../src/core/algorithms/preemptive/srtf.js';
import { register } from '../../../../src/core/registry.js';
import { run } from '../../../../src/core/simulate.js';

describe('SRTF', () => {
  const algo = new SRTF();

  beforeAll(() => { register(algo); });

  it('tiene los metadatos correctos', () => {
    expect(algo.name).toBe('srtf');
    expect(algo.preemptionMode).toBe('on-better');
    expect(algo.requires.io).toBe(false);
  });

  it('select lanza error con cola vacía', () => {
    expect(() => algo.select([])).toThrow();
  });

  // § Simular — SRTF: fixture 1 P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15]
  it('fixture 1: P1[0–1], P2[1–2], P3[2–4], P4[4–5], P2[5–8], P1[8–15]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 8 },
        { id: 'P2', arrival_time: 1, burst_time: 4 },
        { id: 'P3', arrival_time: 2, burst_time: 2 },
        { id: 'P4', arrival_time: 4, burst_time: 1 },
      ],
      { algorithm: 'srtf' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(gantt[3]).toMatchObject({ pid: 'P4', start: 4, end: 5 });
    expect(gantt[4]).toMatchObject({ pid: 'P2', start: 5, end: 8 });
    expect(gantt[5]).toMatchObject({ pid: 'P1', start: 8, end: 15 });
    const p3 = result.metrics.perProcess.find(m => m.id === 'P3');
    const p4 = result.metrics.perProcess.find(m => m.id === 'P4');
    const p2 = result.metrics.perProcess.find(m => m.id === 'P2');
    const p1 = result.metrics.perProcess.find(m => m.id === 'P1');
    expect(p3?.completion).toBe(4);
    expect(p4?.completion).toBe(5);
    expect(p2?.completion).toBe(8);
    expect(p1?.completion).toBe(15);
  });

  // § Simular — SRTF: fixture 2 con CPU inactiva
  it('fixture 2: P1[0–2], Inactivo[2–4], P2[4–5], P3[5–6], P2[6–8]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 2 },
        { id: 'P2', arrival_time: 4, burst_time: 3 },
        { id: 'P3', arrival_time: 5, burst_time: 1 },
      ],
      { algorithm: 'srtf' }
    );
    const gantt = result.intervals.filter(i => i.pid !== null);
    expect(gantt[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(gantt[1]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(gantt[2]).toMatchObject({ pid: 'P3', start: 5, end: 6 });
    expect(gantt[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
  });
});
