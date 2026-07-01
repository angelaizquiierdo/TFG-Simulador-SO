import React, { useMemo, useState, useCallback, useEffect, useRef } from 'react';
import type { Process } from '../core/types/process.js';
import type { SimulationResult } from '../core/types/simulation-result.js';
import type { HistoryEvent } from '../core/types/history.js';
import { run } from '../core/simulate.js';
import { Player } from '../core/player.js';
import { get } from '../core/registry.js';
import { SimulationCtx } from './SimulationContext.js';
import type {
  WhatIfBranch,
  WhatIfOverrides,
  SimulationContextValue,
  AlgorithmRequires,
} from './SimulationContext.js';

export interface SimulationProviderProps {
  readonly algorithm: string;
  readonly processes: readonly Process[];
  readonly params?: Readonly<Record<string, unknown>>;
  readonly children: React.ReactNode;
}

function buildConfig(
  algorithm: string,
  params: Readonly<Record<string, unknown>> | undefined,
): { algorithm: string; quantum?: number; boostInterval?: number; quanta?: number[] } {
  const quantum =
    typeof params?.quantum === 'number' ? params.quantum : undefined;
  const boostInterval =
    typeof params?.boostInterval === 'number' ? params.boostInterval : undefined;
  const rawQuanta = params?.quanta;
  const quanta: number[] | undefined =
    Array.isArray(rawQuanta) && rawQuanta.every((n): n is number => typeof n === 'number')
      ? rawQuanta
      : undefined;
  return {
    algorithm,
    ...(quantum !== undefined ? { quantum } : {}),
    ...(boostInterval !== undefined ? { boostInterval } : {}),
    ...(quanta !== undefined ? { quanta } : {}),
  };
}

function ssGet(key: string): string | null {
  try {
    return sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function ssSet(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value);
  } catch {
    // ignorar errores de almacenamiento
  }
}

function ssRemove(key: string): void {
  try {
    sessionStorage.removeItem(key);
  } catch {
    // ignorar
  }
}

interface PersistedScenario {
  readonly processes: readonly Process[];
  readonly params: Readonly<Record<string, unknown>>;
}

interface PersistedWhatIf {
  readonly algorithm: string;
  readonly processes: readonly Process[];
  readonly params: Readonly<Record<string, unknown>>;
}

function loadScenario(key: string): PersistedScenario | null {
  const raw = ssGet(key);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'processes' in parsed &&
      Array.isArray((parsed as Record<string, unknown>).processes)
    ) {
      return parsed as PersistedScenario;
    }
  } catch {
    // ignorar JSON inválido
  }
  return null;
}

function loadWhatIf(key: string): PersistedWhatIf | null {
  const raw = ssGet(key);
  if (raw === null) return null;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (
      parsed !== null &&
      typeof parsed === 'object' &&
      'processes' in parsed &&
      Array.isArray((parsed as Record<string, unknown>).processes)
    ) {
      return parsed as PersistedWhatIf;
    }
  } catch {
    // ignorar JSON inválido
  }
  return null;
}

const EMPTY_REQUIRES: AlgorithmRequires = {};

