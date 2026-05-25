import { EventBus } from '../events';

export interface Command {
  execute(): void;
  undo(): void;
  name?: string;
}

export class TransactionCommand implements Command {
  public name: string;
  private commands: Command[];

  constructor(name: string, commands: Command[]) {
    this.name = name;
    this.commands = commands;
  }

  execute(): void {
    for (const cmd of this.commands) {
      cmd.execute();
    }
  }

  undo(): void {
    // Undo in reverse order
    for (let i = this.commands.length - 1; i >= 0; i--) {
      this.commands[i].undo();
    }
  }
}

export class CommandManager {
  private static instance: CommandManager;
  private history: Command[] = [];
  private historyIndex: number = -1;

  private constructor() {}

  public static getInstance(): CommandManager {
    if (!CommandManager.instance) {
      CommandManager.instance = new CommandManager();
    }
    return CommandManager.instance;
  }

  public executeCommand(command: Command): void {
    command.execute();
    
    // Clear any redo history
    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }
    
    this.history.push(command);
    this.historyIndex++;

    EventBus.emit('COMMAND_EXECUTED', { 
      commandName: command.name || 'UnknownCommand', 
      timestamp: Date.now() 
    });
  }

  public executeTransaction(name: string, commands: Command[]): void {
    const transaction = new TransactionCommand(name, commands);
    this.executeCommand(transaction);
  }

  public undo(): void {
    if (this.historyIndex >= 0) {
      const command = this.history[this.historyIndex];
      command.undo();
      this.historyIndex--;

      EventBus.emit('COMMAND_UNDONE', { 
        commandName: command.name || 'UnknownCommand', 
        timestamp: Date.now() 
      });
    }
  }

  public redo(): void {
    if (this.historyIndex < this.history.length - 1) {
      this.historyIndex++;
      const command = this.history[this.historyIndex];
      command.execute();

      EventBus.emit('COMMAND_REDONE', { 
        commandName: command.name || 'UnknownCommand', 
        timestamp: Date.now() 
      });
    }
  }

  public canUndo(): boolean {
    return this.historyIndex >= 0;
  }

  public canRedo(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  public clear(): void {
    this.history = [];
    this.historyIndex = -1;
  }
}

export const commandManager = CommandManager.getInstance();
