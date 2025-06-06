import * as Blockly from 'blockly/core';
import {InputPattern} from './pattern-types';

/**
 * Base class for built-in patterns with common utilities.
 */
abstract class BasePattern implements InputPattern {
  abstract readonly name: string;
  abstract readonly pattern: RegExp;
  abstract readonly priority: number;
  abstract readonly description: string;

  abstract createBlock(match: RegExpMatchArray, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null;

  /**
   * Helper method to create and initialize a block.
   */
  protected createAndInitializeBlock(workspace: Blockly.WorkspaceSvg, blockType: string): Blockly.BlockSvg {
    const block = workspace.newBlock(blockType);
    block.initSvg();
    block.render();
    return block;
  }

  /**
   * Default implementation for completeness check.
   */
  isComplete(input: string): boolean {
    return this.pattern.test(input.trim());
  }
}

/**
 * Pattern for recognizing numeric values.
 * Matches integers, floats, negative numbers.
 */
export class NumberPattern extends BasePattern {
  readonly name = 'number';
  readonly pattern = /^-?\d*\.?\d+$/;
  readonly priority = 100;
  readonly description = 'Create number block from numeric input';

  createBlock(match: RegExpMatchArray, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    const value = match[0];
    const numericValue = parseFloat(value);

    if (isNaN(numericValue)) {
      return null;
    }

    const block = this.createAndInitializeBlock(workspace, 'math_number');
    const field = block.getField('NUM');
    if (field) {
      field.setValue(value);
    }

    return block;
  }

  generateSuggestions(match: RegExpMatchArray): string[] {
    const value = match[0];
    const suggestions = [value];

    // Add some related number suggestions
    const num = parseFloat(value);
    if (!isNaN(num)) {
      suggestions.push(
        String(num + 1),
        String(num - 1),
        String(num * 10),
        String(Math.abs(num))
      );
    }

    return suggestions;
  }
}

/**
 * Pattern for recognizing quoted text strings.
 * Matches both single and double quoted strings.
 */
export class TextPattern extends BasePattern {
  readonly name = 'text';
  readonly pattern = /^["'](.*)["']$/;
  readonly priority = 95;
  readonly description = 'Create text block from quoted string';

  createBlock(match: RegExpMatchArray, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    const textValue = match[1]; // Extract content without quotes

    const block = this.createAndInitializeBlock(workspace, 'text');
    const field = block.getField('TEXT');
    if (field) {
      field.setValue(textValue);
    }

    return block;
  }

  generateSuggestions(match: RegExpMatchArray): string[] {
    const content = match[1];
    return [
      `"${content}"`,
      `'${content}'`,
      `"${content.toUpperCase()}"`,
      `"${content.toLowerCase()}"`
    ];
  }

  isComplete(input: string): boolean {
    const trimmed = input.trim();
    // Check if it starts and ends with matching quotes
    return (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
           (trimmed.startsWith("'") && trimmed.endsWith("'"));
  }
}

/**
 * Pattern for recognizing boolean values.
 * Matches true/false (case insensitive).
 */
export class BooleanPattern extends BasePattern {
  readonly name = 'boolean';
  readonly pattern = /^(true|false)$/i;
  readonly priority = 90;
  readonly description = 'Create boolean block from true/false';

  createBlock(match: RegExpMatchArray, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    const value = match[1].toLowerCase();
    const isTrue = value === 'true';

    const blockType = isTrue ? 'logic_boolean' : 'logic_boolean';
    const block = this.createAndInitializeBlock(workspace, blockType);

    const field = block.getField('BOOL');
    if (field) {
      field.setValue(isTrue ? 'TRUE' : 'FALSE');
    }

    return block;
  }

  generateSuggestions(match: RegExpMatchArray): string[] {
    return ['true', 'false'];
  }
}

/**
 * Pattern for recognizing simple math expressions.
 * Matches basic arithmetic: number operator number.
 */
export class MathExpressionPattern extends BasePattern {
  readonly name = 'math_expression';
  readonly pattern = /^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)$/;
  readonly priority = 80;
  readonly description = 'Create arithmetic block from math expression';

  private operatorMap: Record<string, string> = {
    '+': 'ADD',
    '-': 'MINUS',
    '*': 'MULTIPLY',
    '/': 'DIVIDE'
  };

  createBlock(match: RegExpMatchArray, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    const [, leftValue, operator, rightValue] = match;
    
    if (!this.operatorMap[operator]) {
      return null;
    }

    const block = this.createAndInitializeBlock(workspace, 'math_arithmetic');

    const opField = block.getField('OP');
    if (opField) {
      opField.setValue(this.operatorMap[operator]);
    }

    const leftBlock = workspace.newBlock('math_number');
    leftBlock.getField('NUM')?.setValue(leftValue);
    leftBlock.initSvg();
    leftBlock.render();

    const rightBlock = workspace.newBlock('math_number');
    rightBlock.getField('NUM')?.setValue(rightValue);
    rightBlock.initSvg();
    rightBlock.render();

    const aInput = block.getInput('A');
    const bInput = block.getInput('B');
    
    if (aInput && leftBlock.outputConnection) {
      leftBlock.outputConnection.connect(aInput.connection!);
    }

    if (bInput && rightBlock.outputConnection) {
      rightBlock.outputConnection.connect(bInput.connection!);
    }

    return block;
  }

  generateSuggestions(match: RegExpMatchArray): string[] {
    const [, left, op, right] = match;
    const leftNum = parseFloat(left);
    const rightNum = parseFloat(right);

    const suggestions = [match[0]];

    // Add variations with different operators
    for (const operator of ['+', '-', '*', '/']) {
      if (operator !== op) {
        suggestions.push(`${left} ${operator} ${right}`);
      }
    }

    // Add some number variations
    suggestions.push(
      `${leftNum + 1} ${op} ${right}`,
      `${left} ${op} ${rightNum + 1}`,
      `${leftNum * 10} ${op} ${right}`
    );

    return suggestions;
  }
}

/**
 * Pattern for recognizing variable assignments.
 * Matches "set variableName to value" syntax.
 */
export class VariableAssignmentPattern extends BasePattern {
  readonly name = 'variable_assignment';
  readonly pattern = /^set\s+(\w+)\s+to\s+(.+)$/i;
  readonly priority = 85;
  readonly description = 'Create variable assignment from "set var to value" syntax';

