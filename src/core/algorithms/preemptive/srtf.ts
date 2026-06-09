import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class SRTF implements IAlgorithm {
  readonly name = 'srtf';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Sin procesos en cola');
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  }
}
