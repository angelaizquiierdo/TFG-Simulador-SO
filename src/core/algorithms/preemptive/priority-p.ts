// T-22 · Prioridad expropiativa — menor número = mayor prioridad
import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class PriorityP implements IAlgorithm {
  readonly name = 'priority-p';
  readonly preemptionMode = 'on-better' as const;
  readonly requires = { priority: true };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('PriorityP.select: cola vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p !== undefined && (p.priority ?? Infinity) < (best.priority ?? Infinity)) {
        best = p;
      }
    }
    return best;
  }
}
