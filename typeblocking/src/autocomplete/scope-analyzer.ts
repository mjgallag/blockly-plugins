import * as Blockly from 'blockly/core';
import {ScopeAnalyzer} from '../types';

/**
 * Basic scope analyzer for detecting local variables.
 */
export class BasicScopeAnalyzer implements ScopeAnalyzer {
  constructor(private readonly workspace: Blockly.WorkspaceSvg) {}

  /**
   * Get local variables that are in scope at the given position.
   * Since we don't have a selected block context, this returns all procedure parameters
   * from all procedures. This is a conservative approach that ensures availability.
   */
  getLocalVariablesInScope(): string[] {
    // Try selection-based approach first
    const selectionVars = this.getLocalVariablesFromSelection();
    if (selectionVars.length > 0) {
      console.log('Using selection context for local variables:', selectionVars);
      return selectionVars;
    }
    console.log('No selection context available, falling back to all procedure parameters.');

    // Fall back to all procedure parameters
    return this.getAllProcedureParameters();
  }

  /**
   * Get local variables based on currently selected block.
   */
  getLocalVariablesFromSelection(): string[] {
    const enclosingProcedure = this.getEnclosingProcedureFromSelection();
    if (enclosingProcedure) {
      return this.getProcedureParameters(enclosingProcedure);
    }

    return [];
  }

  /**
   * Get all procedure parameters from all procedures (fallback method).
   */
  private getAllProcedureParameters(): string[] {
    const localVars: string[] = [];
    const allBlocks = this.workspace.getAllBlocks(false);

    for (const block of allBlocks) {
      if (this.isProcedureDefinition(block)) {
        localVars.push(...this.getProcedureParameters(block));
      }
    }

    return [...new Set(localVars)];
  }

  /**
   * Find the procedure that encloses the currently selected block.
   * This is more reliable than position-based detection.
   */
  getEnclosingProcedureFromSelection(): Blockly.BlockSvg | null {
    const selectedBlocks = Blockly.common.getSelected();
    if (!selectedBlocks || !(selectedBlocks instanceof Blockly.BlockSvg)) {
      return null;
    }

    return this.findEnclosingProcedure(selectedBlocks);
  }

  /**
   * Walk up the block hierarchy to find an enclosing procedure.
   */
  private findEnclosingProcedure(block: Blockly.BlockSvg): Blockly.BlockSvg | null {
    let currentBlock: Blockly.BlockSvg | null = block;

    while (currentBlock) {
      // Check if current block is a procedure definition
      if (this.isProcedureDefinition(currentBlock)) {
        return currentBlock;
      }

      // Check if current block is inside a procedure's statement input
      const parent = currentBlock.getParent();
      if (parent && this.isProcedureDefinition(parent)) {
        return parent;
      }

      currentBlock = parent;
    }

    return null;
  }

  private getProcedureParameters(block: Blockly.BlockSvg): string[] {
    const params: string[] = [];

    // Handle standard Blockly procedure blocks
    if (this.isProcedureDefinition(block)) {
      // Try to get parameters from the procedure mutator
      if ((block as any).getVars) {
        const vars = (block as any).getVars();
        if (Array.isArray(vars)) {
          params.push(...vars);
        }
      }

      // Alternative method: look for parameter-related fields or inputs
      // This handles cases where getVars() might not be available
      const inputList = block.inputList;
      for (const input of inputList) {
        for (const field of input.fieldRow) {
          // Look for fields that might contain parameter names
          if (field.name && field.name.startsWith('ARG')) {
            const value = field.getValue();
            if (value && typeof value === 'string' && value.trim()) {
              params.push(value.trim());
            }
          }
        }
      }
    }
    return params;
  }

  private isProcedureDefinition(block: Blockly.BlockSvg): boolean {
    return block.type === 'procedures_defnoreturn' ||
           block.type === 'procedures_defreturn';
  }
}

/**
 * TODO: Implement a more sophisticated scope analyzer to use with the lexical variables plugin.
 */
export class LexicalScopeAnalyzer implements ScopeAnalyzer {
  constructor(
    private readonly workspace: Blockly.WorkspaceSvg,
    private readonly lexicalPlugin?: any // Reference to lexical variables plugin
  ) {}

  getLocalVariablesInScope(): string[] {
    // TODO: Implement integration with lexical variables plugin
    // This would provide more sophisticated scope analysis including:
    // - Nested scopes
    // - Block-level variable declarations
    // - Variable shadowing
    // - For-loop variables
    // - Let/do variables

    // For now, fall back to basic analysis
    const basicAnalyzer = new BasicScopeAnalyzer(this.workspace);
    return basicAnalyzer.getLocalVariablesInScope();
  }
}