import * as Blockly from 'blockly/core';
import {BlockFactory} from './block-factory';
import {InputPatternManager} from '../input-patterns/pattern-manager';
import {getBuiltinPatterns} from '../input-patterns/builtin-patterns';
import {PatternConfig} from '../input-patterns/pattern-types';

/**
 * Enhanced block factory that supports pattern-based block creation.
 */
export class SmartBlockFactory extends BlockFactory {
  private readonly patternManager: InputPatternManager;
  private smartOptionGenerator?: any; // To store reference from controller

  constructor(workspace: Blockly.WorkspaceSvg, patternConfig?: PatternConfig) {
    super(workspace);

    this.patternManager = new InputPatternManager(patternConfig);
    this.patternManager.registerBuiltinPatterns(getBuiltinPatterns());
  }

  /**
   * Creates and renders a block from a type identifier or pattern input.
   * @param value - The block type, typeblock identifier, or pattern input
   * @returns The created block or undefined if no block could be created
   */
  createBlock(value: string): Blockly.BlockSvg | undefined {
    console.debug('SmartBlockFactory: Creating block for input:', value);
    
    // First, try pattern recognition
    const patternBlock = this.tryPatternCreation(value);
    if (patternBlock) {
      console.debug('SmartBlockFactory: Created block using pattern recognition');
      return patternBlock;
    }

    // Fall back to original block creation logic
    console.debug('SmartBlockFactory: Falling back to original block creation logic');
    return super.createBlock(value);
  }

  /**
   * Try to create a block using pattern recognition.
   */
  private tryPatternCreation(value: string): Blockly.BlockSvg | undefined {
    try {
      console.debug('SmartBlockFactory: Trying pattern creation for:', value);
      const instruction = this.patternManager.getBlockInstructions(value);
      console.debug('SmartBlockFactory: Pattern instruction result:', instruction);

      if (instruction) {
        const block = this.createBlockFromInstruction(instruction);
        console.debug('SmartBlockFactory: Pattern creation result:', block ? block.type : 'null');
        return block;
      }

      return undefined;
    } catch (error) {
      console.debug('SmartBlockFactory: Pattern creation failed:', error);
      return undefined;
    }
  }

  /**
   * Check if the input matches any known pattern.
   */
  isPatternInput(value: string): boolean {
    return this.patternManager.isPatternMatch(value);
  }

  /**
   * Get suggestions for the given input based on patterns.
   */
  getPatternSuggestions(value: string): string[] {
    const suggestions = this.patternManager.getSuggestions(value);
    return suggestions.map(suggestion => suggestion.text);
  }

  /**
   * Get detailed pattern suggestions with descriptions.
   */
  getDetailedPatternSuggestions(value: string) {
    return this.patternManager.getSuggestions(value);
  }

  /**
   * Get the pattern manager for advanced usage.
   */
  getPatternManager(): InputPatternManager {
    return this.patternManager;
  }

  /**
   * Update pattern configuration.
   */
  updatePatternConfig(config: Partial<PatternConfig>): void {
    this.patternManager.updateConfig(config);
  }

  /**
   * Create a block with enhanced error handling and logging.
   */
  createBlockSafely(value: string): {
    block?: Blockly.BlockSvg;
    success: boolean;
    method: 'pattern' | 'original' | 'none';
    error?: string;
  } {
    try {
      // Try pattern creation first
      const patternBlock = this.tryPatternCreation(value);
      if (patternBlock) {
        return {
          block: patternBlock,
          success: true,
          method: 'pattern'
        };
      }

      // Try original method
      const originalBlock = super.createBlock(value);
      if (originalBlock) {
        return {
          block: originalBlock,
          success: true,
          method: 'original'
        };
      }

      return {
        success: false,
        method: 'none'
      };
    } catch (error) {
      return {
        success: false,
        method: 'none',
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Get information about what type of input this is.
   */
  analyzeInput(value: string): {
    isPattern: boolean;
    patternName?: string;
    isBlockType: boolean;
    isTypeblock: boolean;
    confidence: number;
  } {
    const detectionResult = this.patternManager.detectPattern(value);
    const isPattern = detectionResult !== null;

    const isBlockType = !!Blockly.Blocks[value];

    let isTypeblock = false;
    for (const blockType in Blockly.Blocks) {
      if (Blockly.Blocks[blockType].typeblock === value) {
        isTypeblock = true;
        break;
      }
    }

    return {
      isPattern,
      patternName: detectionResult?.pattern.name,
      isBlockType,
      isTypeblock,
      confidence: detectionResult?.confidence || 0
    };
  }

  /**
   * Get examples of different input types that this factory can handle.
   */
  getInputExamples(): Array<{category: string; examples: string[]}> {
    return [
      {
        category: 'Numbers',
        examples: ['42', '3.14', '-5', '0']
      },
      {
        category: 'Text',
        examples: ['"hello world"', "'text'", '"123"']
      },
      {
        category: 'Booleans',
        examples: ['true', 'false', 'TRUE', 'FALSE']
      },
      {
        category: 'Math Expressions',
        examples: ['2 + 3', '10 - 5', '4 * 7', '15 / 3']
      },
      {
        category: 'Variable Assignment',
        examples: ['set x to 5', 'set name to "hello"', 'set flag to true']
      },
      {
        category: 'Variables',
        examples: ['get myVar', 'set myVar to']
      },
      {
        category: 'Block Types',
        examples: ['controls_if', 'logic_compare', 'math_arithmetic']
      }
    ];
  }

  /**
   * Set the smart option generator reference.
   */
  setSmartOptionGenerator(generator: any): void {
    this.smartOptionGenerator = generator;
  }

  /**
   * Check if smart option generator is available.
   */
  hasSmartOptionGenerator(): boolean {
    return !!this.smartOptionGenerator;
  }

  /**
   * Get the smart option generator.
   */
  getSmartOptionGenerator(): any {
    return this.smartOptionGenerator;
  }
}