import * as Blockly from 'blockly/core';

/**
 * Utility class for creating blocks from type identifiers.
 */
export class BlockFactory {
  constructor(private readonly workspace: Blockly.WorkspaceSvg) {}

  /**
   * Creates and renders a block from a type identifier.
   * @param value - The block type or typeblock identifier
   * @returns The created block or undefined if no block type found
   */
  createBlock(value: string): Blockly.BlockSvg | undefined {
    let blockType = value;
    if (!Blockly.Blocks[blockType]) {
      for (const t in Blockly.Blocks) {
        if (Blockly.Blocks[t].typeblock === value) {
          blockType = t;
          break;
        }
      }
    }
    if (!Blockly.Blocks[blockType]) {
      console.warn(`No block registered for "${value}"`);
      return;
    }

    const block = this.workspace.newBlock(blockType);
    block.initSvg();
    block.render();
    return block;
  }
}