import type { IAlgorithm } from './types/algorithm.js';

const _registry = new Map<string, IAlgorithm>();

function register(algo: IAlgorithm): void {
  _registry.set(algo.name, algo);
}

function get(name: string): IAlgorithm {
  const algo = _registry.get(name);
  if (algo !== undefined) return algo;

  const available = _registry.size === 0
    ? '(ninguno)'
    : Array.from(_registry.keys()).join(', ');

  throw new Error(`Algoritmo "${name}" no encontrado. Disponibles: ${available}`);
}

/** Solo para tests: vacía el registro. */
function _clear(): void {
  _registry.clear();
}

export { register, get, _clear };
