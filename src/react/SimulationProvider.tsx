import { useState, useCallback, useMemo, useEffect, type ReactNode } from 'react';
import { SimulationCtx, type SimulationContextValue } from './SimulationContext.js';
import { get } from '../core/registry.js';
import { run } from '../core/simulate.js';
import type { Process } from '../core/types/process.js';
import type { AlgorithmParams, IAlgorithm } from '../core/types/algorithm.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import styles from './style/SimulationProvider.module.css';

export interface SimulationProviderProps {
  algorithm: string;
  processes: readonly Process[];
  params?: AlgorithmParams;
  children?: ReactNode;
}

interface Computed {
  result: SimulationResult | null;
  error: Error | null;
  algo: IAlgorithm | null;
}

function storageKey(algoName: string): string {
  return `scheduler-scenario:${algoName}`;
}

interface StoredScenario {
  processes: Process[];
  params: AlgorithmParams;
}

function readScenario(algoName: string): StoredScenario | null {
  try {
    const raw = sessionStorage.getItem(storageKey(algoName));
    if (!raw) return null;
    return JSON.parse(raw) as StoredScenario;
  } catch {
    return null;
  }
}

function writeScenario(algoName: string, processes: readonly Process[], params: AlgorithmParams): void {
  try {
    const scenario: StoredScenario = { processes: [...processes], params };
    sessionStorage.setItem(storageKey(algoName), JSON.stringify(scenario));
  } catch { /* quota exceeded o modo privado */ }
}

function clearScenario(algoName: string): void {
  try {
    sessionStorage.removeItem(storageKey(algoName));
  } catch { /* ignorar */ }
}

function buildRunConfig(algo: IAlgorithm, params: AlgorithmParams) {
  const q = params.quantum;
  const quantum = typeof q === 'number' ? q : undefined;
  return { algorithm: algo, ...(quantum !== undefined ? { quantum } : {}), params };
}

function computeSimulation(
  algorithmName: string,
  processes: readonly Process[],
  params: AlgorithmParams,
): Computed {
  if (processes.length === 0) {
    let a: IAlgorithm | null = null;
    try { a = get(algorithmName); } catch { /* ignorar */ }
    return { result: null, error: null, algo: a };
  }
  try {
    const a = get(algorithmName);
    const r = run(processes, buildRunConfig(a, params));
    return { result: r, error: null, algo: a };
  } catch (e) {
    return {
      result: null,
      error: e instanceof Error ? e : new Error(String(e)),
      algo: null,
    };
  }
}

export function SimulationProvider({
  algorithm: algorithmName,
  processes: initialProcesses,
  params: initialParams,
  children,
}: SimulationProviderProps) {
  const [processes, setProcesses] = useState<readonly Process[]>(() => {
    const saved = readScenario(algorithmName);
    return saved?.processes ?? initialProcesses;
  });

  const [params, setParams] = useState<AlgorithmParams>(() => {
    const saved = readScenario(algorithmName);
    return saved?.params ?? initialParams ?? {};
  });

  // Persistir en sessionStorage cuando cambien processes o params (sin setState)
  useEffect(() => {
    writeScenario(algorithmName, processes, params);
  }, [algorithmName, processes, params]);

  // Computar la simulación de forma pura durante el render
  const computed = useMemo(
    () => computeSimulation(algorithmName, processes, params),
    [algorithmName, processes, params],
  );

  const { result, error, algo } = computed;

  // Resetear tick al cambiar el resultado (patrón "estado derivado durante el render")
  const [tickState, setTickState] = useState<{ tick: number; forResult: SimulationResult | null }>({
    tick: 0,
    forResult: null,
  });

  if (tickState.forResult !== result) {
    setTickState({ tick: 0, forResult: result });
  }

  const tick = tickState.tick;
  const currentEvent = result?.history[tick];

  const stepForward = useCallback(() => {
    setTickState(s => ({
      ...s,
      tick: Math.min(s.tick + 1, s.forResult ? s.forResult.history.length - 1 : 0),
    }));
  }, []);

  const stepBackward = useCallback(() => {
    setTickState(s => ({ ...s, tick: Math.max(s.tick - 1, 0) }));
  }, []);

  const goTo = useCallback((n: number) => {
    setTickState(s => ({
      ...s,
      tick: Math.max(0, Math.min(n, s.forResult ? s.forResult.history.length - 1 : 0)),
    }));
  }, []);

  const updateProcesses = useCallback((p: readonly Process[]) => { setProcesses(p); }, []);
  const updateParams = useCallback((p: AlgorithmParams) => { setParams(p); }, []);

  const reset = useCallback(() => {
    clearScenario(algorithmName);
    setProcesses(initialProcesses);
    setParams(initialParams ?? {});
  }, [algorithmName, initialProcesses, initialParams]);

  const ctxValue: SimulationContextValue = useMemo(
    () => ({
      result,
      currentEvent,
      error,
      algo,
      processes,
      params,
      tick,
      stepForward,
      stepBackward,
      goTo,
      updateProcesses,
      updateParams,
      reset,
    }),
    [result, currentEvent, error, algo, processes, params, tick,
     stepForward, stepBackward, goTo, updateProcesses, updateParams, reset],
  );

  return (
    <SimulationCtx.Provider value={ctxValue}>
      <div className={styles.provider}>
        {children}
      </div>
    </SimulationCtx.Provider>
  );
}
