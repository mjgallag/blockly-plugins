import * as Blockly from 'blockly/core';
import {BlockPositioner} from './block-positioner';
import {
  ConnectionStrategy,
  ConnectionContext,
  ConnectionResult,
  StatementSequenceConnector,
  ValueInputConnector,
  StatementInsertionConnector,
  WrapperConnector
} from './connection-strategies';

export interface SmartPositioningConfig {
  enableAutoConnection?: boolean;
  connectionRadius?: number;
  maxNearbyBlocks?: number;
  strategies?: ConnectionStrategy[];
}

/**
 * Enhanced block positioner that attempts intelligent connections.
 */
export class SmartBlockPositioner extends BlockPositioner {
  private config: Required<SmartPositioningConfig>;
  private connectionStrategies: ConnectionStrategy[];

  constructor(workspace: Blockly.WorkspaceSvg, config: SmartPositioningConfig = {}) {
    super(workspace);

    this.config = {
      enableAutoConnection: config.enableAutoConnection ?? true,
      connectionRadius: config.connectionRadius ?? 200,
      maxNearbyBlocks: config.maxNearbyBlocks ?? 10,
      strategies: config.strategies ?? this.getDefaultStrategies()
    };

    this.connectionStrategies = this.config.strategies.sort((a, b) => b.priority - a.priority);
  }

  private getDefaultStrategies(): ConnectionStrategy[] {
    return [
      new StatementSequenceConnector(),
      new ValueInputConnector(),
      new StatementInsertionConnector(),
      new WrapperConnector()
    ];
  }

  positionAndConnect(
    block: Blockly.BlockSvg,
    clientX?: number,
    clientY?: number,
    context?: ConnectionContext
  ): ConnectionResult | null {
    this.positionBlock(block, clientX, clientY);
    if (!this.config.enableAutoConnection) {
      return null;
    }
    const connectionContext = this.buildConnectionContext(block, clientX, clientY, context);
    return this.attemptConnection(block, connectionContext);
  }

  /**
   * Build connection context for decision making.
   */
  private buildConnectionContext(
    newBlock: Blockly.BlockSvg,
    clientX?: number,
    clientY?: number,
    providedContext?: ConnectionContext
  ): ConnectionContext {
    const context: ConnectionContext = {
      ...providedContext
    };

    if (!context.selectedBlock) {
      const selected = Blockly.common.getSelected();
      if (selected && selected instanceof Blockly.BlockSvg) {
        context.selectedBlock = selected;
      }
    }

    if (clientX !== undefined && clientY !== undefined) {
      context.cursorPosition = {x: clientX, y: clientY};
    }

    if (!context.nearbyBlocks) {
      context.nearbyBlocks = this.findNearbyBlocks(newBlock, context.cursorPosition);
    }

    return context;
  }

  private attemptConnection(newBlock: Blockly.BlockSvg, context: ConnectionContext): ConnectionResult | null {
    // Get potential target blocks in priority order
    const targetBlocks = this.getPriorizedTargetBlocks(context);

    for (const targetBlock of targetBlocks) {
      for (const strategy of this.connectionStrategies) {
        if (strategy.canConnect(newBlock, targetBlock, context)) {
          console.debug(`Attempting connection with strategy: ${strategy.name}`);
          const result = strategy.connect(newBlock, targetBlock, context);
          if (result.success) {
            console.debug(`Successfully connected using strategy: ${strategy.name}`);
            return result;
          } else {
            console.debug(`Connection failed with strategy ${strategy.name}: ${result.reason}`);
          }
        }
      }
    }

    console.debug('No suitable connection found for new block');
    return null;
  }

  private getPriorizedTargetBlocks(context: ConnectionContext): Blockly.BlockSvg[] {
    const targets: Blockly.BlockSvg[] = [];

    // Priority 1: Selected block
    if (context.selectedBlock) {
      targets.push(context.selectedBlock);
    }

    // Priority 2: Nearby blocks (sorted by distance)
    if (context.nearbyBlocks) {
      // Filter out selected block to avoid duplicates
      const nearbyUnselected = context.nearbyBlocks.filter(
        block => block !== context.selectedBlock
      );
      targets.push(...nearbyUnselected);
    }

    return [...new Set(targets)];
  }

  private findNearbyBlocks(
    newBlock: Blockly.BlockSvg,
    cursorPosition?: {x: number, y: number}
  ): Blockly.BlockSvg[] {
    const newBlockPosition = newBlock.getRelativeToSurfaceXY();
    const searchPosition = cursorPosition ?
      this.clientToWorkspaceCoordinates(cursorPosition.x, cursorPosition.y) :
      newBlockPosition;

    const allBlocks = this.workspace.getAllBlocks(false);
    const nearbyBlocks: Array<{block: Blockly.BlockSvg, distance: number}> = [];

    for (const block of allBlocks) {
      if (block === newBlock) continue; // Skip the new block itself

      const blockPosition = block.getRelativeToSurfaceXY();
      const distance = this.calculateDistance(searchPosition, blockPosition);

      if (distance <= this.config.connectionRadius) {
        nearbyBlocks.push({block, distance});
      }
    }

    // Sort by distance and limit results
    nearbyBlocks.sort((a, b) => a.distance - b.distance);

    return nearbyBlocks
      .slice(0, this.config.maxNearbyBlocks)
      .map(item => item.block);
  }

  private clientToWorkspaceCoordinates(clientX: number, clientY: number): {x: number, y: number} {
    const metrics = this.workspace.getMetrics();
    const divRect = this.workspace.getInjectionDiv().getBoundingClientRect();

    const x = (clientX - divRect.left) / this.workspace.scale + metrics.viewLeft;
    const y = (clientY - divRect.top) / this.workspace.scale + metrics.viewTop;

    return {x, y};
  }

  private calculateDistance(point1: {x: number, y: number}, point2: {x: number, y: number}): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  positionBlock(block: Blockly.BlockSvg, clientX?: number, clientY?: number): void {
    super.positionBlock(block, clientX, clientY);
    if (this.config.enableAutoConnection) {
      this.attemptConnection(block, this.buildConnectionContext(block, clientX, clientY));
    }
  }

  setConfig(newConfig: Partial<SmartPositioningConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };

    if (newConfig.strategies) {
      this.connectionStrategies = newConfig.strategies.sort((a, b) => b.priority - a.priority);
    }
  }

  getConfig(): SmartPositioningConfig {
    return {...this.config};
  }

  connectBlock(block: Blockly.BlockSvg, context?: ConnectionContext): ConnectionResult | null {
    const connectionContext = this.buildConnectionContext(block, undefined, undefined, context);
    return this.attemptConnection(block, connectionContext);
  }
}