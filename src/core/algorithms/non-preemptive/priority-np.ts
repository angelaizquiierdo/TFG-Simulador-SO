import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Planificación por prioridad no expropiativa: menor número de prioridad = mayor prioridad
export class PriorityNP implements IAlgorithm {
  readonly name = 'Priority-NP';
  readonly preemptionMode = 'none' as const;
  readonly requires = { priority: true as const };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    let best = ready[0];
    if (best === undefined) throw new Error('Lista de listos vacía');
    for (const p of ready) {
      const pPrio = p.priority ?? Infinity;
      const bestPrio = best.priority ?? Infinity;
      if (pPrio < bestPrio) best = p;
    }
    return best;
  }
}
