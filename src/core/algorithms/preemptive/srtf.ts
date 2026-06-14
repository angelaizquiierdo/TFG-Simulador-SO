import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Shortest-Remaining-Time-First expropiativo: selecciona el proceso con menor remaining
export class SRTF implements IAlgorithm {
  readonly name = 'srtf';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const initial = ready[0];
    if (initial === undefined) {
      throw new Error('select() llamado con la cola de listos vacía');
    }
    let best = initial;
    for (const p of ready) {
      if (p.remaining < best.remaining) {
        best = p;
      }
    }
    return best;
  }
}
