import type { IBindingAdapter, BindingTopic } from '../BindingManager';

export class MqttAdapter implements IBindingAdapter {
  public protocol = 'mqtt';
  private callback?: (topic: BindingTopic, payload: any) => void;
  private connected = false;

  public async connect(url: string): Promise<void> {
    console.info(`[MqttAdapter] Connecting to MQTT broker at ${url}...`);
    // Stub: import * as mqtt from 'mqtt'; this.client = mqtt.connect(url);
    this.connected = true;
    
    // Stub simulated incoming data
    setInterval(() => {
      if (this.connected && this.callback) {
        this.callback('factory/furnace/temp', Math.random() * 100 + 500);
      }
    }, 1000);
  }

  public subscribe(topic: BindingTopic): void {
    console.info(`[MqttAdapter] Subscribing to ${topic}`);
  }

  public unsubscribe(topic: BindingTopic): void {
    console.info(`[MqttAdapter] Unsubscribing from ${topic}`);
  }

  public disconnect(): void {
    console.info('[MqttAdapter] Disconnecting');
    this.connected = false;
  }

  public onMessage(callback: (topic: BindingTopic, payload: any) => void): void {
    this.callback = callback;
  }
}
