import { describe, it, expect } from 'vitest';
import { run } from '../../src/core/simulate.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

// Stub SRTF: elige el proceso con menor remaining
const srtfStub: IAlgorithm = {
  name: 'srtf-stub-t10',
  preemptionMode: 'on-better',
  requires: {},
  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Sin procesos');
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  },
};

describe('T-10: Modo on-better (expropiativo) — SRTF', () => {
  it('P1(0,5), P2(1,2) → P1[0–1], P2[1–3], P1[3–7]', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 5 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
      ],
      srtfStub,
    );
    expect(result.intervals).toContainEqual({ pid: 'P1', start: 0, end: 1 });
    expect(result.intervals).toContainEqual({ pid: 'P2', start: 1, end: 3 });
    expect(result.intervals).toContainEqual({ pid: 'P1', start: 3, end: 7 });
    expect(result.intervals).toHaveLength(3);
  });

  it('P2 finaliza en tick 3 y P1 en tick 7', () => {
    const result = run(
      [
        { id: 'P1', arrival_time: 0, burst_time: 5 },
        { id: 'P2', arrival_time: 1, burst_time: 2 },
      ],
      srtfStub,
    );
    // El history[2] (tick 2) debería tener P2 en CPU, tick 3 P2 completa
    expect(result.history[2]?.onCPU).toBe('P2');
    // Después del tick 2, P2 completa → tick 3 P1 vuelve a CPU
    expect(result.history[3]?.onCPU).toBe('P1');
  });
});
