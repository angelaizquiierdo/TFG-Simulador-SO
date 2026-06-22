import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { VirtualRoundRobin } from '../../../../src/core/algorithms/preemptive/virtual-round-robin.js';

describe('VirtualRoundRobin', () => {
  it('proceso con E/S regresa a cola auxiliar con sobrante', () => {
    // P1(0, burst=4, io=[{io_entry:2, io_time:3}]), P2(0, burst=4), quantum=4
    // P1 usa 2 ticks (io_entry=2), io, sobrante=2 → auxQ
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 4, io: [{ io_entry: 2, io_time: 3 }] },
      { id: 'P2', arrival_time: 0, burst_time: 4 },
    ], { algorithm: new VirtualRoundRobin(4) });
    // P1 primero (menor id). Runs ticks 0,1. io-start.
    expect(r.history[0]?.onCPU).toBe('P1');
    expect(r.history[1]?.onCPU).toBe('P1');
    // P2 runs from tick 2
    expect(r.history[2]?.onCPU).toBe('P2');
    // P1 returns from IO at tick 5 (io started at end of tick 1, io_time=3 → returns at tick 5)
    expect(r.history[5]?.onCPU).toBe('P1');
    // At tick 5 P1 preempts P2 from auxQueue; dispatch message should mention cola auxiliar
    const msgs = r.history.map(h => h.message);
    expect(msgs.some(m => /cola auxiliar/i.test(m))).toBe(true);
  });

  it('io-return expropia al proceso en CPU', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 5, io: [{ io_entry: 2, io_time: 3 }] },
      { id: 'P2', arrival_time: 0, burst_time: 3 },
    ], { algorithm: new VirtualRoundRobin(4) });
    // P1 at ticks 0,1. P2 at ticks 2,3,4. P1 io-return at tick 5 → preempts P2.
    expect(r.history[2]?.onCPU).toBe('P2');
    expect(r.history[5]?.onCPU).toBe('P1');
    const p1m = r.metrics.find(x => x.id === 'P1');
    const p2m = r.metrics.find(x => x.id === 'P2');
    expect(p1m?.completion).toBeGreaterThan(0);
    expect(p2m?.completion).toBeGreaterThan(0);
  });

  it('Simular VRR fixture principal: P1[0-2],P2[2-3],P3[3-5],P1[5-7]', () => {
    // P1(0,6,io:[{2,3}]), P2(0,4,io:[{1,4}]), P3(0,3), quantum=4
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 3 }] },
      { id: 'P2', arrival_time: 0, burst_time: 4, io: [{ io_entry: 1, io_time: 4 }] },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ], { algorithm: new VirtualRoundRobin(4) });
    // Primeros intervalos conocidos
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 3 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P3', start: 3, end: 5 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P1', start: 5, end: 7 });
    // P3 se termina en algún tick ≤ 10
    const p3 = r.metrics.find(x => x.id === 'P3');
    expect(p3?.completion).toBeLessThanOrEqual(10);
    // Todos completan
    expect(r.metrics).toHaveLength(3);
  });

  it('proceso que agota quantum va a cola principal', () => {
    // P1(0, burst=4), P2(0, burst=4), quantum=2
    // P1 agota quantum → mainQueue, no auxQueue
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 4 },
    ], { algorithm: new VirtualRoundRobin(2) });
    // Debe alternar: P1[0-2], P2[2-4], P1[4-6], P2[6-8]
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 2, end: 4 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P1', start: 4, end: 6 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
  });

  it('determinismo: dos ejecuciones producen el mismo resultado', () => {
    const procs = [
      { id: 'P1', arrival_time: 0, burst_time: 6, io: [{ io_entry: 2, io_time: 3 }] },
      { id: 'P2', arrival_time: 0, burst_time: 4, io: [{ io_entry: 1, io_time: 4 }] },
      { id: 'P3', arrival_time: 0, burst_time: 3 },
    ];
    const r1 = run(procs, { algorithm: new VirtualRoundRobin(4) });
    const r2 = run(procs, { algorithm: new VirtualRoundRobin(4) });
    expect(r1.intervals).toEqual(r2.intervals);
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new VirtualRoundRobin(4).select([])).toThrow();
  });
});
