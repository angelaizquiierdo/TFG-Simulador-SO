import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Longest-Job-First no expropiativo: selecciona el proceso con mayor burst_time
export class LJF implements IAlgorithm {
  readonly name = 'ljf';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const initial = ready[0];
    if (initial === undefined) {
      throw new Error('select() llamado con la cola de listos vacía');
    }
    let best = initial;
    for (const p of ready) {
      if (p.burst_time > best.burst_time) {
        best = p;
      }
    }
    return best;
  }
}
