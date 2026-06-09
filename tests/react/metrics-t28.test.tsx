import '@testing-library/jest-dom/vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, afterEach } from 'vitest';
import { MetricsTable } from '../../src/react/MetricsTable.js';

afterEach(cleanup);

const samplePerProcess = [
  { id: 'P1', completion: 3, turnaround: 3, waiting: 0, response: 0 },
  { id: 'P2', completion: 5, turnaround: 3, waiting: 1, response: 1 },
];
const sampleAggregate = {
  avgWaiting: 0.5,
  avgTurnaround: 3,
  cpuUtilization: 1,
  throughput: 0.4,
};

describe('T-28 — MetricsTable: coherencia de métricas y estado', () => {
  it('BEHAVIOURS § Coherencia: métricas NO visibles antes del final (atEnd=false)', () => {
    render(
      <MetricsTable
        perProcess={samplePerProcess}
        aggregate={sampleAggregate}
        atEnd={false}
      />,
    );
    expect(screen.queryByTestId('metrics-table')).not.toBeInTheDocument();
  });

  it('BEHAVIOURS § Coherencia: métricas visibles al finalizar el recorrido (atEnd=true)', () => {
    render(
      <MetricsTable
        perProcess={samplePerProcess}
        aggregate={sampleAggregate}
        atEnd={true}
      />,
    );
    expect(screen.getByTestId('metrics-table')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-row-P1')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-row-P2')).toBeInTheDocument();
    expect(screen.getByTestId('avg-waiting')).toHaveTextContent('0.50');
    expect(screen.getByTestId('avg-turnaround')).toHaveTextContent('3.00');
  });

  it('metrics vacío → no muestra columnas', () => {
    render(
      <MetricsTable
        perProcess={samplePerProcess}
        aggregate={sampleAggregate}
        atEnd={true}
        metrics={[]}
      />,
    );
    expect(screen.queryByTestId('metrics-table')).not.toBeInTheDocument();
    expect(screen.getByTestId('metrics-table-empty')).toBeInTheDocument();
  });

  it('metrics filtra columnas: solo waiting visible', () => {
    render(
      <MetricsTable
        perProcess={samplePerProcess}
        aggregate={sampleAggregate}
        atEnd={true}
        metrics={['waiting']}
      />,
    );
    expect(screen.getByTestId('metrics-P1-waiting')).toBeInTheDocument();
    expect(screen.queryByTestId('metrics-P1-turnaround')).not.toBeInTheDocument();
  });
});
