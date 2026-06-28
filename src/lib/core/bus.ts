import type { AgentEvent } from "./schemas";

type EventHandler = (event: AgentEvent) => void | Promise<void>;

/**
 * Event Bus in-process — patrón pub/sub para comunicación desacoplada entre agentes.
 * Referencia: deterministic orchestration (Clarion 2026) — routing explícito, no negociación LLM.
 */
export class EventBus {
  private handlers = new Map<string, Set<EventHandler>>();
  private history: AgentEvent[] = [];

  subscribe(eventType: string, handler: EventHandler): () => void {
    if (!this.handlers.has(eventType)) {
      this.handlers.set(eventType, new Set());
    }
    this.handlers.get(eventType)!.add(handler);
    return () => this.handlers.get(eventType)?.delete(handler);
  }

  async publish(event: AgentEvent): Promise<void> {
    this.history.push(event);
    const handlers = this.handlers.get(event.type);
    if (!handlers) return;
    await Promise.all([...handlers].map((h) => h(event)));
  }

  getHistory(): AgentEvent[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
  }
}

export const globalEventBus = new EventBus();
