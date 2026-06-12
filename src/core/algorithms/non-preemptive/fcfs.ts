import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// Planificación FCFS: devuelve el primer proceso de la lista (FIFO)
export class FCFS implements IAlgorithm {
  readonly name = 'FCFS';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    const p = ready[0];
    if (p === undefined) throw new Error('Lista de listos vacía');
    return p;
  }
}
