interface ReadyProcess {
  readonly id: string;
  readonly arrival_time: number;
  readonly burst_time: number;
  readonly remaining: number;
  readonly priority?: number;
}

type PreemptionMode =
  | 'none'
  | 'on-better'
  | 'on-quantum'
  | 'io-return'
  | 'on-quantum-and-better';

type SchedulerEvent =
  | { readonly type: 'arrival'; readonly id: string; readonly tick: number }
  | { readonly type: 'dispatch'; readonly id: string; readonly tick: number }
  | { readonly type: 'quantum-expiry'; readonly id: string; readonly tick: number }
  | { readonly type: 'preempted'; readonly id: string; readonly tick: number }
  | { readonly type: 'io-start'; readonly id: string; readonly tick: number }
  | { readonly type: 'io-return'; readonly id: string; readonly tick: number }
  | { readonly type: 'completed'; readonly id: string; readonly tick: number }
  | { readonly type: 'priority-boost'; readonly tick: number };

type AlgorithmParams = Readonly<Record<string, unknown>>;

interface IAlgorithm {
  readonly name: string;
  readonly preemptionMode: PreemptionMode;
  readonly requires: { priority?: boolean; quantum?: boolean; io?: boolean; levels?: boolean };
  select(ready: readonly ReadyProcess[]): ReadyProcess;
  quantumFor?(p: ReadyProcess): number | null;
  onEvent?(e: SchedulerEvent): string | { text: string } | null;
  // Snapshot opcional pid → nivel/cola para anotar las celdas del Gantt.
  // El motor lo registra tal cual; algoritmos sin niveles no lo implementan.
  levelSnapshot?(): Readonly<Record<string, number>>;
}

export type { ReadyProcess, PreemptionMode, SchedulerEvent, AlgorithmParams, IAlgorithm };
