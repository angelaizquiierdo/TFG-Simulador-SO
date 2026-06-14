// T-21 · SRTF (Shortest Remaining Time First) — expropiativo on-better
import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class SRTF implements IAlgorithm {
  readonly name = 'srtf';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('SRTF.select: cola vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p !== undefined && p.remaining < best.remaining) {
        best = p;
      }
    }
    return best;
  }
}
