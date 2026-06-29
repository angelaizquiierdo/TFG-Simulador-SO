// @vitest-environment jsdom
/**
 * T-41 — GanttChart
 *
 * Cierra: § Render — GanttChart (todos los criterios v02)
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationCtx } from '../../src/react/SimulationContext.js';
import type { SimulationContextValue } from '../../src/react/SimulationContext.js';
import { GanttChart } from '../../src/react/GanttChart.js';
import { run } from '../../src/core/simulate.js';
import { Player } from '../../src/core/player.js';
import type { Process } from '../../src/core/types/process.js';
import '../../src/index.js';

const PROCS_FCFS: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 2 },
  { id: 'P2', arrival_time: 0, burst_time: 3 },
];

/** Construye un contexto con resultado de FCFS y lo renderiza en el GanttChart */
function renderGantt(
  processes: readonly Process[],
  algorithm = 'fcfs',
  tickOverride?: number,
  requiresOverride?: SimulationContextValue['requires'],
  runConfig: { quantum?: number; boostInterval?: number; quanta?: readonly number[] } = {},
) {
  const result = run(processes, { algorithm, ...runConfig });
  const player = new Player(result.history);
  const tick = tickOverride ?? result.history.length - 1;
  const currentEvent = result.history[tick];
  const value: SimulationContextValue = {
    result,
    currentEvent,
    player,
    error: null,
    whatIfBranch: null,
    processes,
    algorithmName: algorithm,
    requires: requiresOverride ?? {},
    params: {},
    stepForward: () => undefined,
    stepBackward: () => undefined,
    seekTo: () => undefined,
    updateProcesses: () => undefined,
    updateParams: () => undefined,
    createWhatIf: () => undefined,
    discardWhatIf: () => undefined,
    reset: () => undefined,
  };
  return render(
    <SimulationCtx.Provider value={value}>
      <GanttChart />
    </SimulationCtx.Provider>,
  );
}

