// T-06 · Tests del registro de algoritmos
import { describe, it, expect } from 'vitest';
import { register, get } from '../../src/core/registry.js';
import type { IAlgorithm, ReadyProcess } from '../../src/core/types/algorithm.js';

/** Algoritmo mínimo de prueba */
function makeAlgo(name: string): IAlgorithm {
  return {
    name,
    preemptionMode: 'none',
    requires: {},
    select(ready: readonly ReadyProcess[]): ReadyProcess {
      const first = ready[0];
      if (first === undefined) throw new Error('Cola vacía');
      return first;
    },
  };
}

describe('registry', () => {
  // Registrar algo nuevo antes de cada test para no contaminar el singleton
  // (los tests de este módulo trabajan con nombres únicos)
  it('lanza error indicando "(ninguno)" si el registro está completamente vacío', () => {
    expect(() => get('algoritmo-fantasma')).toThrowError(/\(ninguno\)/);
  });

  it('registra un algoritmo y lo recupera por name', () => {
    const algo = makeAlgo('test-fcfs');
    register(algo);
    expect(get('test-fcfs')).toBe(algo);
  });

  it('sobrescribe el algoritmo si se registra de nuevo con el mismo name', () => {
    const a1 = makeAlgo('test-overwrite');
    const a2 = makeAlgo('test-overwrite');
    register(a1);
    register(a2);
    expect(get('test-overwrite')).toBe(a2);
  });

  it('lanza error descriptivo cuando el name no existe', () => {
    expect(() => get('algoritmo-inexistente')).toThrowError(
      /algoritmo-inexistente/i,
    );
  });

  it('el mensaje de error lista los algoritmos registrados', () => {
    register(makeAlgo('test-listed'));
    expect(() => get('no-existe')).toThrowError(/test-listed/);
  });
});
