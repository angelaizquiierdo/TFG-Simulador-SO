// Proceso de entrada tal como lo proporciona el usuario
export interface Process {
  readonly id: string;
  readonly arrival_time: number;  // entero >= 0
  readonly burst_time: number;    // entero > 0
  readonly priority?: number;     // opcional; menor número = mayor prioridad
}
