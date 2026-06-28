import type { IAlgorithm, ReadyProcess, SchedulerEvent } from '../../../core/types/algorithm.js';
import { FifoQueue } from '../shared/fifo-queue.js';

/**
 * MLFQ — Multilevel Feedback Queue.
 *
 * 3 niveles fijos:
 *   - Nivel 0: RR con quanta[0]
 *   - Nivel 1: RR con quanta[1]
 *   - Nivel 2: FCFS (sin quantum)
 *
 * Reglas:
 *   1. Llegada nueva → levels[0].
 *   2. select: cabeza del nivel no vacío de menor índice.
 *   3. quantumFor: quanta[nivel] para 0 y 1; null para 2.
 *   4. Agota quantum → degrada (0→1, 1→2, 2 se mantiene).
 *   5. Expropiado → vuelve a cabeza de su nivel (sin degradar).
 *   6. Llegada a nivel 0 expropia proceso en nivel inferior.
 *   7. Priority boost (si boostInterval): todos al nivel 0, orden por id.
 */
export class MLFQ implements IAlgorithm {
  readonly name: string;
  readonly preemptionMode = 'on-quantum-and-better' as const;
  readonly requires = { io: false } as const;

  private readonly quanta: [number, number];

  private level0 = new FifoQueue<string>();
  private level1 = new FifoQueue<string>();
  private level2 = new FifoQueue<string>();
  private processLevel = new Map<string, number>();
  // PID del proceso actualmente en CPU (para priority-boost)
  private currentCpuPid: string | null = null;

  constructor(quanta: [number, number] = [2, 4], name = 'mlfq') {
    this.quanta = quanta;
    this.name = name;
  }

  select(ready: readonly ReadyProcess[]): ReadyProcess {
    if (ready.length === 0) throw new Error('Cola de listos vacía');

    // Buscar en nivel 0, luego 1, luego 2
    for (const id of this.level0.toArray()) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }
    for (const id of this.level1.toArray()) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }
    for (const id of this.level2.toArray()) {
      const found = ready.find((p) => p.id === id);
      if (found !== undefined) return found;
    }

    // Fallback: la lista ready ya está ordenada por el motor (arrival_time, luego id)
    const first = ready[0];
    if (first === undefined) throw new Error('Cola de listos vacía');
    return first;
  }

  quantumFor(p: ReadyProcess): number | null {
    const level = this.processLevel.get(p.id) ?? 0;
    if (level === 0) return this.quanta[0];
    if (level === 1) return this.quanta[1];
    return null; // nivel 2: FCFS, sin expiración de quantum
  }

  onEvent(e: SchedulerEvent): string | { text: string } | null {
    switch (e.type) {
      case 'arrival': {
        this.processLevel.set(e.id, 0);
        this.level0.enqueue(e.id);
        return null;
      }

      case 'dispatch': {
        const level = this.processLevel.get(e.id) ?? 0;
        this._removeFromLevel(e.id, level);
        this.currentCpuPid = e.id;
        return null;
      }

      case 'quantum-expiry': {
        const currentLevel = this.processLevel.get(e.id) ?? 0;
        // Eliminar del nivel actual (puede estar ahí si hubo un priority-boost sin dispatch)
        this._removeFromLevel(e.id, currentLevel);
        const newLevel = Math.min(currentLevel + 1, 2);
        this.processLevel.set(e.id, newLevel);
        this._enqueueAtLevel(e.id, newLevel);
        this.currentCpuPid = null;
        return { text: `se degrada al nivel ${String(newLevel)}` };
      }

      case 'preempted': {
        // Vuelve a la cabeza de su nivel sin degradarse
        const level = this.processLevel.get(e.id) ?? 0;
        this._prependToLevel(e.id, level);
        this.currentCpuPid = null;
        return null;
      }

      case 'priority-boost': {
        // Recopilar todos los pids (en colas + actual en CPU)
        const allPids = new Set<string>();
        for (const id of this.level0.toArray()) allPids.add(id);
        for (const id of this.level1.toArray()) allPids.add(id);
        for (const id of this.level2.toArray()) allPids.add(id);
        if (this.currentCpuPid !== null) allPids.add(this.currentCpuPid);

        // Reiniciar niveles
        this.level0 = new FifoQueue<string>();
        this.level1 = new FifoQueue<string>();
        this.level2 = new FifoQueue<string>();

        // Ordenar por id natural y encolar todos en nivel 0
        const sorted = [...allPids].sort((a, b) =>
          a.localeCompare(b, undefined, { numeric: true, sensitivity: 'base' }),
        );
        for (const id of sorted) {
          this.processLevel.set(id, 0);
          this.level0.enqueue(id);
        }
        // El proceso en CPU también está en level0; el motor reevalúa
        this.currentCpuPid = null;
        return { text: 'priority boost: todos los procesos suben al nivel 0' };
      }

      case 'completed': {
        const level = this.processLevel.get(e.id) ?? 0;
        this._removeFromLevel(e.id, level);
        this.processLevel.delete(e.id);
        this.currentCpuPid = null;
        return null;
      }

      default:
        return null;
    }
  }

  private _getQueue(level: number): FifoQueue<string> {
    if (level === 0) return this.level0;
    if (level === 1) return this.level1;
    return this.level2;
  }

  private _setQueue(level: number, q: FifoQueue<string>): void {
    if (level === 0) this.level0 = q;
    else if (level === 1) this.level1 = q;
    else this.level2 = q;
  }

  private _removeFromLevel(id: string, level: number): void {
    const q = this._getQueue(level);
    const arr = q.toArray().filter((x) => x !== id);
    const newQ = new FifoQueue<string>();
    for (const x of arr) newQ.enqueue(x);
    this._setQueue(level, newQ);
  }

  private _enqueueAtLevel(id: string, level: number): void {
    this._getQueue(level).enqueue(id);
  }

  private _prependToLevel(id: string, level: number): void {
    const q = this._getQueue(level);
    const existing = q.toArray().filter((x) => x !== id);
    const newQ = new FifoQueue<string>();
    newQ.enqueue(id);
    for (const x of existing) newQ.enqueue(x);
    this._setQueue(level, newQ);
  }
}
