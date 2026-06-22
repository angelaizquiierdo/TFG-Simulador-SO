import { describe, it, expect } from 'vitest';
import { run } from '../../../../src/core/simulate.js';
import { SRTF } from '../../../../src/core/algorithms/preemptive/srtf.js';

const algo = new SRTF();

describe('SRTF', () => {
  it('Simular SRTF: P1[0-1], P2[1-2], P3[2-4], P4[4-5], P2[5-8], P1[8-15]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 8 },
      { id: 'P2', arrival_time: 1, burst_time: 4 },
      { id: 'P3', arrival_time: 2, burst_time: 2 },
      { id: 'P4', arrival_time: 4, burst_time: 1 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 1 });
    expect(r.intervals[1]).toMatchObject({ pid: 'P2', start: 1, end: 2 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P3', start: 2, end: 4 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P4', start: 4, end: 5 });
    expect(r.intervals[4]).toMatchObject({ pid: 'P2', start: 5, end: 8 });
    expect(r.intervals[5]).toMatchObject({ pid: 'P1', start: 8, end: 15 });
  });

  it('SRTF con CPU inactiva: P1[0-2], inactivo[2-4], P2[4-5], P3[5-6], P2[6-8]', () => {
    const r = run([
      { id: 'P1', arrival_time: 0, burst_time: 2 },
      { id: 'P2', arrival_time: 4, burst_time: 3 },
      { id: 'P3', arrival_time: 5, burst_time: 1 },
    ], { algorithm: algo });
    expect(r.intervals[0]).toMatchObject({ pid: 'P1', start: 0, end: 2 });
    expect(r.intervals[1]).toMatchObject({ pid: null, start: 2, end: 4 });
    expect(r.intervals[2]).toMatchObject({ pid: 'P2', start: 4, end: 5 });
    expect(r.intervals[3]).toMatchObject({ pid: 'P3', start: 5, end: 6 });
    expect(r.intervals[4]).toMatchObject({ pid: 'P2', start: 6, end: 8 });
  });

  it('select en cola vacía lanza error', () => {
    expect(() => new SRTF().select([])).toThrow();
  });
});
