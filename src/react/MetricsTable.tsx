import { useSimulation } from './SimulationContext.js';
import styles from './style/MetricsTable.module.css';

function fmt(n: number, decimals = 2): string {
  return n.toFixed(decimals);
}

export function MetricsTable() {
  const { result, tick } = useSimulation();

  if (!result) return null;

  const maxTick = result.history.length - 1;
  if (tick < maxTick) return null;

  const { metrics, aggregateMetrics } = result;

  return (
    <div className={styles.section}>
      <div>
        <div className={styles.title}>Métricas por proceso</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Completado</th>
              <th>Retorno</th>
              <th>Espera</th>
              <th>Respuesta</th>
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.id}>
                <td>{m.id}</td>
                <td>{m.completion}</td>
                <td>{m.turnaround}</td>
                <td>{m.waiting}</td>
                <td>{m.response}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <div className={styles.title}>Métricas agregadas</div>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Métrica</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Espera media</td>
              <td>{fmt(aggregateMetrics.avgWaiting)}</td>
            </tr>
            <tr>
              <td>Retorno medio</td>
              <td>{fmt(aggregateMetrics.avgTurnaround)}</td>
            </tr>
            <tr>
              <td>Utilización CPU</td>
              <td>{fmt(aggregateMetrics.cpuUtilization * 100)}%</td>
            </tr>
            <tr>
              <td>Rendimiento</td>
              <td>{fmt(aggregateMetrics.throughput, 4)}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}
