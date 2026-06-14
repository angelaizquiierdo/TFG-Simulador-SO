// T-19 · LJF (Longest Job First) — no expropiativo
import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class LJF implements IAlgorithm {
  readonly name = 'ljf';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('LJF.select: cola vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p !== undefined && p.burst_time > best.burst_time) {
        best = p;
      }
    }
    return best;
  }
}
