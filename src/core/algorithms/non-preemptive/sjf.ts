// T-18 · SJF (Shortest Job First) — no expropiativo
import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class SJF implements IAlgorithm {
  readonly name = 'sjf';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('SJF.select: cola vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p !== undefined && p.remaining < best.remaining) {
        best = p;
      }
    }
    return best;
  }
}
