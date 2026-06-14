// Representa un proceso tal como lo proporciona el usuario
export interface Process {
  readonly id: string;
  readonly arrival_time: number;  // >= 0
  readonly burst_time: number;    // > 0
  readonly priority?: number;
}
