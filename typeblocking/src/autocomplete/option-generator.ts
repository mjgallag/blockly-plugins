import * as Blockly from 'blockly/core';
import {Option, OptionGenerator, ScopeAnalyzer} from '../types';

/**
 * Converts a block type identifier to a human-friendly display text.
 * Rule: substitute underscores with spaces.
 */
function blockTypeToDisplayText(blockType: string): string {
  return blockType.replace(/_/g, ' ');
}

/**
 * Generates dynamic options from workspace state including variables, procedures, and blocks.
 */
export class WorkspaceOptionGenerator implements OptionGenerator {
  private scopeAnalyzer?: ScopeAnalyzer;

  constructor(protected readonly workspace: Blockly.WorkspaceSvg) {}

  setScopeAnalyzer(analyzer: ScopeAnalyzer): void {
    this.scopeAnalyzer = analyzer;
  }

  generateOptions(): Option[] {
    const options: Option[] = [];

    options.push(...this.getBuiltinBlockOptions());
    options.push(...this.getVariableOptions());
    options.push(...this.getProcedureOptions());

    // Remove duplicates based on both blockType and displayText
    const seen = new Set<string>();
    return options.filter(option => {
      const key = `${option.blockType}:${option.displayText}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  getVariableOptions(): Option[] {
    const options: Option[] = [];

    // Global variables
    const variables = this.workspace.getVariablesOfType('');
    for (const variable of variables) {
      const name = variable.getName();
      options.push({
        blockType: `get ${name}`,
        displayText: `get ${name}`
      });
      options.push({
        blockType: `set ${name} to`,
        displayText: `set ${name} to`
      });
    }

    // Local variables (mostly for procedures, but can be extended)
    if (this.scopeAnalyzer) {
      const localVars = this.scopeAnalyzer.getLocalVariablesInScope();
      console.log('Local variables in scope:', localVars);
      for (const varName of localVars) {
        options.push({
          blockType: `get ${varName}`,
          displayText: `get ${varName}`
        });
        options.push({
          blockType: `set ${varName} to`,
          displayText: `set ${varName} to`
        });
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
            options.push({
              blockType: procName,
              displayText: procName
            });

            const paramNames = this.getProcedureParameters(block);
            if (paramNames.length > 0) {
              const blockTypeWithParams = `${procName}(${paramNames.join(', ')})`;
              options.push({
                blockType: blockTypeWithParams,
                displayText: blockTypeWithParams
              });
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
        // Use the existing typeblock text as display, but block type for creation
        options.push({
          blockType: blockType,
          displayText: blockDefinition.typeblock
        });
      } else if (this.isValidBuiltinBlock(blockType)) {
        // Convert block type to human-friendly display text
        options.push({
          blockType: blockType,
          displayText: blockTypeToDisplayText(blockType)
        });
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
    return Blockly.Blocks[blockType];
  }
}