  createBlock(match: RegExpMatchArray, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    const [, varName, valueText] = match;

    const setBlock = this.createAndInitializeBlock(workspace, 'variables_set');

    let variable = workspace.getVariable(varName);
    if (!variable) {
      variable = workspace.createVariable(varName);
    }

    const varField = setBlock.getField('VAR');
    if (varField && variable) {
      varField.setValue(variable.getId());
    }

    const valueBlock = this.createValueBlock(valueText.trim(), workspace);
    if (valueBlock) {
      const valueInput = setBlock.getInput('VALUE');
      if (valueInput && valueBlock.outputConnection) {
        valueBlock.outputConnection.connect(valueInput.connection!);
      }
    }

    return setBlock;
  }

  /**
   * Create a block for the assignment value.
   */
  private createValueBlock(value: string, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    // Try number pattern
    if (/^-?\d*\.?\d+$/.test(value)) {
      const block = workspace.newBlock('math_number');
      block.getField('NUM')?.setValue(value);
      block.initSvg();
      block.render();
      return block;
    }

    // Try quoted text pattern
    const textMatch = value.match(/^["'](.*)["']$/);
    if (textMatch) {
      const block = workspace.newBlock('text');
      block.getField('TEXT')?.setValue(textMatch[1]);
      block.initSvg();
      block.render();
      return block;
    }

    // Try boolean pattern
    if (/^(true|false)$/i.test(value)) {
      const isTrue = value.toLowerCase() === 'true';
      const block = workspace.newBlock('logic_boolean');
      block.getField('BOOL')?.setValue(isTrue ? 'TRUE' : 'FALSE');
      block.initSvg();
      block.render();
      return block;
    }

    // Try variable reference
    if (/^\w+$/.test(value)) {
      const variable = workspace.getVariable(value);
      if (variable) {
        const block = workspace.newBlock('variables_get');
        block.getField('VAR')?.setValue(variable.getId());
        block.initSvg();
        block.render();
        return block;
      }
    }

    return null;
  }

  generateSuggestions(match: RegExpMatchArray): string[] {
    const [, varName, value] = match;
    return [
      `set ${varName} to ${value}`,
      `set ${varName} to 0`,
      `set ${varName} to "text"`,
      `set ${varName} to true`,
      `set ${varName} to false`
    ];
  }
}

/**
 * Get all built-in patterns.
 */
export function getBuiltinPatterns(): InputPattern[] {
  return [
    new NumberPattern(),
    new TextPattern(),
    new BooleanPattern(),
    new MathExpressionPattern(),
    new VariableAssignmentPattern()
  ];
}