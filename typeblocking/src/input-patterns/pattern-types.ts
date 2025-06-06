import * as Blockly from 'blockly/core';

/**
 * Interface for input pattern recognition and block creation.
 */
export interface InputPattern {
  /** Unique name for this pattern */
  readonly name: string;
  
  /** Regular expression for matching input */
  readonly pattern: RegExp;
  
  /** Priority level (higher = checked first) */
  readonly priority: number;
  
  /** Description for debugging and user feedback */
  readonly description: string;
  
  /**
   * Create a block from the matched input.
   * @param match - The regex match result
   * @param workspace - The workspace to create the block in
   * @returns The created block or null if creation failed
   */
  createBlock(match: RegExpMatchArray, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null;
  
  /**
   * Generate autocomplete suggestions based on partial input.
   * @param match - The regex match result (may be partial)
   * @returns Array of suggestion strings
   */
  generateSuggestions?(match: RegExpMatchArray): string[];
  
  /**
   * Validate that the input is complete and valid for this pattern.
   * @param input - The input string to validate
   * @returns True if input is valid and complete
   */
  isComplete?(input: string): boolean;
}

/**
 * Result of pattern detection.
 */
export interface PatternDetectionResult {
  pattern: InputPattern;
  match: RegExpMatchArray;
  confidence: number; // 0-1 score
}

/**
 * Configuration for pattern recognition behavior.
 */
export interface PatternConfig {
  /** Enable/disable specific pattern types */
  enableNumberDetection?: boolean;
  enableTextDetection?: boolean;
  enableBooleanDetection?: boolean;
  enableMathExpressions?: boolean;
  enableVariableAssignments?: boolean;
  
  /** Custom patterns to add */
  customPatterns?: InputPattern[];
  
  /** Override pattern priorities */
  patternPriorities?: Record<string, number>;
  
  /** Minimum confidence threshold for pattern detection */
  confidenceThreshold?: number;
}

/**
 * Suggestion for user input assistance.
 */
export interface InputSuggestion {
  text: string;
  description: string;
  example: string;
  patternName: string;
}