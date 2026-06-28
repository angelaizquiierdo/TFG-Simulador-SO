import type { HistoryEvent, Interval } from '../types/history.js';

// Derivar intervalos del historial
export function deriveIntervals(history: readonly HistoryEvent[]): Interval[] {
  const intervals: Interval[] = [];
  if (history.length === 0) return intervals;

  let current: { pid: string | null; start: number } | null = null;

  for (const event of history) {
    if (current === null) {
      current = { pid: event.onCPU, start: event.tick };
    } else if (event.onCPU !== current.pid) {
      intervals.push({ pid: current.pid, start: current.start, end: event.tick });
      current = { pid: event.onCPU, start: event.tick };
    }
  }

  if (current !== null) {
    const lastEvent = history[history.length - 1];
    if (lastEvent !== undefined) {
      intervals.push({ pid: current.pid, start: current.start, end: lastEvent.tick + 1 });
    }
  }

  return intervals;
}
