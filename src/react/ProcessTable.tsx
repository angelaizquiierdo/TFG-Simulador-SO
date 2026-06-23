import { useSimulation } from './SimulationContext.js';
import styles from './style/ProcessTable.module.css';

export function ProcessTable() {
  const { processes, algo } = useSimulation();

  const showPriority =
    algo?.requires.priority === true ||
    processes.some(p => p.priority !== undefined);
  const showIO = algo?.requires.io === true;

  return (
    <table className={styles.table}>
      <thead>
        <tr>
          <th>ID</th>
          <th className={styles.numeric}>Llegada</th>
          <th className={styles.numeric}>Ráfaga</th>
          {showPriority && <th className={styles.numeric}>Prioridad</th>}
          {showIO && <th className={styles.numeric}>E/S entrada</th>}
          {showIO && <th className={styles.numeric}>E/S tiempo</th>}
          {showIO && <th className={styles.numeric}>E/S salida</th>}
        </tr>
      </thead>
      <tbody>
        {processes.map(p => {
          const ioOp = p.io?.[0];
          const ioExit =
            showIO && ioOp !== undefined
              ? ioOp.io_entry + ioOp.io_time
              : null;
          return (
            <tr key={p.id}>
              <td>{p.id}</td>
              <td className={styles.numeric}>{p.arrival_time}</td>
              <td className={styles.numeric}>{p.burst_time}</td>
              {showPriority && (
                <td className={styles.numeric}>{p.priority ?? '—'}</td>
              )}
              {showIO && (
                <td className={styles.numeric}>{ioOp?.io_entry ?? '—'}</td>
              )}
              {showIO && (
                <td className={styles.numeric}>{ioOp?.io_time ?? '—'}</td>
              )}
              {showIO && (
                <td className={styles.numeric}>{ioExit ?? '—'}</td>
              )}
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
