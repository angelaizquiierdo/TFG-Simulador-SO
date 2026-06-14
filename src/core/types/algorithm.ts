// T-02 (ReadyProcess) + T-03 (PreemptionMode, IAlgorithm)

/** Vista de solo lectura de un proceso en la cola de listos. */
export interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}

/**
 * Momento en que el motor puede expropiar la CPU:
 * - 'none'       → nunca (no expropiativo)
 * - 'on-better'  → cada tick si llega un proceso "mejor"
 * - 'on-quantum' → al agotar el quantum (Round Robin)
 */
export type PreemptionMode = 'none' | 'on-better' | 'on-quantum';

/** Contrato que debe implementar todo algoritmo de planificación. */
export interface IAlgorithm {
  readonly name: string;
  readonly preemptionMode: PreemptionMode;
  readonly requires: {
    readonly priority?: boolean;
    readonly quantum?: boolean;
  };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
}
