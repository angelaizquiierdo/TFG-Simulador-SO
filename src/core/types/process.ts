// Proceso tal como lo introduce el usuario — datos de entrada del simulador
export interface Process {
  id: string;
  arrival_time: number; // >= 0
  burst_time: number;   // > 0
  priority?: number;
}
