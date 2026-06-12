import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Planificación SRTF: menor remaining (expropiativo)
export class SRTF implements IAlgorithm {
  readonly name = 'SRTF';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Lista de listos vacía');
    for (const p of ready) {
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  }
}
