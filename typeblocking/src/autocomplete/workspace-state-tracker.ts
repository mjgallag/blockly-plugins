import * as Blockly from 'blockly/core';
import {WorkspaceStateTracker} from '../types';

/**
 * Tracks workspace state changes and manages cache invalidation for option generation.
 */
export class DefaultWorkspaceStateTracker implements WorkspaceStateTracker {
  private _needsReload = true;
  private eventListeners: (() => void)[] = [];

  constructor(private readonly workspace: Blockly.WorkspaceSvg) {
    this.setupEventListeners();
  }

  get needsReload(): boolean {
    return this._needsReload;
  }

  invalidate(reason: string): void {
    if (!this._needsReload) {
      console.debug(`TypeBlocking options invalidated: ${reason}`);
      this._needsReload = true;
    }
  }

  // Mark cache as fresh (called after options are regenerated).
  markReloaded(): void {
    this._needsReload = false;
  }

  dispose(): void {
    // Remove all event listeners
    this.eventListeners.forEach(removeListener => removeListener());
    this.eventListeners = [];
  }

  /**
   * Set up event listeners for workspace state changes.
   */
  private setupEventListeners(): void {

    this.addEventHandler(Blockly.Events.VAR_CREATE, 'variable created');
    this.addEventHandler(Blockly.Events.VAR_DELETE, 'variable deleted');
    this.addEventHandler(Blockly.Events.VAR_RENAME, 'variable renamed');

    this.addEventHandler(Blockly.Events.BLOCK_CREATE, (event: Blockly.Events.Abstract) => {
      this.handleBlockEvent(event as Blockly.Events.BlockCreate);
    });
    this.addEventHandler(Blockly.Events.BLOCK_DELETE, (event: Blockly.Events.Abstract) => {
      this.handleBlockEvent(event as Blockly.Events.BlockDelete);
    });
    this.addEventHandler(Blockly.Events.BLOCK_CHANGE, (event: Blockly.Events.Abstract) => {
      this.handleBlockChangeEvent(event as Blockly.Events.BlockChange);
    });
    this.addEventHandler(Blockly.Events.FINISHED_LOADING, 'workspace loaded');
    this.addWorkspaceChangeListener();
  }

  private addEventHandler(_eventType: any, reason: string | ((event: Blockly.Events.Abstract) => void)): void {
    const handler = (event: Blockly.Events.Abstract) => {
      if (event.workspaceId !== this.workspace.id) {
        return; // Ignore events from other workspaces
      }

      if (typeof reason === 'string') {
        this.invalidate(reason);
      } else {
        reason(event);
      }
    };

    this.workspace.addChangeListener(handler);
    this.eventListeners.push(() => {
      this.workspace.removeChangeListener(handler);
    });
  }

  private handleBlockEvent(event: Blockly.Events.BlockCreate | Blockly.Events.BlockDelete): void {
    const blockType = (event as any).type;
    if (!blockType) return;

    if (this.isProcedureBlock(blockType)) {
      this.invalidate(`procedure block ${blockType}`);
    }
  }

  private handleBlockChangeEvent(event: Blockly.Events.BlockChange): void {
    const block = this.workspace.getBlockById(event.blockId!);
    if (!block) return;

    // Check if it's a procedure name change
    if (this.isProcedureBlock(block.type) && event.element === 'field' && event.name === 'NAME') {
      this.invalidate(`procedure name changed from ${event.oldValue} to ${event.newValue}`);
    }
  }

  private addWorkspaceChangeListener(): void {
    let changeTimeout: NodeJS.Timeout | null = null;

    const handler = (event: Blockly.Events.Abstract) => {
      if (event.workspaceId !== this.workspace.id) {
        return;
      }

      // Debounce rapid changes
      if (changeTimeout) {
        clearTimeout(changeTimeout);
      }

      changeTimeout = setTimeout(() => {
        // This catches any changes we might have missed
        if (this.shouldInvalidateForGeneralChange(event)) {
          this.invalidate('workspace change');
        }
        changeTimeout = null;
      }, 100);
    };

    this.workspace.addChangeListener(handler);
    this.eventListeners.push(() => {
      this.workspace.removeChangeListener(handler);
      if (changeTimeout) {
        clearTimeout(changeTimeout);
      }
    });
  }

  private isProcedureBlock(blockType: string): boolean {
    return blockType === 'procedures_defnoreturn' ||
           blockType === 'procedures_defreturn' ||
           blockType === 'procedures_callnoreturn' ||
           blockType === 'procedures_callreturn';
  }

  private shouldInvalidateForGeneralChange(event: Blockly.Events.Abstract): boolean {
    // For now, be conservative and invalidate on most changes
    // This can be optimized later based on specific event types

    const eventTypesToIgnore = [
      'selected',
      'click',
      'theme_change',
      'viewport_change',
    ];

    return !eventTypesToIgnore.includes(event.type);
  }
}