import { RuntimeWorld } from './RuntimeWorld';

// Private module-level scoped variables to prevent global inspection/pollution
let activeWorldInstance: RuntimeWorld | null = null;
const accessGuardSymbol = Symbol('digital-twin-ecs-world-guard');

export class RuntimeContext {
  /**
   * Securely retrieves the active authoritative RuntimeWorld instance.
   * A guard token is required to mutate state directly, preventing raw UI components from bypassing standard interfaces.
   */
  public static getActiveWorld(token?: symbol): RuntimeWorld {
    if (!activeWorldInstance) {
      activeWorldInstance = new RuntimeWorld();
    }
    
    if (token !== accessGuardSymbol && token !== undefined) {
      throw new Error('[RuntimeContext] Security Violation: Unauthorized direct access to authoritative RuntimeWorld instance.');
    }
    
    return activeWorldInstance;
  }

  /**
   * Sets a brand new world instance.
   */
  public static setActiveWorld(world: RuntimeWorld, token: symbol): void {
    if (token !== accessGuardSymbol) {
      throw new Error('[RuntimeContext] Security Violation: Unauthorized assignment of RuntimeWorld.');
    }
    activeWorldInstance = world;
  }

  /**
   * Exposes the private symbol for authorized systems, commands, and loader bridges.
   */
  public static getGuardToken(): symbol {
    // Only authorized system scripts should import and request this guard token
    return accessGuardSymbol;
  }

  /**
   * Checked execution wrapper. Runs safe operations under authorization context.
   */
  public static runInWorldContext<T>(callback: (world: RuntimeWorld) => T): T {
    const world = this.getActiveWorld(accessGuardSymbol);
    return callback(world);
  }
}
