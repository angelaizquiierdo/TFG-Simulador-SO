import { describe, it, expect, beforeEach } from 'vitest';
import { Player } from '../../src/core/player.js';
import type { History, HistoryEvent } from '../../src/core/types/history.js';

/** Crea un HistoryEvent mínimo para los tests. */
function makeEvent(tick: number): HistoryEvent {
  return {
    tick,
    onCPU: null,
    ready: [],
    pending: [],
    completed: [],
    inIO: null,
    waitingIO: [],
    message: `tick ${String(tick)}`,
  };
}

const HISTORY: History = [
  makeEvent(0),
  makeEvent(1),
  makeEvent(2),
  makeEvent(3),
  makeEvent(4),
];

describe('Player — navegación manual', () => {
  let player: Player;

  beforeEach(() => {
    player = new Player(HISTORY);
  });

  it('empieza en tick 0', () => {
    expect(player.tick).toBe(0);
    expect(player.atStart).toBe(true);
    expect(player.atEnd).toBe(false);
  });

  it('stepForward avanza al tick siguiente', () => {
    player.goTo(3);
    player.stepForward();
    expect(player.tick).toBe(4);
    expect(player.current).toEqual(HISTORY[4]);
  });

  it('stepBackward retrocede al tick anterior', () => {
    player.goTo(3);
    player.stepBackward();
    expect(player.tick).toBe(2);
    expect(player.current).toEqual(HISTORY[2]);
  });

  it('stepBackward en tick 0 permanece en 0', () => {
    player.stepBackward();
    expect(player.tick).toBe(0);
    expect(player.atStart).toBe(true);
  });

  it('stepForward en el último tick permanece ahí', () => {
    player.goTo(4);
    expect(player.atEnd).toBe(true);
    player.stepForward();
    expect(player.tick).toBe(4);
  });

  it('goTo salta directamente al tick N', () => {
    player.goTo(3);
    expect(player.tick).toBe(3);
    expect(player.current).toEqual(HISTORY[3]);
    expect(player.atStart).toBe(false);
    expect(player.atEnd).toBe(false);
  });

  it('goTo con n negativo se ajusta a 0', () => {
    player.goTo(-5);
    expect(player.tick).toBe(0);
  });

  it('goTo con n mayor que el último tick se ajusta al último', () => {
    player.goTo(999);
    expect(player.tick).toBe(4);
    expect(player.atEnd).toBe(true);
  });

  it('atEnd es true solo en el último tick', () => {
    player.goTo(4);
    expect(player.atEnd).toBe(true);
    player.goTo(3);
    expect(player.atEnd).toBe(false);
  });
});
