import type { Process } from '../types/process.js';
import type { HistoryEvent } from '../types/history.js';
import type { ProcessMetrics, AggregateMetrics } from '../types/simulation-result.js';

// Derivar métricas del historial
export function deriveMetrics(
  history: readonly HistoryEvent[],
  processes: readonly Process[],
): { perProcess: ProcessMetrics[]; aggregate: AggregateMetrics } {
  const perProcess: ProcessMetrics[] = [];

  for (const p of processes) {
    // Tick de finalización: último tick donde estuvo en CPU + 1 (T-19)
    // Este método es robusto para el último proceso (que no aparece en history.completed).
    let lastCPUTick = -1;
    let firstCPUTick = -1;
    let cpuTotal = 0;
    let ioTotal = 0;
    for (const event of history) {
      if (event.onCPU === p.id) {
        if (firstCPUTick === -1) firstCPUTick = event.tick;
        lastCPUTick = event.tick;
        cpuTotal++;
      }
      // bloqueado_total = tiempo en servicio de E/S + tiempo en cola del dispositivo (T-19)
      if (event.inIO === p.id || event.waitingIO.includes(p.id)) ioTotal++;
    }
    const completion = lastCPUTick >= 0 ? lastCPUTick + 1 : 0;
    const response = firstCPUTick >= 0 ? firstCPUTick - p.arrival_time : 0;

    const turnaround = completion - p.arrival_time;
    const waiting = turnaround - cpuTotal - ioTotal;

    perProcess.push({ id: p.id, completion, turnaround, waiting, response });
  }

  const n = perProcess.length;
  const avgWaiting = n > 0 ? perProcess.reduce((s, m) => s + m.waiting, 0) / n : 0;
  const avgTurnaround = n > 0 ? perProcess.reduce((s, m) => s + m.turnaround, 0) / n : 0;

  const totalTicks = history.length;
  const cpuActiveTicks = history.filter((e) => e.onCPU !== null).length;
  const cpuUtilization = totalTicks > 0 ? cpuActiveTicks / totalTicks : 0;
  const throughput = totalTicks > 0 ? processes.length / totalTicks : 0;

  return {
    perProcess,
    aggregate: { avgWaiting, avgTurnaround, cpuUtilization, throughput },
  };
}
