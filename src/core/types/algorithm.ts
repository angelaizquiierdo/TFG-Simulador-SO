// Vista de solo lectura de un proceso en la cola de listos
export interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}

// Modos de apropiación del algoritmo
export type PreemptionMode = 'none' | 'on-better' | 'on-quantum';

// Contrato que deben cumplir todos los algoritmos de planificación
export interface IAlgorithm {
  readonly name: string;
  readonly preemptionMode: PreemptionMode;
  readonly requires: { priority?: boolean; quantum?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
}
