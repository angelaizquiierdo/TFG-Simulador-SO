import { useSimulation } from './SimulationContext.js';
import styles from './style/GanttChart.module.css';

// Paleta de 10 colores de proceso (los tokens CSS se usan vía var())
const PROCESS_COLORS = [
  'var(--scheduler-process-0)',
  'var(--scheduler-process-1)',
  'var(--scheduler-process-2)',
  'var(--scheduler-process-3)',
  'var(--scheduler-process-4)',
  'var(--scheduler-process-5)',
  'var(--scheduler-process-6)',
  'var(--scheduler-process-7)',
  'var(--scheduler-process-8)',
  'var(--scheduler-process-9)',
];

function getProcessColor(pid: string, pids: string[]): string {
  const idx = pids.indexOf(pid);
  return PROCESS_COLORS[idx % PROCESS_COLORS.length] ?? PROCESS_COLORS[0] ?? 'gray';
}

type CellState = 'empty' | 'idle' | 'cpu' | 'waiting' | 'io-serving' | 'io-waiting';

function getCellState(
  pid: string,
  tickIdx: number,
  history: readonly {
    onCPU: string | null;
    ready: readonly string[];
    pending: readonly string[];
    completed: readonly string[];
    inIO: string | null;
    waitingIO: readonly string[];
  }[],
  currentTick: number,
): CellState {
  if (tickIdx > currentTick) return 'empty';

  const event = history[tickIdx];
  if (event === undefined) return 'empty';

  if (event.onCPU === null && event.ready.length === 0 &&
      event.inIO === null && event.waitingIO.length === 0) {
    // CPU inactiva - la fila idle se muestra aparte
    if (pid === '__idle__') return 'idle';
    return 'empty';
  }

  if (pid === '__idle__') {
    return event.onCPU === null ? 'idle' : 'empty';
  }

  if (event.completed.includes(pid)) {
    // Completado antes de este tick
    const completedAt = history.findIndex(
      (e, i) => i <= tickIdx && e.completed.includes(pid) && !history[i - 1]?.completed.includes(pid)
    );
    if (completedAt >= 0 && tickIdx >= completedAt) return 'empty';
  }

  if (event.onCPU === pid) return 'cpu';
  if (event.inIO === pid) return 'io-serving';
  if (event.waitingIO.includes(pid)) return 'io-waiting';
  if (event.ready.includes(pid)) return 'waiting';
  if (event.pending.includes(pid)) return 'empty';

  return 'empty';
}

export function GanttChart() {
  const { result, currentEvent, tick, algo } = useSimulation();

  if (!result || result.history.length === 0) {
    return <div className={styles.wrapper} />;
  }

  const history = result.history;
  const showIO = algo?.requires.io === true;

  // Obtener la lista de PIDs en el orden de llegada
  const pids = [...new Set(
    history.flatMap(e => [
      e.onCPU,
      ...e.ready,
      ...e.pending,
      ...e.completed,
      ...(showIO ? [e.inIO, ...e.waitingIO] : []),
    ].filter((x): x is string => x !== null)),
  )];

  const totalTicks = history.length;

  return (
    <div className={styles.wrapper}>
      {/* Mensaje del tick actual */}
      <div className={styles.message}>
        {currentEvent?.message ?? ''}
      </div>

      {/* Matriz de celdas */}
      <div className={styles.matrix} role="grid">
        {/* Fila CPU inactiva */}
        <div className={styles.row}>
          <span className={styles.label}>Idle</span>
          {Array.from({ length: totalTicks }, (_, t) => {
            const event = history[t];
            if (event === undefined) return null;
            const isIdle = event.onCPU === null && !showIO ? true : event.onCPU === null && event.inIO === null;
            const visible = t <= tick;
            return (
              <div
                key={t}
                data-testid={`cell-idle-${String(t)}`}
                className={[
                  styles.cell,
                  visible && isIdle ? styles.idle : styles.empty,
                ].join(' ')}
              />
            );
          })}
        </div>

        {/* Una fila por proceso */}
        {pids.map(pid => (
          <div key={pid} className={styles.row}>
            <span className={styles.label}>{pid}</span>
            {Array.from({ length: totalTicks }, (_, t) => {
              const event = history[t];
              if (event === undefined) return null;
              const visible = t <= tick;
              const color = getProcessColor(pid, pids);

              if (!visible) {
                return (
                  <div
                    key={t}
                    data-testid={`cell-${pid}-${String(t)}`}
                    className={[styles.cell, styles.empty].join(' ')}
                  />
                );
              }

              const state = getCellState(pid, t, history, tick);

              let cellStyle: React.CSSProperties = {};
              if (state === 'cpu' || state === 'waiting' || state === 'io-serving' || state === 'io-waiting') {
                cellStyle = { backgroundColor: color };
              }

              return (
                <div
                  key={t}
                  data-testid={`cell-${pid}-${String(t)}`}
                  className={[styles.cell, styles[state] ?? ''].join(' ')}
                  style={cellStyle}
                />
              );
            })}
          </div>
        ))}
      </div>

      {/* Leyenda */}
      <div className={styles.legend}>
        <div className={styles.legendItem}>
          <div className={[styles.legendSwatch, styles.idle].join(' ')} />
          <span>Inactivo</span>
        </div>
        <div className={styles.legendItem}>
          <div className={[styles.legendSwatch, styles.waiting].join(' ')} />
          <span>En espera</span>
        </div>
        <div className={styles.legendItem}>
          <div className={[styles.legendSwatch, styles.cpu].join(' ')} />
          <span>En CPU</span>
        </div>
        {showIO && (
          <div className={styles.legendItem}>
            <div className={[styles.legendSwatch, styles['io-serving']].join(' ')} />
            <span>En E/S</span>
          </div>
        )}
        {showIO && (
          <div className={styles.legendItem}>
            <div className={[styles.legendSwatch, styles['io-waiting']].join(' ')} />
            <span>Esperando E/S</span>
          </div>
        )}
      </div>
    </div>
  );
}
