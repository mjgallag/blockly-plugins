import * as Blockly from 'blockly/core';
import {WorkspaceOptionGenerator} from './option-generator';
import {InputPatternManager} from '../input-patterns/pattern-manager';
import {getBuiltinPatterns} from '../input-patterns/builtin-patterns';
import {Option, OptionGenerator, ScopeAnalyzer} from '../types';
import {PatternConfig} from '../input-patterns/pattern-types';

/**
 * Helper function to create an Option from a string.
 */
function createOption(text: string): Option {
  return {
    blockType: text,
    displayText: text
  };
}

/**
 * Enhanced option generator that provides pattern-based suggestions and filtering.
 */
export class SmartOptionGenerator extends WorkspaceOptionGenerator implements OptionGenerator {
  private patternManager: InputPatternManager;
  private lastInput: string = '';
  private lastSuggestions: Option[] = [];

  constructor(workspace: Blockly.WorkspaceSvg, patternConfig?: PatternConfig) {
    super(workspace);

    this.patternManager = new InputPatternManager(patternConfig);
    this.patternManager.registerBuiltinPatterns(getBuiltinPatterns());
  }

  /**
   * Generate options tailored to the current input.
   */
  generateOptionsForInput(input: string): Option[] {
    // Cache check for performance
    if (input === this.lastInput && this.lastSuggestions.length > 0) {
      return this.lastSuggestions;
    }

    const trimmedInput = input.trim();

    const baseOptions = this.generateOptions();

    const patternSuggestions = this.getPatternSuggestions(trimmedInput);

    const filteredOptions = this.filterAndRankOptions(baseOptions, trimmedInput);

    const combinedOptions = this.combineOptions(patternSuggestions, filteredOptions, trimmedInput);

    this.lastInput = input;
    this.lastSuggestions = combinedOptions;

    return combinedOptions;
  }

  /**
   * Get pattern-based suggestions for the input.
   */
  private getPatternSuggestions(input: string): Option[] {
    if (!input) return [];

    const suggestions: Option[] = [];

    // Check if input matches any pattern
    const detectionResult = this.patternManager.detectPattern(input);
    console.debug('SmartOptionGenerator: Pattern detection for', input, ':', detectionResult);
    if (detectionResult) {
      // Input matches a pattern - add it as primary suggestion
      suggestions.push(createOption(input));
      console.debug('SmartOptionGenerator: Added pattern input as suggestion:', input);
    }

    // Get pattern-based suggestions
    const patternSuggestions = this.patternManager.getSuggestions(input);
    console.debug('SmartOptionGenerator: Pattern manager suggestions:', patternSuggestions);
    suggestions.push(...patternSuggestions.map(s => createOption(s.text)));

    // Add pattern examples if input is partial
    if (this.isPartialPatternInput(input)) {
      const examples = this.getPatternExamples(input);
      console.debug('SmartOptionGenerator: Pattern examples:', examples);
      suggestions.push(...examples.map(example => createOption(example)));
    }

    console.debug('SmartOptionGenerator: Final pattern suggestions:', suggestions);
    // Remove duplicates based on both blockType and displayText
    const seen = new Set<string>();
    return suggestions.filter(option => {
      const key = `${option.blockType}:${option.displayText}`;
      if (seen.has(key)) {
        return false;
      }
      seen.add(key);
      return true;
    });
  }

