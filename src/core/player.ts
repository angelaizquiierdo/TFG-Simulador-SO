import type { History, HistoryEvent } from './types/history.js';

/**
 * Cursor puro sobre un History.
 * No usa requestAnimationFrame, setTimeout, Date.now ni ninguna API de navegador.
 */
export class Player {
  private _index: number;
  private readonly _history: History;

  constructor(history: History) {
    this._history = history;
    this._index = 0;
  }

  /** Tick actual (índice en el historial). */
  get tick(): number {
    return this._index;
  }

  /** HistoryEvent correspondiente al tick actual. */
  get current(): HistoryEvent | undefined {
    return this._history[this._index];
  }

  /** true si el cursor está en el primer tick. */
  get atStart(): boolean {
    return this._index === 0;
  }

  /** true si el cursor está en el último tick. */
  get atEnd(): boolean {
    return this._index === this._history.length - 1;
  }

  /** Avanza un tick. No avanza más allá del último tick. */
  stepForward(): void {
    if (!this.atEnd) {
      this._index += 1;
    }
  }

  /** Retrocede un tick. No retrocede más allá del tick 0. */
  stepBackward(): void {
    if (!this.atStart) {
      this._index -= 1;
    }
  }

  /** Salta directamente al tick n. Si n está fuera de rango, se ajusta al límite. */
  goTo(n: number): void {
    if (n <= 0) {
      this._index = 0;
    } else if (n >= this._history.length) {
      this._index = this._history.length - 1;
    } else {
      this._index = n;
    }
  }
}
