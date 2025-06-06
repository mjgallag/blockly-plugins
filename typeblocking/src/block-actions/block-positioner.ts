import * as Blockly from 'blockly/core';

/**
 * Utility class for positioning blocks in the workspace.
 */
export class BlockPositioner {
  private lastCreationX?: number;
  private lastCreationY?: number;
  private offsetCount = 0;
  private static readonly OFFSET_STEP = 30; // pixels to offset overlapping blocks

  constructor(protected readonly workspace: Blockly.WorkspaceSvg) {}

  /**
   * Positions a block at the specified coordinates or cursor position.
   * @param block - The block to position
   * @param clientX - Optional x coordinate in client space
   * @param clientY - Optional y coordinate in client space  
   */
  positionBlock(block: Blockly.BlockSvg, clientX?: number, clientY?: number): void {
    const metrics = this.workspace.getMetrics();
    const divRect = this.workspace.getInjectionDiv().getBoundingClientRect();

    const x_client = clientX ?? divRect.left + divRect.width / 2;
    const y_client = clientY ?? divRect.top + divRect.height / 2;

    let x = (x_client - divRect.left) / this.workspace.scale + metrics.viewLeft;
    let y = (y_client - divRect.top) / this.workspace.scale + metrics.viewTop;

    // Check if this is the same position as the last creation
    const isSamePosition = this.lastCreationX === x_client && this.lastCreationY === y_client;

    if (isSamePosition) {
      // Offset the block to avoid overlap
      this.offsetCount++;
      const offset = this.offsetCount * BlockPositioner.OFFSET_STEP / this.workspace.scale;
      x += offset;
      y += offset;
    } else {
      // Reset offset counter for new position
      this.offsetCount = 0;
      this.lastCreationX = x_client;
      this.lastCreationY = y_client;
    }

    block.moveBy(x, y);
    block.select();
  }
}