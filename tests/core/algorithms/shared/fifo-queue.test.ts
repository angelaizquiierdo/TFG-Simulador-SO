import { describe, it, expect } from 'vitest';
import { FifoQueue } from '../../../../src/core/algorithms/shared/fifo-queue.js';

describe('FifoQueue', () => {
  it('inicializa vacía', () => {
    const q = new FifoQueue<string>();
    expect(q.isEmpty()).toBe(true);
    expect(q.toArray()).toEqual([]);
  });

  it('peek y dequeue en cola vacía devuelven undefined', () => {
    const q = new FifoQueue<string>();
    expect(q.peek()).toBeUndefined();
    expect(q.dequeue()).toBeUndefined();
    expect(q.isEmpty()).toBe(true);
  });

  it('encola elementos y respeta el orden FIFO', () => {
    const q = new FifoQueue<string>();
    q.enqueue('A');
    q.enqueue('B');
    q.enqueue('C');
    expect(q.isEmpty()).toBe(false);
    expect(q.toArray()).toEqual(['A', 'B', 'C']);
  });

  it('peek no extrae el elemento', () => {
    const q = new FifoQueue<string>();
    q.enqueue('A');
    q.enqueue('B');
    q.enqueue('C');
    expect(q.peek()).toBe('A');
    expect(q.toArray()).toHaveLength(3);
  });

  it('dequeue extrae en orden FIFO', () => {
    const q = new FifoQueue<string>();
    q.enqueue('A');
    q.enqueue('B');
    q.enqueue('C');
    expect(q.dequeue()).toBe('A');
    expect(q.dequeue()).toBe('B');
    expect(q.dequeue()).toBe('C');
    expect(q.isEmpty()).toBe(true);
  });
});
