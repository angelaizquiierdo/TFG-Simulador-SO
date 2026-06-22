export class FifoQueue<T> {
  private items: T[] = [];

  enqueue(item: T): void {
    this.items.push(item);
  }

  dequeue(): T | undefined {
    return this.items.shift();
  }

  peek(): T | undefined {
    return this.items[0];
  }

  isEmpty(): boolean {
    return this.items.length === 0;
  }

  prepend(item: T): void {
    this.items.unshift(item);
  }

  toArray(): T[] {
    return [...this.items];
  }
}
