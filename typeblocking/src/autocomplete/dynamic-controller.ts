import * as Blockly from 'blockly/core';
import {Option, Matcher, OptionGenerator, WorkspaceStateTracker, InputPositioningConfig} from '../types';
import {FloatingInputController} from './controller';
import {substringMatcher} from './matcher';
import {ConnectionConfig} from '../block-actions/connection-manager';
import {PatternConfig} from '../input-patterns/pattern-types';

interface DynamicControllerOptions {
  options: Option[];
  matcher?: Matcher;
  optionGenerator?: OptionGenerator;
  stateTracker?: WorkspaceStateTracker;
  enableSmartConnection?: boolean;
  connectionConfig?: ConnectionConfig;
  enablePatternRecognition?: boolean;
  patternConfig?: PatternConfig;
  inputPositioning?: InputPositioningConfig;
}

/**
 * Extended controller that supports dynamic option generation with lazy loading and caching.
 */
// TODO: the parent class might not be necessary anymore. Consider removing it.
export class DynamicFloatingInputController extends FloatingInputController {
  private dynamicOptionGenerator?: OptionGenerator;
  private stateTracker?: WorkspaceStateTracker;
  private cachedOptions?: Option[];
  private staticOptions: Option[];

  constructor(
    workspace: Blockly.WorkspaceSvg,
    opts: DynamicControllerOptions,
  ) {
    super(workspace, {
      options: opts.options,
      matcher: opts.matcher ?? substringMatcher,
      enableSmartConnection: opts.enableSmartConnection,
      connectionConfig: opts.connectionConfig,
      enablePatternRecognition: opts.enablePatternRecognition,
      patternConfig: opts.patternConfig,
      optionGenerator: opts.optionGenerator,
      inputPositioning: opts.inputPositioning
    });

    this.staticOptions = opts.options;
    this.dynamicOptionGenerator = opts.optionGenerator;
    this.stateTracker = opts.stateTracker;
  }

  protected getCurrentOptions(): Option[] {
    if (!this.dynamicOptionGenerator || !this.stateTracker) {
      return this.staticOptions;
    }

    if (this.stateTracker.needsReload || !this.cachedOptions) {
      this.lazyLoadOptions();
    }

    return this.cachedOptions || this.staticOptions;
  }

  /**
   * Lazy load options from the generator.
   */
  private lazyLoadOptions(): void {
    if (!this.dynamicOptionGenerator || !this.stateTracker) {
      return;
    }

    console.debug('TypeBlocking: Regenerating options...');
    const startTime = performance.now();

    try {
      this.cachedOptions = this.dynamicOptionGenerator.generateOptions();

      if ('markReloaded' in this.stateTracker) {
        (this.stateTracker as any).markReloaded();
      }

      const duration = performance.now() - startTime;
      console.debug(`TypeBlocking: Generated ${this.cachedOptions.length} options in ${duration.toFixed(2)}ms`);

    } catch (error) {
      console.error('TypeBlocking: Error generating options:', error);
      // Fall back to static options on error
      this.cachedOptions = this.staticOptions;
    }
  }

  show(initial = ''): void {
    const currentOptions = this.getCurrentOptions();
    (this as any).options = currentOptions;

    super.show(initial);
  }

  dispose(): void {
    this.cachedOptions = undefined;
    this.dynamicOptionGenerator = undefined;
    this.stateTracker = undefined;
    super.dispose();
  }
}