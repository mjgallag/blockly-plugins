/**
 * @license
 * Copyright 2025 App Inventor Foundation
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Plugin to provide TypeBlocking to Blockly. Blocks can be
 * created by typing instead of having to navigate through the toolbox.
 */
import * as Blockly from 'blockly/core';
// import {installFloatingInput} from './floating-input';
// import {installFloatingInput} from './f-input';
import {installFloatingInput} from './autocomplete/autocomplete';

/**
 * Create blocks by typing instead of navigating through the toolbox.
 */
export class TypeBlocking {
  /** The workspace. */
  protected workspace: Blockly.WorkspaceSvg;
  /**
   * Constructor for ...
   * @param workspace The workspace that the plugin will
   *     be added to.
   */
  constructor(workspace: Blockly.WorkspaceSvg) {
    this.workspace = workspace;
  }

  /**
   * Initialize.
   */
  init(): void {
    const allTypeblockTexts = [];
    // FIXME: Quick and dirty way to add typeblocks to all internal blocks
    // except for IF; just for development.
    Blockly.Blocks['controls_if'].typeblock = Blockly.Msg.CONTROLS_IF_MSG_IF;
    for (const blockType in Blockly.Blocks) {
      if (blockType.split('_').length > 1) {
        if (!Blockly.Blocks[blockType].typeblock) {
          Blockly.Blocks[blockType].typeblock = blockType;
        }
        allTypeblockTexts.push(Blockly.Blocks[blockType].typeblock);
      }
    }

    installFloatingInput(this.workspace, {options: allTypeblockTexts});
    console.info('Typeblocking initialized on workspace:', this.workspace.id);
  }
}
