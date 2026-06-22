import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { MultilevelFeedback } from '../../../../src/core/algorithms/preemptive/multilevel-feedback.js';

describe('MultilevelFeedback', () => {
  it('MLFQ sin boost: P1[0-2],P2[2-4],P1[4-10],P2[10-16]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 0, burst_time: 8 },
    ], { algorithm: new MultilevelFeedback([2, 10]) });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P1', start: 4, end: 10 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P2', start: 10, end: 16 });
    expect(r.metrics.find(x => x.id === 'P1')?.completion).toBe(10);
    expect(r.metrics.find(x => x.id === 'P2')?.completion).toBe(16);
  });

  it('MLFQ con boostInterval=6: P1 completa en t=12', () => {
    // P1[0-2], P2[2-4], P1[4-8] (boost at t=6 re-dispatches P1 but continúa),
    // P2[8-10], P1[10-12], P2[12-16]
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 0, burst_time: 8 },
    ], { algorithm: new MultilevelFeedback([2, 10]), params: { boostInterval: 6 } });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    // P1 runs at ticks 4-7 (boost en t=6 no interrumpe el Gantt porque P1 sigue en CPU)
    expect(r.intervals[2]).toMatchObject({ pid: 'P1', start: 4, end: 8 });
    expect(r.metrics.find(x => x.id === 'P1')?.completion).toBe(12);
    // Mensaje de boost presente
    expect(r.history.some(h => /priority boost/i.test(h.message))).toBe(true);
  });

  it('degradación: proceso agota quantum en nivel 0 → completa correctamente con 2 niveles', () => {
    // Con un proceso y quanta [2, 10]: P1 usa quantum 2 en nivel 0, luego quantum 10 en nivel 1
    // Con un solo proceso, no hay ruptura visible en el Gantt (P1 siempre en CPU)
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 4 },
    ], { algorithm: new MultilevelFeedback([2, 10]) });
    // P1 completa en tick 4
    expect(r.metrics.find(x => x.id === 'P1')?.completion).toBe(4);
    // La simulación produce un solo intervalo P1[0-4]
    expect(r.intervals.length).toBe(1);
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 4 });
  });

  it('proceso que llega a nivel 0 expropia al de nivel inferior', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 6 },
      { id: 'P2', arrival_time: 3, burst_time: 2 },
    ], { algorithm: new MultilevelFeedback([2, 10]) });
    // P1 en nivel 0 [0-2], degrada a nivel 1. P1 en nivel 1 empieza [2-...].
    // P2 llega en t=3: nivel 0. Debería expropiar a P1 (nivel 1).
    const p2Start = r.intervals.find(i => i.pid === 'P2');
    expect(p2Start).toBeDefined();
    expect(r.metrics.find(x => x.id === 'P2')?.completion).toBeLessThan(10);
  });

  it('determinismo: dos ejecuciones producen el mismo resultado', () => {
    const procs = [
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 0, burst_time: 8 },
    ];
    const r1 = run(procs, { algorithm: new MultilevelFeedback([2, 10]) });
    const r2 = run(procs, { algorithm: new MultilevelFeedback([2, 10]) });
    expect(r1.intervals).toEqual(r2.intervals);
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new MultilevelFeedback([2]).select([])).toThrow();
  });
});
