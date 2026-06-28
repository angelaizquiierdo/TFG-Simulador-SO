import React, { useState, useEffect, useLayoutEffect, useRef, useCallback, useMemo } from 'react';
import { useSimulation } from './SimulationContext.js';
import type { Process } from '../core/types/process.js';
import type { IOOperation } from '../core/types/io.js';
import styles from './style/ProcessForm.module.css';

interface DraftIOOp {
  io_entry: string;
  io_time: string;
}

interface DraftProcess {
  id: string;
  arrival_time: string;
  burst_time: string;
  priority: string;
  io_ops: DraftIOOp[];
}

function processesToDraft(processes: readonly Process[]): DraftProcess[] {
  return processes.map((p) => ({
    id: p.id,
    arrival_time: String(p.arrival_time),
    burst_time: String(p.burst_time),
    priority: p.priority !== undefined ? String(p.priority) : '',
    io_ops: (p.io ?? []).map((op) => ({
      io_entry: String(op.io_entry),
      io_time: String(op.io_time),
    })),
  }));
}

interface ValidationResult {
  readonly errors: Record<string, string>;
  readonly processes: readonly Process[] | null;
}

function validateDraft(
  draft: readonly DraftProcess[],
  requiresIO: boolean,
  requiresPriority: boolean,
): ValidationResult {
  const errors: Record<string, string> = {};
  const result: Process[] = [];

  for (const dp of draft) {
    const prefix = dp.id;
    const arrival = Number(dp.arrival_time);
    const burst = Number(dp.burst_time);

    if (!Number.isFinite(arrival) || arrival < 0) {
      errors[`${prefix}.arrival_time`] = 'arrival_time debe ser ≥ 0';
    }
    if (!Number.isFinite(burst) || burst <= 0) {
      errors[`${prefix}.burst_time`] = 'burst_time debe ser > 0';
    }

    let priority: number | undefined;
    if (requiresPriority) {
      const pNum = Number(dp.priority);
      if (!Number.isFinite(pNum)) {
        errors[`${prefix}.priority`] = 'priority debe ser un número';
      } else {
        priority = pNum;
      }
    }

    const io_ops: IOOperation[] = [];
    if (requiresIO) {
      let lastEntry = 0;
      for (let j = 0; j < dp.io_ops.length; j++) {
        const op = dp.io_ops[j];
        if (op === undefined) continue;
        const io_entry = Number(op.io_entry);
        const io_time = Number(op.io_time);
        if (!Number.isFinite(io_entry) || io_entry <= 0) {
          errors[`${prefix}.io_ops.${String(j)}.io_entry`] = 'io_entry debe ser > 0';
        } else if (io_entry >= burst) {
          errors[`${prefix}.io_ops.${String(j)}.io_entry`] =
            `io_entry debe ser < burst_time (${String(burst)})`;
        } else if (io_entry <= lastEntry) {
          errors[`${prefix}.io_ops.${String(j)}.io_entry`] =
            'io_entry debe ser estrictamente creciente';
        } else {
          lastEntry = io_entry;
          io_ops.push({ io_entry, io_time });
        }
        if (!Number.isFinite(io_time) || io_time <= 0) {
          errors[`${prefix}.io_ops.${String(j)}.io_time`] = 'io_time debe ser > 0';
        }
      }
    }

    const p: Process = {
      id: dp.id,
      arrival_time: arrival,
      burst_time: burst,
      ...(requiresPriority && priority !== undefined ? { priority } : {}),
      ...(requiresIO && io_ops.length > 0 ? { io: io_ops } : {}),
    };
    result.push(p);
  }

  if (Object.keys(errors).length > 0) {
    return { errors, processes: null };
  }
  return { errors: {}, processes: result };
}

// Contador para IDs de nuevos procesos
let nextId = 100;
function generateId(): string {
  return `NP${String(++nextId)}`;
}

