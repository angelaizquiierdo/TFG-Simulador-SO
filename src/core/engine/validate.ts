import type { Process } from '../types/process.js';

// Valida los procesos antes de iniciar la simulación (T-23)
export function validateProcesses(processes: readonly Process[]): void {
  for (const p of processes) {
    if (p.arrival_time < 0) {
      throw new Error(`Proceso "${p.id}": arrival_time debe ser >= 0`);
    }
    if (p.burst_time <= 0) {
      throw new Error(`Proceso "${p.id}": burst_time debe ser > 0`);
    }
    if (p.io !== undefined && p.io.length > 0) {
      let prevEntry = 0;
      for (const op of p.io) {
        if (op.io_entry <= 0) {
          throw new Error(`Proceso "${p.id}": io_entry debe ser > 0`);
        }
        if (op.io_entry >= p.burst_time) {
          throw new Error(`Proceso "${p.id}": io_entry debe ser < burst_time`);
        }
        if (op.io_time <= 0) {
          throw new Error(`Proceso "${p.id}": io_time debe ser > 0`);
        }
        if (op.io_entry <= prevEntry) {
          throw new Error(`Proceso "${p.id}": io_entry debe ser estrictamente creciente`);
        }
        prevEntry = op.io_entry;
      }
    }
  }
}
