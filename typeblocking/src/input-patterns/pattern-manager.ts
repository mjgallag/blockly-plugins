import * as Blockly from 'blockly/core';
import {InputPattern, PatternDetectionResult, PatternConfig, InputSuggestion} from './pattern-types';

/**
 * Manages input pattern recognition and block creation.
 */
export class InputPatternManager {
  private patterns: InputPattern[] = [];
  private config: Required<PatternConfig>;
  private detectionCache = new Map<string, PatternDetectionResult | null>();

  constructor(config: PatternConfig = {}) {
    this.config = {
      enableNumberDetection: config.enableNumberDetection ?? true,
      enableTextDetection: config.enableTextDetection ?? true,
      enableBooleanDetection: config.enableBooleanDetection ?? true,
      enableMathExpressions: config.enableMathExpressions ?? true,
      enableVariableAssignments: config.enableVariableAssignments ?? true,
      customPatterns: config.customPatterns ?? [],
      patternPriorities: config.patternPriorities ?? {},
      confidenceThreshold: config.confidenceThreshold ?? 0.7
    };

    this.initializePatterns();
  }

  /**
   * Initialize built-in and custom patterns.
   */
  private initializePatterns(): void {
    // Built-in patterns will be added by registerBuiltinPatterns
    this.patterns.push(...this.config.customPatterns);
    this.sortPatterns();
  }

  /**
   * Register built-in patterns based on configuration.
   */
  registerBuiltinPatterns(patterns: InputPattern[]): void {
    // Filter patterns based on configuration
    const enabledPatterns = patterns.filter(pattern => this.isPatternEnabled(pattern));
    
    // Apply priority overrides
    enabledPatterns.forEach(pattern => {
      if (this.config.patternPriorities[pattern.name]) {
        (pattern as any).priority = this.config.patternPriorities[pattern.name];
      }
    });
    
    this.patterns.push(...enabledPatterns);
    this.sortPatterns();
  }

  /**
   * Check if a pattern is enabled based on configuration.
   */
  private isPatternEnabled(pattern: InputPattern): boolean {
    switch (pattern.name) {
      case 'number':
        return this.config.enableNumberDetection;
      case 'text':
        return this.config.enableTextDetection;
      case 'boolean':
        return this.config.enableBooleanDetection;
      case 'math_expression':
        return this.config.enableMathExpressions;
      case 'variable_assignment':
        return this.config.enableVariableAssignments;
      default:
        return true; // Custom patterns enabled by default
    }
  }

  /**
   * Sort patterns by priority (higher first).
   */
  private sortPatterns(): void {
    this.patterns.sort((a, b) => b.priority - a.priority);
  }

  /**
   * Detect the best matching pattern for the given input.
   */
  detectPattern(input: string): PatternDetectionResult | null {
    // Check cache first
    if (this.detectionCache.has(input)) {
      return this.detectionCache.get(input)!;
    }

    let bestResult: PatternDetectionResult | null = null;

    for (const pattern of this.patterns) {
      const match = input.match(pattern.pattern);
      if (match) {
        const confidence = this.calculateConfidence(pattern, match, input);
        
        if (confidence >= this.config.confidenceThreshold) {
          const result: PatternDetectionResult = {
            pattern,
            match,
            confidence
          };
          
          // If this is a perfect match, return immediately
          if (confidence >= 0.95) {
            this.detectionCache.set(input, result);
            return result;
          }
          
          // Otherwise, keep track of the best result so far
          if (!bestResult || confidence > bestResult.confidence) {
            bestResult = result;
          }
        }
      }
    }

    this.detectionCache.set(input, bestResult);
    return bestResult;
  }

  /**
   * Calculate confidence score for a pattern match.
   */
  private calculateConfidence(pattern: InputPattern, match: RegExpMatchArray, input: string): number {
    let confidence = 0.8; // Base confidence for any match
    
    // Perfect full match gets higher confidence
    if (match[0] === input.trim()) {
      confidence += 0.15;
    }
    
    // Complete patterns get higher confidence
    if (pattern.isComplete && pattern.isComplete(input)) {
      confidence += 0.05;
    }
    
    // Higher priority patterns get slight boost
    confidence += (pattern.priority / 1000);
    
    return Math.min(confidence, 1.0);
  }

  /**
   * Create a block from input using pattern recognition.
   */
  createBlockFromPattern(input: string, workspace: Blockly.WorkspaceSvg): Blockly.BlockSvg | null {
    const result = this.detectPattern(input);
    if (!result) {
      return null;
    }

    try {
      const block = result.pattern.createBlock(result.match, workspace);
      if (block) {
        console.debug(`Created block using pattern: ${result.pattern.name}`, {
          input,
          confidence: result.confidence,
          blockType: block.type
        });
      }
      return block;
    } catch (error) {
      console.error(`Failed to create block using pattern ${result.pattern.name}:`, error);
      return null;
    }
  }

  /**
   * Get autocomplete suggestions for the given input.
   */
  getSuggestions(input: string): InputSuggestion[] {
    const suggestions: InputSuggestion[] = [];
    
    for (const pattern of this.patterns) {
      // Check for partial matches or completion suggestions
      if (pattern.generateSuggestions) {
        const match = input.match(pattern.pattern);
        if (match) {
          const patternSuggestions = pattern.generateSuggestions(match);
          suggestions.push(...patternSuggestions.map(text => ({
            text,
            description: pattern.description,
            example: this.getPatternExample(pattern),
            patternName: pattern.name
          })));
        }
      }
      
      // Also check for patterns that might match with slight modifications
      if (this.isPartialMatch(input, pattern)) {
        suggestions.push({
          text: this.getPatternExample(pattern),
          description: `${pattern.description} (example)`,
          example: this.getPatternExample(pattern),
          patternName: pattern.name
        });
      }
    }
    
    return suggestions;
  }

  /**
   * Check if input is a partial match for a pattern.
   */
  private isPartialMatch(input: string, pattern: InputPattern): boolean {
    // Simple heuristic: check if pattern might match with more input
    const trimmedInput = input.trim();
    if (trimmedInput.length === 0) return false;
    
    // Try adding some common completions to see if pattern would match
    const testCompletions = ['', '0', '1', 'true', 'false', '"', ')'];
    
    for (const completion of testCompletions) {
      const testInput = trimmedInput + completion;
      if (pattern.pattern.test(testInput)) {
        return true;
      }
    }
    
    return false;
  }

  /**
   * Get an example string for a pattern.
   */
  private getPatternExample(pattern: InputPattern): string {
    switch (pattern.name) {
      case 'number':
        return '42';
      case 'text':
        return '"hello world"';
      case 'boolean':
        return 'true';
      case 'math_expression':
        return '2 + 3';
      case 'variable_assignment':
        return 'set x to 5';
      default:
        return 'example';
    }
  }

  /**
   * Check if input matches any pattern completely.
   */
  isPatternMatch(input: string): boolean {
    return this.detectPattern(input) !== null;
  }

  /**
   * Get all registered patterns.
   */
  getPatterns(): InputPattern[] {
    return [...this.patterns];
  }

  /**
   * Clear the detection cache.
   */
  clearCache(): void {
    this.detectionCache.clear();
  }

  /**
   * Update configuration and rebuild patterns.
   */
  updateConfig(newConfig: Partial<PatternConfig>): void {
    this.config = { ...this.config, ...newConfig };
    this.patterns = [];
    this.clearCache();
    this.initializePatterns();
  }
}