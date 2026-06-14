import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Round Robin: selecciona el primer proceso de la cola FIFO (el motor gestiona el quantum)
export class RoundRobin implements IAlgorithm {
  readonly name = 'round-robin';
  readonly preemptionMode = 'on-quantum' as const;
  readonly requires = { quantum: true };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) {
      throw new Error('select() llamado con la cola de listos vacía');
    }
    const first = ready[0];
    if (first === undefined) throw new Error('select() llamado con la cola de listos vacía');
    return first;
  }
}