  /**
   * Check if input might be a partial pattern.
   */
  private isPartialPatternInput(input: string): boolean {
    if (input.length === 0) return false;

    const patternStarts = [
      /^\d+$/, // Numbers
      /^["']/, // Quoted text (partial)
      /^(true|false)$/i, // Booleans
      /^\d+\s*[+\-*/]/, // Math expressions (partial)
      /^set\s+\w*/, // Variable assignments (partial)
      /^get\s+/, // Variable getters
      /^when\s+/ // Event patterns
    ];

    return patternStarts.some(pattern => pattern.test(input));
  }

  /**
   * Get example patterns that might be relevant to the input.
   */
  private getPatternExamples(input: string): string[] {
    const examples: string[] = [];

    // Numeric input - suggest number-related patterns
    if (/^\d/.test(input)) {
      examples.push('42', '3.14', `${input} + 1`, `${input} * 2`);
    }

    // Text input start - suggest text patterns
    if (/^["']/.test(input)) {
      examples.push('"hello world"', "'example text'");
    }

    // Boolean start - suggest boolean patterns
    if (/^(t|f)/i.test(input)) {
      examples.push('true', 'false');
    }

    // Set command start - suggest variable assignments
    if (/^set/i.test(input)) {
      examples.push('set x to 5', 'set name to "hello"', 'set flag to true');
    }

    // Get command start - suggest variable getters
    if (/^get/i.test(input)) {
      // Add actual variables from workspace
      const variables = this.workspace.getVariablesOfType('');
      examples.push(...variables.map(v => `get ${v.getName()}`));
    }

    return examples;
  }

  /**
   * Filter and rank base options based on input relevance.
   */
  private filterAndRankOptions(options: Option[], input: string): Option[] {
    if (!input) return options;

    const scored = options
      .map(option => ({
        option,
        score: this.calculateRelevanceScore(option.displayText, input)
      }))
      .filter(item => item.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.map(item => item.option);
  }

  /**
   * Calculate relevance score for an option based on input.
   */
  private calculateRelevanceScore(option: string, input: string): number {
    const lowerOption = option.toLowerCase();
    const lowerInput = input.toLowerCase();

    let score = 0;

    // Exact match gets highest score
    if (lowerOption === lowerInput) {
      return 100;
    }

    // Starts with input gets high score
    if (lowerOption.startsWith(lowerInput)) {
      score += 50;
    }

    // Contains input gets medium score
    if (lowerOption.includes(lowerInput)) {
      score += 25;
    }

    // Contextual bonuses based on input patterns
    score += this.getContextualBonus(option, input);

    // Length penalty for very long options when input is short
    if (input.length < 3 && option.length > 20) {
      score -= 10;
    }

    return Math.max(0, score);
  }

  /**
   * Get contextual bonus score based on input patterns.
   */
  private getContextualBonus(option: string, input: string): number {
    let bonus = 0;

    // If input looks like a number, boost math-related options
    if (/^\d/.test(input)) {
      if (/math|number|arithmetic|calculate/.test(option.toLowerCase())) {
        bonus += 15;
      }
    }

    // If input looks like text, boost text-related options
    if (/^["']/.test(input)) {
      if (/text|string|concat|join/.test(option.toLowerCase())) {
        bonus += 15;
      }
    }

    // If input looks like boolean, boost logic options
    if (/^(true|false)/i.test(input)) {
      if (/logic|boolean|compare|if/.test(option.toLowerCase())) {
        bonus += 15;
      }
    }

    // If input mentions variables, boost variable options
    if (/set|get|var/i.test(input)) {
      if (/variable|var|get|set/.test(option.toLowerCase())) {
        bonus += 15;
      }
    }

    return bonus;
  }

  /**
   * Combine pattern suggestions with filtered options.
   */
  private combineOptions(patternSuggestions: Option[], filteredOptions: Option[], input: string): Option[] {
    const combined: Option[] = [];
    const seen = new Set<string>();

    for (const suggestion of patternSuggestions) {
      const key = `${suggestion.blockType}:${suggestion.displayText}`;
      if (!seen.has(key)) {
        combined.push(suggestion);
        seen.add(key);
      }
    }

    const maxFilteredOptions = Math.max(10, 20 - patternSuggestions.length);
    for (const option of filteredOptions.slice(0, maxFilteredOptions)) {
      const key = `${option.blockType}:${option.displayText}`;
      if (!seen.has(key)) {
        combined.push(option);
        seen.add(key);
      }
    }

    // If we don't have many suggestions and input is short, add some general options
    if (combined.length < 5 && input.length < 3) {
      const generalOptions = ['if', 'repeat', 'set variable', 'math', 'text', 'true', 'false'];
      for (const optionText of generalOptions) {
        const option = createOption(optionText);
        const key = `${option.blockType}:${option.displayText}`;
        if (!seen.has(key) && combined.length < 10) {
          combined.push(option);
          seen.add(key);
        }
      }
    }

    return combined;
  }


  /**
   * Override parent method to include scope analyzer support.
   */
  setScopeAnalyzer(analyzer: ScopeAnalyzer): void {
    super.setScopeAnalyzer(analyzer);
  }



}