import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class PriorityNP implements IAlgorithm {
  readonly name = 'priority-np';
  readonly preemptionMode = 'none' as const;
  readonly requires = { priority: false, quantum: false, io: false };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('select: cola vacía');
    let best = ready[0];
    if (best === undefined) throw new Error('select: cola vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      const pPrio = p.priority ?? Infinity;
      const bestPrio = best.priority ?? Infinity;
      if (pPrio < bestPrio) {
        best = p;
      } else if (pPrio === bestPrio) {
        if (
          p.arrival_time < best.arrival_time ||
          (p.arrival_time === best.arrival_time &&
            p.id.localeCompare(best.id, undefined, { numeric: true, sensitivity: 'base' }) < 0)
        ) {
          best = p;
        }
      }
    }
    return best;
  }
}
