import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Planificación Round Robin: FIFO (el motor gestiona el quantum y el reencola)
export class RoundRobin implements IAlgorithm {
  readonly name = 'Round-Robin';
  readonly preemptionMode = 'on-quantum' as const;
  readonly requires = { quantum: true as const };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const p = ready[0];
    if (p === undefined) throw new Error('Lista de listos vacía');
    return p;
  }
}
