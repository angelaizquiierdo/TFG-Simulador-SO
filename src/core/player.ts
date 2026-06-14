// T-16 — Cursor sobre el History
// Puro: sin requestAnimationFrame, setTimeout ni deltaTime.

import type { History, HistoryEvent } from './types/history.js';

export class Player {
  private readonly _history: History;
  private _tick: number;

  constructor(history: History) {
    this._history = history;
    this._tick = 0;
  }

  /** Tick actualmente apuntado (0-based). */
  get tick(): number {
    return this._tick;
  }

  /** Devuelve el HistoryEvent del tick actual, o undefined si el historial está vacío. */
  get current(): HistoryEvent | undefined {
    return this._history[this._tick];
  }

  /** true si el cursor está en el tick 0. */
  get atStart(): boolean {
    return this._tick === 0;
  }

  /** true si el cursor está en el último tick. */
  get atEnd(): boolean {
    if (this._history.length === 0) return true;
    return this._tick === this._history.length - 1;
  }

  /** Avanza un tick. No supera el último. */
  stepForward(): void {
    if (this._history.length === 0) return;
    if (this._tick < this._history.length - 1) {
      this._tick++;
    }
  }

  /** Retrocede un tick. No baja de 0. */
  stepBackward(): void {
    if (this._tick > 0) {
      this._tick--;
    }
  }

  /**
   * Salta directamente al tick N sin recalcular.
   * Se clampa al rango [0, history.length - 1].
   */
  goTo(n: number): void {
    if (this._history.length === 0) {
      this._tick = 0;
      return;
    }
    const max = this._history.length - 1;
    this._tick = Math.max(0, Math.min(n, max));
  }
}
