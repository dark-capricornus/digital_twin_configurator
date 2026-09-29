export interface ComponentSchema {
  type: string;
  defaults: Record<string, any>;
}

export class RuntimeRegistry {
  private static schemas = new Map<string, ComponentSchema>();

  static {
    // Register core component schemas with defaults
    this.registerSchema({
      type: 'Transform',
      defaults: {
        position: [0, 0, 0],
        rotation: [0, 0, 0],
        scale: [1, 1, 1],
      },
    });

    this.registerSchema({
      type: 'Render',
      defaults: {
        visible: true,
        castShadow: true,
        receiveShadow: true,
        color: '#cccccc',
      },
    });

    this.registerSchema({
      type: 'Binding',
      defaults: {
        topic: '',
        protocol: 'mqtt',
        datatype: 'float',
        targetProperty: '',
        updateMode: 'realtime',
      },
    });

    this.registerSchema({
      type: 'Animation',
      defaults: {
        clipIds: [],
        activeClipId: undefined,
        speed: 1.0,
        time: 0.0,
        loop: true,
      },
    });
  }

  public static registerSchema(schema: ComponentSchema): void {
    this.schemas.set(schema.type, schema);
  }

  public static getSchema(type: string): ComponentSchema | undefined {
    return this.schemas.get(type);
  }

  public static getRegisteredTypes(): string[] {
    return Array.from(this.schemas.keys());
  }

  public static createDefaultComponent(type: string, entityId: string): Record<string, any> | null {
    const schema = this.schemas.get(type);
    if (!schema) return null;
    return {
      type,
      entityId,
      ...JSON.parse(JSON.stringify(schema.defaults)),
    };
  }
}
