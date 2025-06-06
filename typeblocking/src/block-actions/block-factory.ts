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
    // First try special variable/procedure patterns
    let block = this.createSpecialBlock(value);
    if (block) {
      return block;
    }

    // Then try standard block type lookup
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

    block = this.workspace.newBlock(blockType);
    block.initSvg();
    block.render();
    return block;
  }

  /**
   * Create special blocks for variables, procedures, etc.
   */
  private createSpecialBlock(value: string): Blockly.BlockSvg | undefined {
    // Handle variable getters: "get variableName"
    const getVarMatch = value.match(/^get\s+(.+)$/);
    if (getVarMatch) {
      return this.createVariableGetter(getVarMatch[1]);
    }

    // Handle variable setters: "set variableName to"
    const setVarMatch = value.match(/^set\s+(.+?)\s+to$/);
    if (setVarMatch) {
      return this.createVariableSetter(setVarMatch[1]);
    }

    // Handle procedure calls: "procedureName" or "procedureName(params)"
    const procMatch = value.match(/^([^(]+)(?:\([^)]*\))?$/);
    if (procMatch && this.isProcedureName(procMatch[1].trim())) {
      return this.createProcedureCall(procMatch[1].trim());
    }

    return undefined;
  }

  /**
   * Create a variable getter block.
   */
  private createVariableGetter(variableName: string): Blockly.BlockSvg | undefined {
    const variable = this.workspace.getVariable(variableName);
    if (!variable) {
      console.warn(`Variable "${variableName}" not found`);
      return undefined;
    }

    const block = this.workspace.newBlock('variables_get');
    block.getField('VAR')?.setValue(variable.getId());
    block.initSvg();
    block.render();
    return block;
  }

  /**
   * Create a variable setter block.
   */
  private createVariableSetter(variableName: string): Blockly.BlockSvg | undefined {
    const variable = this.workspace.getVariable(variableName);
    if (!variable) {
      console.warn(`Variable "${variableName}" not found`);
      return undefined;
    }

    const block = this.workspace.newBlock('variables_set');
    block.getField('VAR')?.setValue(variable.getId());
    block.initSvg();
    block.render();
    return block;
  }

  private createProcedureCall(procedureName: string): Blockly.BlockSvg | undefined {
    // Find the procedure definition to determine if it has a return value
    const allBlocks = this.workspace.getAllBlocks(false);
    let hasReturn = false;

    for (const block of allBlocks) {
      if ((block.type === 'procedures_defnoreturn' || block.type === 'procedures_defreturn') &&
          block.getField('NAME')?.getValue() === procedureName) {
        hasReturn = block.type === 'procedures_defreturn';
        break;
      }
    }

    const blockType = hasReturn ? 'procedures_callreturn' : 'procedures_callnoreturn';
    const block = this.workspace.newBlock(blockType);

    block.getField('NAME')?.setValue(procedureName);

    block.initSvg();
    block.render();
    return block;
  }

  private isProcedureName(name: string): boolean {
    const allBlocks = this.workspace.getAllBlocks(false);

    for (const block of allBlocks) {
      if ((block.type === 'procedures_defnoreturn' || block.type === 'procedures_defreturn') &&
          block.getField('NAME')?.getValue() === name) {
        return true;
      }
    }

    return false;
  }
}