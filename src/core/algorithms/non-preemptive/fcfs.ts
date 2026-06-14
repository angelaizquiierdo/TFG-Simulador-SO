import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

// First-Come, First-Served: selecciona el primer proceso de la cola (FIFO)
export class FCFS implements IAlgorithm {
  readonly name = 'fcfs';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) {
      throw new Error('select() llamado con la cola de listos vacía');
    }
    // El motor ya pre-ordena por desempate (arrival_time, id natural).
    // FCFS elige el primer elemento: el que llegó antes.
    const first = ready[0];
    if (first === undefined) throw new Error('select() llamado con la cola de listos vacía');
    return first;
  }
}
