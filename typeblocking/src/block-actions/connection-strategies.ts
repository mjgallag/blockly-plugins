import * as Blockly from 'blockly/core';

/**
 * Context information for making connection decisions.
 */
export interface ConnectionContext {
  selectedBlock?: Blockly.BlockSvg;
  cursorPosition?: {x: number, y: number};
  nearbyBlocks?: Blockly.BlockSvg[];
}

export interface ConnectionResult {
  success: boolean;
  connectionType?: string;
  targetConnection?: Blockly.Connection;
  reason?: string;
}

export interface ConnectionStrategy {
  /**
   * Check if this strategy can connect the new block to the target block.
   */
  canConnect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg, context?: ConnectionContext): boolean;

  /**
   * Attempt to connect the new block to the target block.
   */
  connect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg, context?: ConnectionContext): ConnectionResult;

  /**
   * Priority of this strategy (higher = preferred).
   */
  readonly priority: number;

  /**
   * Name of this strategy for debugging.
   */
  readonly name: string;
}

/**
 * Base class for connection strategies with common utility methods.
 */
export abstract class BaseConnectionStrategy implements ConnectionStrategy {
  abstract readonly priority: number;
  abstract readonly name: string;

  abstract canConnect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg, context?: ConnectionContext): boolean;
  abstract connect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg, context?: ConnectionContext): ConnectionResult;

  protected areTypesCompatible(connection1: Blockly.Connection, connection2: Blockly.Connection): boolean {
    if (!connection1 || !connection2) return false;

    const types1 = connection1.getCheck();
    const types2 = connection2.getCheck();

    if (!types1 || !types2) return true;

    return types1.some(type => types2.includes(type));
  }

  protected isConnectionAvailable(connection: Blockly.Connection): boolean {
    return connection && !connection.isConnected();
  }

  protected getWorkspaceScale(workspace: Blockly.WorkspaceSvg): number {
    return workspace.scale || 1;
  }

  protected calculateDistance(point1: {x: number, y: number}, point2: {x: number, y: number}): number {
    const dx = point1.x - point2.x;
    const dy = point1.y - point2.y;
    return Math.sqrt(dx * dx + dy * dy);
  }
}

/**
 * Strategy for connecting blocks in statement sequences.
 * Inserts new blocks after the target block in a statement chain.
 */
export class StatementSequenceConnector extends BaseConnectionStrategy {
  readonly priority = 90;
  readonly name = 'StatementSequence';

  canConnect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): boolean {
    const newBlockPrevious = newBlock.previousConnection;
    if (!newBlockPrevious) return false;

    const targetNext = targetBlock.nextConnection;
    if (!targetNext || targetNext.isConnected()) return false;

    return this.areTypesCompatible(newBlockPrevious, targetNext);
  }

  connect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): ConnectionResult {
    const newBlockPrevious = newBlock.previousConnection;
    const targetNext = targetBlock.nextConnection;

    if (!this.canConnect(newBlock, targetBlock)) {
      return {
        success: false,
        reason: 'Blocks not compatible for statement sequence connection'
      };
    }

    try {
      newBlockPrevious!.connect(targetNext!);

      return {
        success: true,
        connectionType: 'statement_sequence',
        targetConnection: targetNext!
      };
    } catch (error) {
      return {
        success: false,
        reason: `Connection failed: ${error}`
      };
    }
  }
}

/**
 * Strategy for connecting blocks as value inputs.
 * Connects output blocks to input connections.
 */
export class ValueInputConnector extends BaseConnectionStrategy {
  readonly priority = 80;
  readonly name = 'ValueInput';

  canConnect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): boolean {
    // Check if new block has an output connection
    const newBlockOutput = newBlock.outputConnection;
    if (!newBlockOutput) return false;

    const compatibleInput = this.findCompatibleInput(newBlock, targetBlock);
    return compatibleInput !== null;
  }

  connect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): ConnectionResult {
    const newBlockOutput = newBlock.outputConnection;
    if (!newBlockOutput) {
      return {
        success: false,
        reason: 'New block has no output connection'
      };
    }

    const compatibleInput = this.findCompatibleInput(newBlock, targetBlock);
    if (!compatibleInput) {
      return {
        success: false,
        reason: 'No compatible input connection found'
      };
    }

    try {
      newBlockOutput.connect(compatibleInput);

      return {
        success: true,
        connectionType: 'value_input',
        targetConnection: compatibleInput
      };
    } catch (error) {
      return {
        success: false,
        reason: `Connection failed: ${error}`
      };
    }
  }

  private findCompatibleInput(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): Blockly.Connection | null {
    const newBlockOutput = newBlock.outputConnection;
    if (!newBlockOutput) return null;

    for (const input of targetBlock.inputList) {
      if (input.connection &&
          this.isConnectionAvailable(input.connection) &&
          this.areTypesCompatible(newBlockOutput, input.connection)) {
        return input.connection;
      }
    }

    return null;
  }
}