export function ProcessForm(): React.ReactElement {
  const { processes, requires, currentEvent, updateProcesses } = useSimulation();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<DraftProcess[]>(() => processesToDraft(processes));

  const requiresPriority = requires.priority === true;
  const requiresIO = requires.io === true;
  const currentTick = currentEvent?.tick ?? 0;

  // Mantener ref de processes para sincronizar al abrir sin efecto de deps
  const processesRef = useRef(processes);
  useLayoutEffect(() => {
    processesRef.current = processes;
  });

  // Al abrir el panel, resetear draft desde el contexto
  // Solo se llama setDraft aquí (state local), lo cual es aceptable en useEffect
  const prevOpenRef = useRef(false);
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setDraft(processesToDraft(processesRef.current));
    }
    prevOpenRef.current = open;
  }, [open]);

  // Refs estables para los valores que usan los handlers
  const requiresIORef = useRef(requiresIO);
  const requiresPriorityRef = useRef(requiresPriority);
  const updateProcessesRef = useRef(updateProcesses);
  useLayoutEffect(() => {
    requiresIORef.current = requiresIO;
    requiresPriorityRef.current = requiresPriority;
    updateProcessesRef.current = updateProcesses;
  });

  // Errores derivados del draft (sin setState — computed en render)
  const { errors } = useMemo(
    () => (open ? validateDraft(draft, requiresIO, requiresPriority) : { errors: {}, processes: null }),
    [draft, open, requiresIO, requiresPriority],
  );

  // Llamar a updateProcesses con los nuevos procesos si la validación pasa
  function applyNext(next: DraftProcess[]): void {
    const { processes: parsed } = validateDraft(
      next,
      requiresIORef.current,
      requiresPriorityRef.current,
    );
    if (parsed !== null) {
      updateProcessesRef.current(parsed);
    }
  }

  const updateField = useCallback(
    (idx: number, field: keyof Omit<DraftProcess, 'io_ops'>, val: string) => {
      setDraft((prev) => {
        const next = prev.map((p, i) => (i === idx ? { ...p, [field]: val } : p));
        applyNext(next);
        return next;
      });
    },
    [],
  );

  const addProcess = useCallback(() => {
    const id = generateId();
    const tick = currentTick;
    setDraft((prev) => {
      const next = [
        ...prev,
        { id, arrival_time: String(tick), burst_time: '1', priority: '', io_ops: [] },
      ];
      applyNext(next);
      return next;
    });
  }, [currentTick]);

  const removeProcess = useCallback((idx: number) => {
    setDraft((prev) => {
      const next = prev.filter((_, i) => i !== idx);
      applyNext(next);
      return next;
    });
  }, []);

  const addIOOp = useCallback((pIdx: number) => {
    setDraft((prev) => {
      const next = prev.map((p, i) => {
        if (i !== pIdx) return p;
        return { ...p, io_ops: [...p.io_ops, { io_entry: '1', io_time: '1' }] };
      });
      applyNext(next);
      return next;
    });
  }, []);

  const removeIOOp = useCallback((pIdx: number, opIdx: number) => {
    setDraft((prev) => {
      const next = prev.map((p, i) => {
        if (i !== pIdx) return p;
        return { ...p, io_ops: p.io_ops.filter((_, j) => j !== opIdx) };
      });
      applyNext(next);
      return next;
    });
  }, []);

  const updateIOField = useCallback(
    (pIdx: number, opIdx: number, field: keyof DraftIOOp, val: string) => {
      setDraft((prev) => {
        const next = prev.map((p, i) => {
          if (i !== pIdx) return p;
          return {
            ...p,
            io_ops: p.io_ops.map((op, j) => (j === opIdx ? { ...op, [field]: val } : op)),
          };
        });
        applyNext(next);
        return next;
      });
    },
    [],
  );

  return (
    <div data-testid="process-form" className={styles.container}>
      <button
        type="button"
        className={styles.toggle}
        aria-expanded={open}
        onClick={() => {
          setOpen((v) => !v);
        }}
      >
        {open ? '▲' : '▼'} Procesos
      </button>
      {open && (
        <div className={styles.panel} data-testid="process-form-panel">
          {draft.map((dp, pIdx) => {
            const prefix = dp.id;
            return (
              <div
                key={dp.id}
                className={styles.processRow}
                data-testid={`process-row-${dp.id}`}
              >
                <span className={styles.processId}>{dp.id}</span>
                <label className={styles.field}>
                  <span>Llegada</span>
                  <input
                    type="number"
                    min={0}
                    value={dp.arrival_time}
                    data-testid={`input-arrival-${dp.id}`}
                    onChange={(e) => {
                      updateField(pIdx, 'arrival_time', e.target.value);
                    }}
                  />
                  {errors[`${prefix}.arrival_time`] !== undefined && (
                    <span className={styles.error} role="alert">
                      {errors[`${prefix}.arrival_time`]}
                    </span>
                  )}
                </label>
                <label className={styles.field}>
                  <span>Ráfaga</span>
                  <input
                    type="number"
                    min={1}
                    value={dp.burst_time}
                    data-testid={`input-burst-${dp.id}`}
                    onChange={(e) => {
                      updateField(pIdx, 'burst_time', e.target.value);
                    }}
                  />
                  {errors[`${prefix}.burst_time`] !== undefined && (
                    <span className={styles.error} role="alert">
                      {errors[`${prefix}.burst_time`]}
                    </span>
                  )}
                </label>
                {requiresPriority && (
                  <label className={styles.field}>
                    <span>Prioridad</span>
                    <input
                      type="number"
                      value={dp.priority}
                      data-testid={`input-priority-${dp.id}`}
                      onChange={(e) => {
                        updateField(pIdx, 'priority', e.target.value);
                      }}
                    />
                    {errors[`${prefix}.priority`] !== undefined && (
                      <span className={styles.error} role="alert">
                        {errors[`${prefix}.priority`]}
                      </span>
                    )}
                  </label>
                )}
                {requiresIO && (
                  <div className={styles.ioSection}>
                    {dp.io_ops.map((op, opIdx) => (
                      <div
                        key={opIdx}
                        className={styles.ioOp}
                        data-testid={`io-op-${dp.id}-${String(opIdx)}`}
                      >
                        <label className={styles.field}>
                          <span>E/S entrada</span>
                          <input
                            type="number"
                            min={1}
                            value={op.io_entry}
                            onChange={(e) => {
                              updateIOField(pIdx, opIdx, 'io_entry', e.target.value);
                            }}
                          />
                          {errors[`${prefix}.io_ops.${String(opIdx)}.io_entry`] !== undefined && (
                            <span className={styles.error} role="alert">
                              {errors[`${prefix}.io_ops.${String(opIdx)}.io_entry`]}
                            </span>
                          )}
                        </label>
                        <label className={styles.field}>
                          <span>E/S tiempo</span>
                          <input
                            type="number"
                            min={1}
                            value={op.io_time}
                            onChange={(e) => {
                              updateIOField(pIdx, opIdx, 'io_time', e.target.value);
                            }}
                          />
                          {errors[`${prefix}.io_ops.${String(opIdx)}.io_time`] !== undefined && (
                            <span className={styles.error} role="alert">
                              {errors[`${prefix}.io_ops.${String(opIdx)}.io_time`]}
                            </span>
                          )}
                        </label>
                        <button
                          type="button"
                          className={styles.removeButton}
                          aria-label={`Eliminar E/S ${String(opIdx)} de ${dp.id}`}
                          onClick={() => {
                            removeIOOp(pIdx, opIdx);
                          }}
                        >
                          −
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className={styles.addButton}
                      aria-label={`Añadir E/S a ${dp.id}`}
                      onClick={() => {
                        addIOOp(pIdx);
                      }}
                    >
                      + E/S
                    </button>
                  </div>
                )}
                <button
                  type="button"
                  className={styles.removeButton}
                  aria-label={`Eliminar proceso ${dp.id}`}
                  data-testid={`remove-process-${dp.id}`}
                  onClick={() => {
                    removeProcess(pIdx);
                  }}
                >
                  Eliminar
                </button>
              </div>
            );
          })}
          <button
            type="button"
            className={styles.addButton}
            data-testid="add-process-button"
            onClick={addProcess}
          >
            + Proceso
          </button>
        </div>
      )}
    </div>
  );
}
