// T-17 · FCFS (First-Come, First-Served) — no expropiativo
import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class FCFS implements IAlgorithm {
  readonly name = 'fcfs';
  readonly preemptionMode = 'none' as const;
  readonly requires = {};

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    // El motor garantiza que ready no está vacío cuando se llama a select().
    // El desempate ya lo aplica el motor antes de llamar a select(); devolver el primero es suficiente.
    const first = ready[0];
    if (first === undefined) throw new Error('FCFS.select: cola vacía');
    return first;
  }
}
