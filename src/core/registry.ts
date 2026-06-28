import type { IAlgorithm, AlgorithmParams } from './types/algorithm.js';

type AlgorithmFactory = (params?: AlgorithmParams) => IAlgorithm;

const _registry = new Map<string, AlgorithmFactory>();

function register(factory: AlgorithmFactory): void {
  const sample = factory();
  _registry.set(sample.name, factory);
}

function get(name: string, params?: AlgorithmParams): IAlgorithm {
  const factory = _registry.get(name);
  if (factory !== undefined) return factory(params);

  const available = _registry.size === 0
    ? '(ninguno)'
    : Array.from(_registry.keys()).join(', ');

  throw new Error(`Algoritmo "${name}" no encontrado. Disponibles: ${available}`);
}

/** Solo para tests: vacía el registro. */
function _clear(): void {
  _registry.clear();
}

export type { AlgorithmFactory };
export { register, get, _clear };
