import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class SRTF implements IAlgorithm {
  readonly name = 'srtf';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const first = ready[0];
    if (first === undefined) throw new Error('La cola de listos está vacía');
    let best = first;
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  }
}
