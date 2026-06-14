// T-23 · Round Robin — expropiativo on-quantum, orden FIFO
import type { IAlgorithm, ReadyProcess } from '../../types/algorithm.js';

export class RoundRobin implements IAlgorithm {
  readonly name = 'round-robin';
  readonly preemptionMode = 'on-quantum' as const;
  readonly requires = { quantum: true };

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    // El motor mantiene el orden FIFO de la cola; devolver el primero es suficiente.
    const first = ready[0];
    if (first === undefined) throw new Error('RoundRobin.select: cola vacía');
    return first;
  }
}
