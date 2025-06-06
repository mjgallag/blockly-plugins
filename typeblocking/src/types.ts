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
