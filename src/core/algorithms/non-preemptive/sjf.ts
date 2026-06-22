import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class SJF implements IAlgorithm {
  readonly name = 'sjf';
  readonly preemptionMode = 'none' as const;
  readonly requires = { priority: false, quantum: false, io: false };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('select: cola vacía');
    // Motor entrega ordenado por arrival_time, id (desempate natural).
    // SJF: menor remaining; empate -> ya está resuelto por el motor.
    let best = ready[0];
    if (best === undefined) throw new Error('select: cola vacía');
    for (let i = 1; i < ready.length; i++) {
      const p = ready[i];
      if (p === undefined) continue;
      if (p.remaining < best.remaining) best = p;
    }
    return best;
  }
}
