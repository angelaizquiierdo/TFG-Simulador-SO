// T-06 · Registro y búsqueda de algoritmos
import type { IAlgorithm } from './types/algorithm.js';

const _registry = new Map<string, IAlgorithm>();

/** Registra un algoritmo por su `name`. Sobrescribe si ya existe. */
export function register(algo: IAlgorithm): void {
  _registry.set(algo.name, algo);
}

/**
 * Devuelve el algoritmo registrado con ese `name`.
 * Lanza un error descriptivo si no existe.
 */
export function get(name: string): IAlgorithm {
  const algo = _registry.get(name);
  if (algo === undefined) {
    throw new Error(
      `Algoritmo "${name}" no encontrado. Algoritmos registrados: ${
        [..._registry.keys()].join(', ') || '(ninguno)'
      }`,
    );
  }
  return algo;
}
