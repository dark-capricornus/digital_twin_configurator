export type BindingTopic = string;

export interface IBindingAdapter {
  protocol: string;
  connect(url: string): Promise<void>;
  subscribe(topic: BindingTopic): void;
  unsubscribe(topic: BindingTopic): void;
  disconnect(): void;
  onMessage(callback: (topic: BindingTopic, payload: any) => void): void;
}

class BindingManagerImpl {
  private adapters = new Map<string, IBindingAdapter>();
  private latestValues = new Map<BindingTopic, any>();
  private subscriptions = new Map<BindingTopic, number>();

  public registerAdapter(adapter: IBindingAdapter): void {
    this.adapters.set(adapter.protocol, adapter);
    adapter.onMessage(this.handleIncomingMessage);
  }

  public subscribe(protocol: string, topic: BindingTopic): void {
    const currentCount = this.subscriptions.get(topic) || 0;
    this.subscriptions.set(topic, currentCount + 1);

    if (currentCount === 0) {
      const adapter = this.adapters.get(protocol);
      if (adapter) {
        adapter.subscribe(topic);
      } else {
        console.warn(`[BindingManager] No adapter found for protocol: ${protocol}`);
      }
    }
  }

  public unsubscribe(protocol: string, topic: BindingTopic): void {
    const currentCount = this.subscriptions.get(topic) || 0;
    if (currentCount <= 1) {
      this.subscriptions.delete(topic);
      this.adapters.get(protocol)?.unsubscribe(topic);
      this.latestValues.delete(topic);
    } else {
      this.subscriptions.set(topic, currentCount - 1);
    }
  }

  private handleIncomingMessage = (topic: BindingTopic, payload: any): void => {
    // Cache the latest value for the ECS BindingSystem to pick up on its next tick
    this.latestValues.set(topic, payload);
  };

  /**
   * Called by the BindingSystem to get the latest cached values.
   */
  public getLatestValue(topic: BindingTopic): any {
    return this.latestValues.get(topic);
  }
}

export const BindingManager = new BindingManagerImpl();
