import * as Blockly from 'blockly/core';
import {Option, OptionGenerator, ScopeAnalyzer} from '../types';

/**
 * Generates dynamic options from workspace state including variables, procedures, and blocks.
 */
export class WorkspaceOptionGenerator implements OptionGenerator {
  private scopeAnalyzer?: ScopeAnalyzer;

  constructor(private readonly workspace: Blockly.WorkspaceSvg) {}

  setScopeAnalyzer(analyzer: ScopeAnalyzer): void {
    this.scopeAnalyzer = analyzer;
  }

  generateOptions(): Option[] {
    const options: Option[] = [];

    options.push(...this.getBuiltinBlockOptions());
    options.push(...this.getVariableOptions());
    options.push(...this.getProcedureOptions());

    return [...new Set(options)];
  }

  getVariableOptions(): Option[] {
    const options: Option[] = [];

    // Global variables
    const variables = this.workspace.getVariablesOfType('');
    for (const variable of variables) {
      const name = variable.getName();
      options.push(`get ${name}`);
      options.push(`set ${name} to`);
    }

    // Local variables (mostly for procedures, but can be extended)
    if (this.scopeAnalyzer) {
      const localVars = this.scopeAnalyzer.getLocalVariablesInScope();
      console.log('Local variables in scope:', localVars);
      for (const varName of localVars) {
        options.push(`get ${varName}`);
        options.push(`set ${varName} to`);
      }
    }

    return options;
  }

  getProcedureOptions(): Option[] {
    const options: Option[] = [];

    const allBlocks = this.workspace.getAllBlocks(false);

    for (const block of allBlocks) {
      if (block.type === 'procedures_defnoreturn' || block.type === 'procedures_defreturn') {
        const nameField = block.getField('NAME');
        if (nameField) {
          const procName = nameField.getValue();
          if (procName && procName.trim()) {
            options.push(procName);

            const paramNames = this.getProcedureParameters(block);
            if (paramNames.length > 0) {
              options.push(`${procName}(${paramNames.join(', ')})`);
            }
          }
        }
      }
    }

    return options;
  }

  getBuiltinBlockOptions(): Option[] {
    const options: Option[] = [];

    for (const blockType in Blockly.Blocks) {
      const blockDefinition = Blockly.Blocks[blockType];

      if (this.shouldSkipBlock(blockType)) {
        continue;
      }

      if (blockDefinition.typeblock) {
        options.push(blockDefinition.typeblock);
      } else if (this.isValidBuiltinBlock(blockType)) {
        options.push(blockType);
      }
    }

    return options;
  }

  // TODO: check if these are not already showing as local variables
  private getProcedureParameters(block: Blockly.BlockSvg): string[] {
    const params: string[] = [];

    if ((block as any).getVars) {
      const vars = (block as any).getVars();
      params.push(...vars);
    }

    return params;
  }

  private shouldSkipBlock(blockType: string): boolean {
    // Skip internal/utility blocks
    const skipPatterns = [
      /^procedures_/, // Procedure definition blocks (not calls)
      /^variables_get$/, // Raw variable blocks (we generate custom options)
      /^variables_set$/,
      /^_/, // Internal blocks starting with underscore
    ];

    return skipPatterns.some(pattern => pattern.test(blockType));
  }

  private isValidBuiltinBlock(blockType: string): boolean {
    const blockDefinition = Blockly.Blocks[blockType];
    if (!blockDefinition) {
      return false;
    }
    return true;
  }
}