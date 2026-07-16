import { logger } from '../../shared/logger'

type Listener = (...args: any[]) => void

class EventBus {
  private listeners = new Map<string, Set<Listener>>()

  on(event: string, fn: Listener) {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set())
    this.listeners.get(event)!.add(fn)
    return () => this.listeners.get(event)?.delete(fn)
  }

  emit(event: string, ...args: any[]) {
    this.listeners.get(event)?.forEach(fn => {
      try { fn(...args) } catch (e) { logger.error('EventBus error', { event, error: String(e) }) }
    })
  }

  removeAll() {
    this.listeners.clear()
  }
}

export const eventBus = new EventBus()
