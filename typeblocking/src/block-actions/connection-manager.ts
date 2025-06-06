import * as Blockly from 'blockly/core';
import {
  ConnectionStrategy,
  ConnectionContext,
  ConnectionResult,
  StatementSequenceConnector,
  ValueInputConnector,
  StatementInsertionConnector,
  WrapperConnector
} from './connection-strategies';

export interface ConnectionConfig {
  enableAutoConnection?: boolean;
  connectionRadius?: number;
  maxNearbyBlocks?: number;
  strategies?: ConnectionStrategy[];
}

/**
 * Manages smart block connections using configurable strategies.
 */
export class ConnectionManager {
  private config: Required<ConnectionConfig>;
  private connectionStrategies: ConnectionStrategy[];

  constructor(
    private readonly workspace: Blockly.WorkspaceSvg,
    config: ConnectionConfig = {}
  ) {
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

  /**
   * Attempt to connect a block using smart connection strategies.
   */
  attemptConnection(
    newBlock: Blockly.BlockSvg,
    clientX?: number,
    clientY?: number,
    context?: ConnectionContext
  ): ConnectionResult | null {
    if (!this.config.enableAutoConnection) {
      return null;
    }

    const connectionContext = this.buildConnectionContext(newBlock, clientX, clientY, context);
    return this.findAndMakeConnection(newBlock, connectionContext);
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

  private findAndMakeConnection(newBlock: Blockly.BlockSvg, context: ConnectionContext): ConnectionResult | null {
    // Get potential target blocks in priority order
    const targetBlocks = this.getPriorizedTargetBlocks(newBlock, context);

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

  private getPriorizedTargetBlocks(newBlock: Blockly.BlockSvg, context: ConnectionContext): Blockly.BlockSvg[] {
    const targets: Blockly.BlockSvg[] = [];

    // Priority 1: Selected block
    if (context.selectedBlock) {
      targets.push(context.selectedBlock);
    }

    // Priority 2: Nearby blocks with smart prioritization
    if (context.nearbyBlocks) {
      // Filter out selected block to avoid duplicates
      const nearbyUnselected = context.nearbyBlocks.filter(
        block => block !== context.selectedBlock
      );

      // Smart prioritization: prefer blocks with fewer existing connections
      const smartSorted = nearbyUnselected.sort((a, b) => {
        const valueInputStrategy = this.connectionStrategies.find(s => s.name === 'ValueInput');
        if (!valueInputStrategy) return 0;

        const aCanConnect = valueInputStrategy.canConnect(newBlock, a, context);
        const bCanConnect = valueInputStrategy.canConnect(newBlock, b, context);

        // First priority: blocks that can actually connect
        if (aCanConnect && !bCanConnect) return -1;
        if (!aCanConnect && bCanConnect) return 1;

        // If both can connect, prefer blocks with fewer existing connections (more "empty")
        if (aCanConnect && bCanConnect) {
          const aConnectedInputs = this.countConnectedInputs(a);
          const bConnectedInputs = this.countConnectedInputs(b);

          if (aConnectedInputs !== bConnectedInputs) {
            return aConnectedInputs - bConnectedInputs; // Fewer connections first
          }
        }

        // Fallback: maintain distance-based order
        return 0;
      });

      targets.push(...smartSorted);
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

    const result = nearbyBlocks
      .slice(0, this.config.maxNearbyBlocks)
      .map(item => item.block);

    return result;
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

  private getBlockDistance(block: Blockly.BlockSvg, context: ConnectionContext): number {
    // Get the search position used for nearby block detection
    const blockPosition = block.getRelativeToSurfaceXY();
    const searchPosition = context.cursorPosition ?
      this.clientToWorkspaceCoordinates(context.cursorPosition.x, context.cursorPosition.y) :
      blockPosition;

    return this.calculateDistance(searchPosition, blockPosition);
  }

  private hasAvailableInputConnections(block: Blockly.BlockSvg): boolean {
    // Check if the block has any available (unconnected) input connections
    for (const input of block.inputList) {
      if (input.connection && !input.connection.isConnected()) {
        return true;
      }
    }
    return false;
  }

  private countConnectedInputs(block: Blockly.BlockSvg): number {
    // Count how many input connections are already connected
    let count = 0;
    for (const input of block.inputList) {
      if (input.connection && input.connection.isConnected()) {
        count++;
      }
    }
    return count;
  }

  /**
   * Update configuration.
   */
  setConfig(newConfig: Partial<ConnectionConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig
    };

    if (newConfig.strategies) {
      this.connectionStrategies = newConfig.strategies.sort((a, b) => b.priority - a.priority);
    }
  }

  /**
   * Get current configuration.
   */
  getConfig(): ConnectionConfig {
    return {...this.config};
  }
}