/**
 * Strategy for inserting blocks before the target block.
 * Inserts new blocks before the target block in a statement chain.
 */
export class StatementInsertionConnector extends BaseConnectionStrategy {
  readonly priority = 70;
  readonly name = 'StatementInsertion';

  canConnect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): boolean {
    const newBlockNext = newBlock.nextConnection;
    const newBlockPrevious = newBlock.previousConnection;
    if (!newBlockNext || !newBlockPrevious) return false;

    const targetPrevious = targetBlock.previousConnection;
    if (!targetPrevious) return false;

    return this.areTypesCompatible(newBlockNext, targetPrevious) &&
           this.areTypesCompatible(newBlockPrevious, targetPrevious);
  }

  connect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): ConnectionResult {
    const newBlockNext = newBlock.nextConnection;
    const newBlockPrevious = newBlock.previousConnection;
    const targetPrevious = targetBlock.previousConnection;

    if (!this.canConnect(newBlock, targetBlock)) {
      return {
        success: false,
        reason: 'Blocks not compatible for statement insertion'
      };
    }

    try {
      // If target block is connected to something above, we need to insert between them
      const targetParentConnection = targetPrevious!.targetConnection;

      if (targetParentConnection) {
        targetPrevious!.disconnect();
        newBlockPrevious!.connect(targetParentConnection);
      }

      newBlockNext!.connect(targetPrevious!);

      return {
        success: true,
        connectionType: 'statement_insertion',
        targetConnection: targetPrevious!
      };
    } catch (error) {
      return {
        success: false,
        reason: `Connection failed: ${error}`
      };
    }
  }
}

/**
 * Strategy for wrapping existing blocks with control structures.
 * Useful for wrapping blocks with if-statements, loops, etc.
 */
export class WrapperConnector extends BaseConnectionStrategy {
  readonly priority = 60;
  readonly name = 'Wrapper';

  canConnect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): boolean {
    const statementInputs = this.getStatementInputs(newBlock);
    if (statementInputs.length === 0) return false;

    const targetPrevious = targetBlock.previousConnection;
    if (!targetPrevious) return false;

    return this.areTypesCompatible(targetPrevious, statementInputs[0]);
  }

  connect(newBlock: Blockly.BlockSvg, targetBlock: Blockly.BlockSvg): ConnectionResult {
    const statementInputs = this.getStatementInputs(newBlock);
    const targetPrevious = targetBlock.previousConnection;

    if (!this.canConnect(newBlock, targetBlock)) {
      return {
        success: false,
        reason: 'Blocks not compatible for wrapping'
      };
    }

    try {
      const targetParentConnection = targetPrevious!.targetConnection;

      if (targetParentConnection) {
        targetPrevious!.disconnect();

        const newBlockPrevious = newBlock.previousConnection;
        if (newBlockPrevious && this.areTypesCompatible(newBlockPrevious, targetParentConnection)) {
          newBlockPrevious.connect(targetParentConnection);
        }
      }

      targetPrevious!.connect(statementInputs[0]);

      return {
        success: true,
        connectionType: 'wrapper',
        targetConnection: statementInputs[0]
      };
    } catch (error) {
      return {
        success: false,
        reason: `Connection failed: ${error}`
      };
    }
  }

  /**
   * Get all statement input connections from a block.
   */
  private getStatementInputs(block: Blockly.BlockSvg): Blockly.Connection[] {
    const statementInputs: Blockly.Connection[] = [];

    for (const input of block.inputList) {
      if (input.type === Blockly.inputs.inputTypes.STATEMENT && input.connection) {
        statementInputs.push(input.connection);
      }
    }

    return statementInputs;
  }
}