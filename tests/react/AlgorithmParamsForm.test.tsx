import { describe, it, expect, beforeAll } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { SimulationProvider } from '../../src/react/SimulationProvider.js';
import { AlgorithmParamsForm } from '../../src/react/AlgorithmParamsForm.js';
import { register } from '../../src/core/registry.js';
import { FCFS } from '../../src/core/algorithms/non-preemptive/fcfs.js';
import { RoundRobin } from '../../src/core/algorithms/preemptive/round-robin.js';
import { MultilevelFeedback } from '../../src/core/algorithms/preemptive/multilevel-feedback.js';

beforeAll(() => {
  register(new FCFS());
  register(new RoundRobin());
  register(new MultilevelFeedback());
});

describe('AlgorithmParamsForm — T-44', () => {
  it('no aparece para FCFS (sin parámetros)', () => {
    render(
      <SimulationProvider algorithm="fcfs" processes={[]}>
        <AlgorithmParamsForm />
      </SimulationProvider>,
    );
    expect(screen.queryByText('Parámetros del algoritmo')).toBeNull();
  });

  it('aparece para Round Robin con campo quantum visible', () => {
    render(
      <SimulationProvider
        algorithm="round-robin"
        processes={[]}
        params={{ quantum: 2 }}
      >
        <AlgorithmParamsForm />
      </SimulationProvider>,
    );
    expect(screen.getByText('Parámetros del algoritmo')).toBeTruthy();
    expect(screen.getByLabelText(/quantum/i)).toBeTruthy();
  });

  it('quantum inválido muestra error al aplicar', () => {
    render(
      <SimulationProvider
        algorithm="round-robin"
        processes={[]}
        params={{ quantum: 2 }}
      >
        <AlgorithmParamsForm />
      </SimulationProvider>,
    );
    const input = screen.getByLabelText(/quantum/i);
    fireEvent.change(input, { target: { value: '0' } });
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));
    expect(screen.getByText(/quantum debe ser/i)).toBeTruthy();
  });

  it('quantum válido aplica sin error', () => {
    render(
      <SimulationProvider
        algorithm="round-robin"
        processes={[{ id: 'P1', arrival_time: 0, burst_time: 3 }]}
        params={{ quantum: 2 }}
      >
        <AlgorithmParamsForm />
      </SimulationProvider>,
    );
    const input = screen.getByLabelText(/quantum/i);
    fireEvent.change(input, { target: { value: '3' } });
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));
    expect(screen.queryByText(/quantum debe ser/i)).toBeNull();
  });

  it('MLFQ muestra quanta y boostInterval', () => {
    render(
      <SimulationProvider
        algorithm="mlfq"
        processes={[]}
        params={{ quanta: [2, 4] }}
      >
        <AlgorithmParamsForm />
      </SimulationProvider>,
    );
    expect(screen.getByLabelText(/quanta/i)).toBeTruthy();
    expect(screen.getByLabelText(/boostInterval/i)).toBeTruthy();
  });

  it('boostInterval vacío no es error', () => {
    render(
      <SimulationProvider
        algorithm="mlfq"
        processes={[]}
        params={{ quanta: [2, 4] }}
      >
        <AlgorithmParamsForm />
      </SimulationProvider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /aplicar/i }));
    expect(screen.queryByText(/error/i)).toBeNull();
  });
});
