import { describe, it, expect, beforeEach } from 'vitest';
import { register, get, _clear } from '../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

const makeFactory = (name: string) => (): IAlgorithm => ({
  name,
  preemptionMode: 'none',
  requires: {},
  select: (ready: readonly ReadyProcess[]) => {
    const first = ready[0];
    if (first === undefined) throw new Error('Cola vacía');
    return first;
  },
});

beforeEach(() => {
  _clear();
});

describe('registry', () => {
  it('registra y recupera un algoritmo por nombre', () => {
    register(makeFactory('FCFS'));
    expect(get('FCFS').name).toBe('FCFS');
  });

  it('cada llamada a get devuelve una instancia nueva', () => {
    register(makeFactory('FCFS'));
    expect(get('FCFS')).not.toBe(get('FCFS'));
  });

  it('lanza error descriptivo cuando el algoritmo no existe', () => {
    register(makeFactory('SJF'));
    expect(() => get('INEXISTENTE')).toThrow('"INEXISTENTE"');
  });

  it('el mensaje de error lista los algoritmos disponibles', () => {
    register(makeFactory('FCFS'));
    register(makeFactory('SJF'));
    expect(() => get('X')).toThrow('FCFS');
  });

  it('cuando está vacío el mensaje dice "(ninguno)"', () => {
    expect(() => get('cualquiera')).toThrow('(ninguno)');
  });
});
