import type { IAlgorithm } from './types/algorithm.js';
import { FCFS } from './algorithms/non-preemptive/fcfs.js';
import { SJF } from './algorithms/non-preemptive/sjf.js';
import { LJF } from './algorithms/non-preemptive/ljf.js';
import { PriorityNP } from './algorithms/non-preemptive/priority-np.js';
import { SRTF } from './algorithms/preemptive/srtf.js';
import { PriorityP } from './algorithms/preemptive/priority-p.js';
import { RoundRobin } from './algorithms/preemptive/round-robin.js';

// Mapa interno singleton de algoritmos registrados
const registry = new Map<string, IAlgorithm>();

// Registro de algoritmos predeterminados
register(new FCFS());
register(new SJF());
register(new LJF());
register(new PriorityNP());
register(new SRTF());
register(new PriorityP());
register(new RoundRobin());

// Registra un algoritmo por su nombre
export function register(algo: IAlgorithm): void {
  registry.set(algo.name, algo);
}

// Devuelve el algoritmo registrado con el nombre dado; lanza error si no existe
export function get(name: string): IAlgorithm {
  const algo = registry.get(name);
  if (algo === undefined) {
    throw new Error(`Algoritmo no registrado: "${name}"`);
  }
  return algo;
}
