import {InputPattern, BlockCreationInstruction} from './pattern-types';

/**
 * Base class for built-in patterns with common utilities.
 */
abstract class BasePattern implements InputPattern {
  abstract readonly name: string;
  abstract readonly pattern: RegExp;
  abstract readonly priority: number;
  abstract readonly description: string;

  abstract parseInput(match: RegExpMatchArray): BlockCreationInstruction | null;

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

  parseInput(match: RegExpMatchArray): BlockCreationInstruction | null {
    const value = match[0];
    const numericValue = parseFloat(value);

    // Validate the number
    if (isNaN(numericValue)) {
      return null;
    }

    return {
      blockType: 'math_number',
      fieldValues: {
        'NUM': value
      }
    };
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

  parseInput(match: RegExpMatchArray): BlockCreationInstruction | null {
    const textValue = match[1]; // Extract content without quotes

    return {
      blockType: 'text',
      fieldValues: {
        'TEXT': textValue
      }
    };
  }

  generateSuggestions(match: RegExpMatchArray): string[] {
    const content = match[1];
    return [
      `"${content}"`,
      `'${content}'`,
      '"hello world"',
      '"example text"'
    ];
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

  parseInput(match: RegExpMatchArray): BlockCreationInstruction | null {
    const value = match[1].toLowerCase();
    const isTrue = value === 'true';

    return {
      blockType: 'logic_boolean',
      fieldValues: {
        'BOOL': isTrue ? 'TRUE' : 'FALSE'
      }
    };
  }

  generateSuggestions(): string[] {
    return ['true', 'false'];
  }
}

/**
 * Pattern for recognizing simple math expressions.
 * Matches "number operator number" format.
 */
export class MathExpressionPattern extends BasePattern {
  readonly name = 'math_expression';
  readonly pattern = /^(\d+(?:\.\d+)?)\s*([+\-*/])\s*(\d+(?:\.\d+)?)$/;
  readonly priority = 80;
  readonly description = 'Create arithmetic block from math expression';

  private readonly operatorMap: Record<string, string> = {
    '+': 'ADD',
    '-': 'MINUS',
    '*': 'MULTIPLY',
    '/': 'DIVIDE'
  };

  parseInput(match: RegExpMatchArray): BlockCreationInstruction | null {
    const [, leftValue, operator, rightValue] = match;
    
    if (!this.operatorMap[operator]) {
      return null;
    }

    return {
      blockType: 'math_arithmetic',
      fieldValues: {
        'OP': this.operatorMap[operator]
      },
      children: [
        {
          input: 'A',
          instruction: {
            blockType: 'math_number',
            fieldValues: { 'NUM': leftValue }
          }
        },
        {
          input: 'B',
          instruction: {
            blockType: 'math_number',
            fieldValues: { 'NUM': rightValue }
          }
        }
      ]
    };
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

  parseInput(match: RegExpMatchArray): BlockCreationInstruction | null {
    const [, varName, valueText] = match;

    const valueInstruction = this.parseValueInstruction(valueText.trim());
    if (!valueInstruction) {
      return null;
    }

    return {
      blockType: 'variables_set',
      fieldValues: {
        'VAR': varName // Note: This will need special handling in BlockFactory for variable creation
      },
      children: [
        {
          input: 'VALUE',
          instruction: valueInstruction
        }
      ]
    };
  }

  /**
   * Parse the value part of an assignment into a block instruction.
   */
  private parseValueInstruction(value: string): BlockCreationInstruction | null {
    // Try number pattern
    if (/^-?\d*\.?\d+$/.test(value)) {
      return {
        blockType: 'math_number',
        fieldValues: { 'NUM': value }
      };
    }

    // Try quoted text pattern
    const textMatch = value.match(/^["'](.*)["']$/);
    if (textMatch) {
      return {
        blockType: 'text',
        fieldValues: { 'TEXT': textMatch[1] }
      };
    }

    // Try boolean pattern
    if (/^(true|false)$/i.test(value)) {
      const isTrue = value.toLowerCase() === 'true';
      return {
        blockType: 'logic_boolean',
        fieldValues: { 'BOOL': isTrue ? 'TRUE' : 'FALSE' }
      };
    }

    // Try variable reference
    if (/^\w+$/.test(value)) {
      return {
        blockType: 'variables_get',
        fieldValues: { 'VAR': value }
      };
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
      'set myVar to 42',
      'set count to 0'
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
    new VariableAssignmentPattern(),
  ];
}