import * as Blockly from 'blockly/core';

/**
 * Utility class for positioning blocks in the workspace.
 */
export class BlockPositioner {
  constructor(private readonly workspace: Blockly.WorkspaceSvg) {}

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

    const x = (x_client - divRect.left) / this.workspace.scale + metrics.viewLeft;
    const y = (y_client - divRect.top) / this.workspace.scale + metrics.viewTop;

    block.moveBy(x, y);
    console.log('the new code is running free')
    block.select();
  }
}