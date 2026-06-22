import { describe, it, expect } from 'vitest';
import { FifoQueue } from '../../../../src/core/algorithms/shared/fifo-queue.js';

describe('FifoQueue', () => {
  it('empieza vacía', () => {
    const q = new FifoQueue<string>();
    expect(q.isEmpty()).toBe(true);
  });

  it('enqueue y dequeue en orden FIFO', () => {
    const q = new FifoQueue<string>();
    q.enqueue('a');
    q.enqueue('b');
    q.enqueue('c');
    expect(q.dequeue()).toBe('a');
    expect(q.dequeue()).toBe('b');
    expect(q.dequeue()).toBe('c');
    expect(q.isEmpty()).toBe(true);
  });

  it('peek devuelve el primer elemento sin extraerlo', () => {
    const q = new FifoQueue<number>();
    q.enqueue(1);
    q.enqueue(2);
    expect(q.peek()).toBe(1);
    expect(q.peek()).toBe(1);
  });

  it('dequeue en cola vacía devuelve undefined', () => {
    const q = new FifoQueue<string>();
    expect(q.dequeue()).toBeUndefined();
  });

  it('prepend inserta al inicio', () => {
    const q = new FifoQueue<string>();
    q.enqueue('b');
    q.prepend('a');
    expect(q.dequeue()).toBe('a');
    expect(q.dequeue()).toBe('b');
  });

  it('toArray devuelve copia del estado actual', () => {
    const q = new FifoQueue<string>();
    q.enqueue('x');
    q.enqueue('y');
    const arr = q.toArray();
    expect(arr).toEqual(['x', 'y']);
    arr.push('z');
    expect(q.toArray()).toEqual(['x', 'y']);
  });
});