describe('§ Render — GanttChart', () => {
  afterEach(() => { cleanup(); });

  // ── Estructura básica ──────────────────────────────────────────────────────

  it('renderiza el contenedor raíz con data-testid="gantt-chart"', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
  });

  it('renderiza la fila de cabecera con números de tick', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-header')).toBeInTheDocument();
    // FCFS P1(2) + P2(3) = 5 ticks → números 0..4
    expect(screen.getByText('0')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
  });

  it('renderiza exactamente una fila por proceso (sin filas artificiales)', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-row-P1')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-row-P2')).toBeInTheDocument();
    // No debe haber fila 'Idle' ni 'Inactivo' adicional
    expect(screen.queryByTestId('gantt-row-Idle')).not.toBeInTheDocument();
    expect(screen.queryByTestId('gantt-row-Inactivo')).not.toBeInTheDocument();
  });

  it('las etiquetas de las filas muestran el ID del proceso', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByText('P1')).toBeInTheDocument();
    expect(screen.getByText('P2')).toBeInTheDocument();
  });

  // ── Celdas sin texto ───────────────────────────────────────────────────────

  it('la celda en CPU muestra la etiqueta "CPU"; las celdas no activas no llevan texto', () => {
    // FCFS: en tick 0, P1 está en CPU → muestra "CPU"; P2 espera → sin texto
    renderGantt(PROCS_FCFS, 'fcfs', 0);
    expect(screen.getByTestId('gantt-cell-P1-0').textContent).toBe('CPU');
    expect(screen.getByTestId('gantt-cell-P2-0').textContent).toBe('');
  });

  // ── Clases de estado ───────────────────────────────────────────────────────

  it('la celda de P1 en tick 0 tiene estado cpu', () => {
    // FCFS: P1[0-2], P2[2-5]. En tick 0 P1 está en CPU.
    renderGantt(PROCS_FCFS, 'fcfs', 0);
    const cell = screen.getByTestId('gantt-cell-P1-0');
    expect(cell.className).toContain('cpu');
  });

  it('la celda de P2 en tick 0 tiene estado waiting (en cola de listos)', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0);
    const cell = screen.getByTestId('gantt-cell-P2-0');
    expect(cell.className).toContain('waiting');
  });

  it('la celda de P1 en tick 2 tiene estado empty (P1 completó en tick 2)', () => {
    // P1 completa en tick 2 → celda vacía
    renderGantt(PROCS_FCFS, 'fcfs', 2);
    const cell = screen.getByTestId('gantt-cell-P1-2');
    // En tick 2 P1 ya está en completed y P2 empieza en CPU
    expect(cell.className).toContain('empty');
  });

  it('celdas de ticks futuros al tick actual tienen estado empty (no reveladas)', () => {
    // Con currentTick=0, el tick 4 (futuro) debe ser empty
    renderGantt(PROCS_FCFS, 'fcfs', 0);
    const futureCell = screen.getByTestId('gantt-cell-P1-4');
    expect(futureCell.className).toContain('empty');
  });

  // ── Variable CSS --process-color ──────────────────────────────────────────

  it('la fila de P1 recibe --process-color como variable CSS en línea', () => {
    renderGantt(PROCS_FCFS);
    const row = screen.getByTestId('gantt-row-P1');
    // El estilo inline debe contener --process-color
    expect(row.style.getPropertyValue('--process-color')).toBeTruthy();
  });

  it('cada fila de proceso recibe un color distinto', () => {
    renderGantt(PROCS_FCFS);
    const rowP1 = screen.getByTestId('gantt-row-P1');
    const rowP2 = screen.getByTestId('gantt-row-P2');
    const colorP1 = rowP1.style.getPropertyValue('--process-color');
    const colorP2 = rowP2.style.getPropertyValue('--process-color');
    expect(colorP1).not.toBe(colorP2);
  });

  // ── Mensaje ────────────────────────────────────────────────────────────────

  it('renderiza el área de mensaje', () => {
    renderGantt(PROCS_FCFS);
    expect(screen.getByTestId('gantt-message')).toBeInTheDocument();
  });

  it('el mensaje refleja el HistoryEvent del tick actual', () => {
    const result = run(PROCS_FCFS, { algorithm: 'fcfs' });
    const player = new Player(result.history);
    const tick0Event = result.history[0];
    const value: SimulationContextValue = {
      result,
      currentEvent: tick0Event,
      player,
      error: null,
      whatIfBranch: null,
      processes: PROCS_FCFS,
      algorithmName: 'fcfs',
      requires: {},
      params: {},
      stepForward: () => undefined,
      stepBackward: () => undefined,
      seekTo: () => undefined,
      updateProcesses: () => undefined,
      updateParams: () => undefined,
      createWhatIf: () => undefined,
      discardWhatIf: () => undefined,
    reset: () => undefined,
    };
    render(
      <SimulationCtx.Provider value={value}>
        <GanttChart />
      </SimulationCtx.Provider>,
    );
    const msg = tick0Event?.message ?? '';
    if (msg !== '') {
      const text = screen.getByTestId('gantt-message').textContent;
      expect(text).toContain('Tick 0:');
      expect(text).toContain(msg);
    }
  });

  // ── Leyenda ────────────────────────────────────────────────────────────────

  it('renderiza la leyenda con los tres estados base', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0, {});
    expect(screen.getByTestId('gantt-legend')).toBeInTheDocument();
    expect(screen.getByText('Inactivo (Vacío)')).toBeInTheDocument();
    expect(screen.getByText('En Espera (Listo)')).toBeInTheDocument();
    expect(screen.getByText('Ejecución (CPU)')).toBeInTheDocument();
  });

  it('la leyenda NO muestra estados de E/S si !requires.io', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0, {});
    expect(screen.queryByText('Bloqueado (E/S)')).not.toBeInTheDocument();
    expect(screen.queryByText('Cola de E/S')).not.toBeInTheDocument();
  });

  it('la leyenda muestra estados de E/S si requires.io = true', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0, { io: true });
    expect(screen.getByText('Bloqueado (E/S)')).toBeInTheDocument();
    expect(screen.getByText('Cola de E/S')).toBeInTheDocument();
  });

  // ── Estado idle ────────────────────────────────────────────────────────────

  it('celdas en tick de CPU inactiva reciben estado idle', () => {
    // Proceso que llega tarde para crear hueco de CPU inactiva
    const withGap: readonly Process[] = [
      { id: 'P1', arrival_time: 2, burst_time: 2 },
    ];
    renderGantt(withGap, 'fcfs', 1); // tick 1: CPU inactiva
    const cell = screen.getByTestId('gantt-cell-P1-1');
    // P1 aún está en pending, CPU inactiva → idle
    expect(cell.className).toContain('idle');
  });

  // ── Estado vacío (sin result) ───────────────────────────────────────────────

  it('renderiza un estado vacío cuando no hay result ni currentEvent', () => {
    const value: SimulationContextValue = {
      result: null,
      currentEvent: undefined,
      player: new Player([]),
      error: null,
      whatIfBranch: null,
      processes: PROCS_FCFS,
      algorithmName: 'fcfs',
      requires: {},
      params: {},
      stepForward: () => undefined,
      stepBackward: () => undefined,
      seekTo: () => undefined,
      updateProcesses: () => undefined,
      updateParams: () => undefined,
      createWhatIf: () => undefined,
      discardWhatIf: () => undefined,
      reset: () => undefined,
    };
    render(
      <SimulationCtx.Provider value={value}>
        <GanttChart />
      </SimulationCtx.Provider>,
    );
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-message').textContent).toBe('Tick 0: ');
    const cells = screen.queryAllByRole('generic').filter(
      (el) => el.dataset.testid?.startsWith('gantt-cell-') === true,
    );
    expect(cells.length).toBe(0);
  });

  // ── Estados de E/S (VRR) ────────────────────────────────────────────────────

  const IO_PROCS: readonly Process[] = [
    { id: 'P1', arrival_time: 0, burst_time: 3, io: [{ io_entry: 1, io_time: 3 }] },
    { id: 'P2', arrival_time: 0, burst_time: 3, io: [{ io_entry: 1, io_time: 2 }] },
  ];

  it('celda en servicio de E/S (VRR): estado ioServing con la etiqueta «E/S»', () => {
    const r = run(IO_PROCS, { algorithm: 'virtual-round-robin', quantum: 2 });
    const t = r.history.findIndex((e) => e.inIO !== null);
    expect(t).toBeGreaterThanOrEqual(0);
    const pid = r.history[t]?.inIO ?? null;
    expect(pid).not.toBeNull();
    if (pid === null) return;
    renderGantt(IO_PROCS, 'virtual-round-robin', t, { io: true, quantum: true }, { quantum: 2 });
    const cell = screen.getByTestId(`gantt-cell-${pid}-${String(t)}`);
    expect(cell.className).toContain('ioServing');
    expect(cell.textContent).toContain('E/S');
  });

  it('celda esperando el dispositivo (VRR): estado ioWaiting', () => {
    const r = run(IO_PROCS, { algorithm: 'virtual-round-robin', quantum: 2 });
    const t = r.history.findIndex((e) => e.waitingIO.length > 0);
    expect(t).toBeGreaterThanOrEqual(0);
    const pid = r.history[t]?.waitingIO[0];
    expect(pid).toBeDefined();
    if (pid === undefined) return;
    renderGantt(IO_PROCS, 'virtual-round-robin', t, { io: true, quantum: true }, { quantum: 2 });
    const cell = screen.getByTestId(`gantt-cell-${pid}-${String(t)}`);
    expect(cell.className).toContain('ioWaiting');
    // Cola de E/S: sin fondo, con el texto «L(E/S)»
    expect(cell.textContent).toContain('L(E/S)');
  });

  // ── Número de cola en la etiqueta de CPU (MLFQ / VRR) ────────────────────────

  it('MLFQ: la celda en CPU muestra «CPU{cola}» y las celdas en espera el badge «L{n}»', () => {
    const MLFQ_PROCS: readonly Process[] = [
      { id: 'P1', arrival_time: 0, burst_time: 4 },
      { id: 'P2', arrival_time: 0, burst_time: 4 },
    ];
    // En tick 0, P1 está en CPU en el nivel 0 → «CPU0»; P2 espera en nivel 0 → badge «L0»
    renderGantt(MLFQ_PROCS, 'mlfq', 0, { levels: true, quantum: true });
    expect(screen.getByTestId('gantt-cell-P1-0').textContent).toBe('CPU0');
    expect(screen.getAllByText('L0').length).toBeGreaterThan(0);
  });

  it('VRR: la celda en CPU muestra el número de cola (cola 1 = principal/RR) en «CPU{cola}»', () => {
    // En tick 0 P1 se despacha desde la cola principal (RR) → cola 1 → «CPU1»
    const r = run(IO_PROCS, { algorithm: 'virtual-round-robin', quantum: 2 });
    expect(r.history[0]?.onCPU).toBe('P1');
    expect(r.history[0]?.levels?.P1).toBe(1);
    renderGantt(IO_PROCS, 'virtual-round-robin', 0, { io: true, quantum: true }, { quantum: 2 });
    expect(screen.getByTestId('gantt-cell-P1-0').textContent).toBe('CPU1');
  });

  // ── Tamaño fijo ────────────────────────────────────────────────────────────

  it('el número total de celdas es totalTicks × procesos (tamaño fijo desde el inicio)', () => {
    renderGantt(PROCS_FCFS, 'fcfs', 0); // currentTick=0 pero todas las celdas deben existir
    const result = run(PROCS_FCFS, { algorithm: 'fcfs' });
    const totalTicks = result.history.length;
    const totalCells = PROCS_FCFS.length * totalTicks;
    const cells = screen.getAllByRole('generic').filter(
      (el) => el.dataset.testid?.startsWith('gantt-cell-') === true,
    );
    expect(cells.length).toBe(totalCells);
  });

  // ── Props que sobrescriben el contexto (reutilización en la rama what-if) ────

  it('las props history/currentTick/testId sobrescriben al contexto', () => {
    // Contexto: FCFS (2 procesos). Props: historial de SJF y testId propio.
    const branch = run(PROCS_FCFS, { algorithm: 'sjf' });
    const ctxResult = run(PROCS_FCFS, { algorithm: 'fcfs' });
    const player = new Player(ctxResult.history);
    const value: SimulationContextValue = {
      result: ctxResult,
      currentEvent: ctxResult.history[0],
      player,
      error: null,
      whatIfBranch: null,
      processes: PROCS_FCFS,
      algorithmName: 'fcfs',
      requires: {},
      params: {},
      stepForward: () => undefined,
      stepBackward: () => undefined,
      seekTo: () => undefined,
      updateProcesses: () => undefined,
      updateParams: () => undefined,
      createWhatIf: () => undefined,
      discardWhatIf: () => undefined,
      reset: () => undefined,
    };
    render(
      <SimulationCtx.Provider value={value}>
        <GanttChart
          history={branch.history}
          processes={PROCS_FCFS}
          currentTick={branch.history.length - 1}
          testId="gantt-branch"
        />
      </SimulationCtx.Provider>,
    );
    // El testId override está presente y el por defecto NO.
    expect(screen.getByTestId('gantt-branch')).toBeInTheDocument();
    expect(screen.queryByTestId('gantt-chart')).not.toBeInTheDocument();
    // El nº de celdas corresponde al historial pasado por props.
    const cells = screen.getAllByRole('generic').filter(
      (el) => el.dataset.testid?.startsWith('gantt-cell-') === true,
    );
    expect(cells.length).toBe(PROCS_FCFS.length * branch.history.length);
  });
});
