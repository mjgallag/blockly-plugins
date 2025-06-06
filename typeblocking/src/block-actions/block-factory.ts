import * as Blockly from 'blockly/core';
import {BlockCreationInstruction} from '../input-patterns/pattern-types';

/**
 * Utility class for creating blocks from type identifiers.
 */
export class BlockFactory {
  constructor(protected readonly workspace: Blockly.WorkspaceSvg) {}

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
   * Creates a block from a BlockCreationInstruction. This is for more complex block creation with fields and children.
   * @param instruction - The instruction describing how to create the block
   * @returns The created block or undefined if creation failed
   */
  createBlockFromInstruction(instruction: BlockCreationInstruction): Blockly.BlockSvg | undefined {
    try {
      // Create the main block
      const block = this.workspace.newBlock(instruction.blockType);

      // Set field values
      if (instruction.fieldValues) {
        for (const [fieldName, value] of Object.entries(instruction.fieldValues)) {
          const field = block.getField(fieldName);
          if (field) {
            // Special handling for variable fields
            if (fieldName === 'VAR' && (block.type === 'variables_set' || block.type === 'variables_get')) {
              let variable = this.workspace.getVariable(value);
              if (!variable) {
                // Create the variable if it doesn't exist
                variable = this.workspace.createVariable(value);
              }
              field.setValue(variable.getId());
            } else {
              field.setValue(value);
            }
          }
        }
      }

      // Initialize the block
      block.initSvg();
      block.render();

      // Create and connect child blocks
      if (instruction.children) {
        for (const child of instruction.children) {
          const childBlock = this.createBlockFromInstruction(child.instruction);
          if (childBlock) {
            const input = block.getInput(child.input);
            if (input && childBlock.outputConnection) {
              childBlock.outputConnection.connect(input.connection!);
            }
          }
        }
      }

      return block;
    } catch (error) {
      console.warn(`Failed to create block from instruction:`, error);
      return undefined;
    }
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