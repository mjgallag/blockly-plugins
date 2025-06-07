export type Option = string;

/** Any matching strategy must implement this signature. */
export interface Matcher {
  (options: Option[], query: string): Option[];
}

/** Interface for generating dynamic options from workspace state. */
export interface OptionGenerator {
  generateOptions(): Option[];
  getVariableOptions(): Option[];
  getProcedureOptions(): Option[];
  getBuiltinBlockOptions(): Option[];
}

/** Interface for tracking workspace state changes. */
export interface WorkspaceStateTracker {
  readonly needsReload: boolean;
  invalidate(reason: string): void;
  dispose(): void;
}

/** Interface for analyzing local variable scope. */
export interface ScopeAnalyzer {
  getLocalVariablesInScope(): string[];
  getLocalVariablesFromSelection?(): string[];
}

export type InputPositioningMode = 'mouse' | 'fixed';

export interface InputPositioningConfig {
  /**
   * How to position the floating input widget.
   * - 'mouse': Position at the last mouse coordinates (default)
   * - 'fixed': Position at a fixed location (top-left of workspace)
   */
  mode?: InputPositioningMode;

  /**
   * When mode is 'fixed', the position to use.
   * Defaults to top-left corner with some padding.
   */
  fixedPosition?: {
    x: number;
    y: number;
  };
}
