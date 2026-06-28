// @vitest-environment jsdom
/**
 * T-39 — SimulationApp (Orquestador Visual)
 *
 * Cierra: § Render — SimulationApp (Orquestador Visual)
 * Verifica que el layout soporta los modos unificado e intercalado.
 */
import React from 'react';
import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import '@testing-library/jest-dom/vitest';
import { SimulationApp } from '../../src/react/SimulationApp.js';
import type { Process } from '../../src/core/types/process.js';
// Registrar los algoritmos antes de los tests
import '../../src/index.js';

const PROCESSES: readonly Process[] = [
  { id: 'P1', arrival_time: 0, burst_time: 3 },
  { id: 'P2', arrival_time: 1, burst_time: 2 },
];

describe('§ Render — SimulationApp (Orquestador Visual)', () => {
  afterEach(() => { cleanup(); });

  it('renderiza el contenedor raíz con data-testid="simulation-app"', () => {
    render(<SimulationApp algorithm="fcfs" processes={PROCESSES} />);
    expect(screen.getByTestId('simulation-app')).toBeInTheDocument();
  });

  it('modo por defecto es unified (data-mode="unified")', () => {
    render(<SimulationApp algorithm="fcfs" processes={PROCESSES} />);
    expect(screen.getByTestId('simulation-app')).toHaveAttribute('data-mode', 'unified');
  });

  it('modo unified: data-mode="unified"', () => {
    render(
      <SimulationApp algorithm="fcfs" processes={PROCESSES} mode="unified" />,
    );
    expect(screen.getByTestId('simulation-app')).toHaveAttribute('data-mode', 'unified');
  });

  it('modo interleaved: data-mode="interleaved"', () => {
    render(
      <SimulationApp algorithm="fcfs" processes={PROCESSES} mode="interleaved" />,
    );
    expect(screen.getByTestId('simulation-app')).toHaveAttribute('data-mode', 'interleaved');
  });

  it('renderiza los slots de subcomponentes en modo unified (fcfs)', () => {
    render(<SimulationApp algorithm="fcfs" processes={PROCESSES} mode="unified" />);
    // AlgorithmParamsForm solo se renderiza cuando el algoritmo tiene parámetros (T-46)
    expect(screen.queryByTestId('algorithm-params-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('process-table')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    expect(screen.getByTestId('playback-controls')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-table')).toBeInTheDocument();
    expect(screen.getByTestId('process-form')).toBeInTheDocument();
  });

  it('renderiza los slots de subcomponentes en modo interleaved (fcfs)', () => {
    render(
      <SimulationApp algorithm="fcfs" processes={PROCESSES} mode="interleaved" />,
    );
    // AlgorithmParamsForm solo se renderiza cuando el algoritmo tiene parámetros (T-46)
    expect(screen.queryByTestId('algorithm-params-form')).not.toBeInTheDocument();
    expect(screen.getByTestId('process-table')).toBeInTheDocument();
    expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
    expect(screen.getByTestId('playback-controls')).toBeInTheDocument();
    expect(screen.getByTestId('metrics-table')).toBeInTheDocument();
    expect(screen.getByTestId('process-form')).toBeInTheDocument();
  });

  it('AlgorithmParamsForm se renderiza con algoritmos que tienen parámetros (round-robin)', () => {
    render(
      <SimulationApp
        algorithm="round-robin"
        processes={PROCESSES}
        params={{ quantum: 2 }}
        mode="unified"
      />,
    );
    expect(screen.getByTestId('algorithm-params-form')).toBeInTheDocument();
  });

  it('acepta className adicional y lo añade al contenedor', () => {
    render(
      <SimulationApp
        algorithm="fcfs"
        processes={PROCESSES}
        className="mi-clase-custom"
      />,
    );
    expect(screen.getByTestId('simulation-app').className).toContain('mi-clase-custom');
  });

  it('§ Escenario de ejemplo por defecto: funciona con lista de procesos y algoritmo válidos', () => {
    expect(() =>
      render(<SimulationApp algorithm="fcfs" processes={PROCESSES} />),
    ).not.toThrow();
  });
});
