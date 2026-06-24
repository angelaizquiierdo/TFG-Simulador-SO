import { describe, it, expect, beforeEach } from 'vitest';
import { IOSubsystem } from '../../src/core/io-subsystem.js';

describe('§ Contención del dispositivo de E/S', () => {
  let io: IOSubsystem;

  beforeEach(() => {
    io = new IOSubsystem();
  });

  it('proceso entra directo a servicio si el dispositivo está libre', () => {
    io.requestIO('P1', 3);
    expect(io.getState().serving).toBe('P1');
    expect(io.getState().queue).toEqual([]);
  });

  it('segundo proceso va a waitingIO si el dispositivo está ocupado', () => {
    io.requestIO('P1', 3);
    io.requestIO('P2', 2);
    expect(io.getState().serving).toBe('P1');
    expect(io.getState().queue).toEqual(['P2']);
  });

  it('tick decrementa remaining; sin completar devuelve null', () => {
    io.requestIO('P1', 3);
    expect(io.tick()).toBeNull();
    expect(io.getState().remaining).toBe(2);
    expect(io.tick()).toBeNull();
    expect(io.getState().remaining).toBe(1);
  });

  it('cuando el servicio termina devuelve el pid y admite al siguiente de la cola', () => {
    io.requestIO('P1', 2);
    io.requestIO('P2', 1);

    expect(io.tick()).toBeNull(); // remaining=2→1
    const completed = io.tick(); // remaining=1→0 → P1 done, P2 admitted
    expect(completed).toBe('P1');
    expect(io.getState().serving).toBe('P2');
    expect(io.getState().queue).toEqual([]);
  });

  it('cuando termina el único proceso en servicio, el dispositivo queda libre', () => {
    io.requestIO('P1', 1);
    const completed = io.tick();
    expect(completed).toBe('P1');
    expect(io.getState().serving).toBeNull();
    expect(io.getState().remaining).toBe(0);
  });

  it('cola FCFS: el primero en llegar a waitingIO es el primero en ser admitido', () => {
    io.requestIO('P1', 1);
    io.requestIO('P2', 2);
    io.requestIO('P3', 1);

    const c1 = io.tick(); // P1 completa, P2 admitido
    expect(c1).toBe('P1');
    expect(io.getState().serving).toBe('P2');
    expect(io.getState().queue).toEqual(['P3']);
  });

  it('tick sobre dispositivo vacío devuelve null', () => {
    expect(io.tick()).toBeNull();
    expect(io.getState().serving).toBeNull();
  });
});