export function SimulationProvider({
  algorithm,
  processes: initialProcesses,
  params: initialParams,
  children,
}: SimulationProviderProps): React.ReactElement {
  const scenarioKey = `scheduler-scenario:${algorithm}`;
  const whatifKey = `scheduler-whatif:${algorithm}`;

  const initialProcessesRef = useRef(initialProcesses);
  const initialParamsRef = useRef(initialParams ?? {});

  const loadValidScenario = (): PersistedScenario | null => {
    const saved = loadScenario(scenarioKey);
    if (saved === null) return null;
    try {
      run(saved.processes, buildConfig(algorithm, saved.params));
      return saved;
    } catch {
      return null;
    }
  };

  const [localProcesses, setLocalProcesses] = useState<readonly Process[]>(
    () => loadValidScenario()?.processes ?? initialProcesses,
  );
  const [localParams, setLocalParams] = useState<Readonly<Record<string, unknown>>>(
    () => loadValidScenario()?.params ?? initialParams ?? {},
  );

  const [mainResult, mainError] = useMemo((): [SimulationResult | null, string | null] => {
    if (localProcesses.length === 0) return [null, null];
    try {
      return [run(localProcesses, buildConfig(algorithm, localParams)), null];
    } catch (e: unknown) {
      return [null, e instanceof Error ? e.message : String(e)];
    }
  }, [algorithm, localProcesses, localParams]);

  useEffect(() => {
    if (mainError !== null) {
      ssRemove(scenarioKey);
      return;
    }
    ssSet(scenarioKey, JSON.stringify({ processes: localProcesses, params: localParams }));
  }, [scenarioKey, localProcesses, localParams, mainError]);

  const requires = useMemo((): AlgorithmRequires => {
    try {
      return get(algorithm).requires;
    } catch {
      return EMPTY_REQUIRES;
    }
  }, [algorithm]);

  const player = useMemo(
    () => (mainResult !== null ? new Player(mainResult.history) : null),
    [mainResult],
  );

  const [tickIndex, setTickIndex] = useState(0);

  const currentEvent: HistoryEvent | undefined = useMemo(
    () => mainResult?.history[tickIndex],
    [mainResult, tickIndex],
  );

  const [whatIfBranch, setWhatIfBranch] = useState<WhatIfBranch | null>(() => {
    const saved = loadWhatIf(whatifKey);
    if (saved === null || saved.processes.length === 0) return null;
    try {
      const result = run(saved.processes, buildConfig(saved.algorithm, saved.params));
      return { result, player: new Player(result.history), algorithm: saved.algorithm, params: saved.params };
    } catch {
      return null;
    }
  });

  const stepForward = useCallback(() => {
    if (player === null) return;
    player.stepForward();
    setTickIndex(player.tick);
  }, [player]);

  const stepBackward = useCallback(() => {
    if (player === null) return;
    player.stepBackward();
    setTickIndex(player.tick);
  }, [player]);

  const seekTo = useCallback(
    (n: number) => {
      if (player === null) return;
      player.goTo(n);
      setTickIndex(player.tick);
    },
    [player],
  );

  const updateProcesses = useCallback(
    (next: readonly Process[]) => {
      setLocalProcesses(next);
      setTickIndex(0);

      if (whatIfBranch === null) return;
      if (next.length === 0) {
        setWhatIfBranch(null);
        ssRemove(whatifKey);
        return;
      }
      try {
        const { algorithm: branchAlgorithm, params: branchParams } = whatIfBranch;
        const result = run(next, buildConfig(branchAlgorithm, branchParams));
        setWhatIfBranch({
          result,
          player: new Player(result.history),
          algorithm: branchAlgorithm,
          params: branchParams,
        });
        ssSet(
          whatifKey,
          JSON.stringify({ algorithm: branchAlgorithm, processes: next, params: branchParams }),
        );
      } catch {
        setWhatIfBranch(null);
        ssRemove(whatifKey);
      }
    },
    [whatIfBranch, whatifKey],
  );

  const updateParams = useCallback((next: Readonly<Record<string, unknown>>) => {
    setLocalParams(next);
    setTickIndex(0);
  }, []);

  const createWhatIf = useCallback(
    (overrides: WhatIfOverrides) => {
      const nextAlgorithm = overrides.algorithm ?? algorithm;
      const nextParams = overrides.params ?? localParams;
      const nextProcesses = overrides.processes ?? localProcesses;
      if (nextProcesses.length === 0) return;
      try {
        const result = run(nextProcesses, buildConfig(nextAlgorithm, nextParams));
        setWhatIfBranch({ result, player: new Player(result.history), algorithm: nextAlgorithm, params: nextParams });
        const persisted: PersistedWhatIf = {
          algorithm: nextAlgorithm,
          processes: nextProcesses,
          params: nextParams,
        };
        ssSet(whatifKey, JSON.stringify(persisted));
      } catch (err: unknown) {
        void err;
      }
    },
    [algorithm, localProcesses, localParams, whatifKey],
  );

  const discardWhatIf = useCallback(() => {
    setWhatIfBranch(null);
    ssRemove(whatifKey);
  }, [whatifKey]);

  const reset = useCallback(() => {
    setLocalProcesses(initialProcessesRef.current);
    setLocalParams(initialParamsRef.current);
    setWhatIfBranch(null);
    setTickIndex(0);
    ssRemove(scenarioKey);
    ssRemove(whatifKey);
  }, [scenarioKey, whatifKey]);

  const value: SimulationContextValue = useMemo(
    () => ({
      result: mainResult,
      currentEvent,
      player,
      error: mainError,
      whatIfBranch,
      processes: localProcesses,
      algorithmName: algorithm,
      params: localParams,
      requires,
      stepForward,
      stepBackward,
      seekTo,
      updateProcesses,
      updateParams,
      createWhatIf,
      discardWhatIf,
      reset,
    }),
    [
      mainResult,
      currentEvent,
      player,
      mainError,
      whatIfBranch,
      localProcesses,
      algorithm,
      localParams,
      requires,
      stepForward,
      stepBackward,
      seekTo,
      updateProcesses,
      updateParams,
      createWhatIf,
      discardWhatIf,
      reset,
    ],
  );

  return <SimulationCtx.Provider value={value}>{children}</SimulationCtx.Provider>;
}
