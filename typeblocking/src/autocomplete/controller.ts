import * as Blockly from 'blockly/core';
import {Option, Matcher, OptionGenerator, InputPositioningConfig} from '../types';
import {substringMatcher} from './matcher';
import {Renderer} from './renderer';
import {BlockFactory} from '../block-actions/block-factory';
import {BlockPositioner} from '../block-actions/block-positioner';
import {ConnectionManager, ConnectionConfig} from '../block-actions/connection-manager';
import {PatternConfig} from '../input-patterns/pattern-types';
import {InputPatternManager} from '../input-patterns/pattern-manager';
import {getBuiltinPatterns} from '../input-patterns/builtin-patterns';
import {SmartOptionGenerator} from './smart-option-generator';

/** Orchestrates Blockly, Renderer, and matching logic. */
export class FloatingInputController {
  private lastX = 0;
  private lastY = 0;
  private readonly matcher: Matcher;
  private readonly options: Option[];
  private readonly blockFactory: BlockFactory;
  private readonly blockPositioner: BlockPositioner;
  private readonly connectionManager?: ConnectionManager;
  private readonly patternManager?: InputPatternManager;
  private readonly optionGenerator?: OptionGenerator;
  private readonly inputPositioning: Required<InputPositioningConfig>;

  constructor(
    private readonly ws: Blockly.WorkspaceSvg,
    opts: {
      options: Option[]; 
      matcher?: Matcher; 
      enableSmartConnection?: boolean; 
      connectionConfig?: ConnectionConfig;
      enablePatternRecognition?: boolean;
      patternConfig?: PatternConfig;
      optionGenerator?: OptionGenerator;
      inputPositioning?: InputPositioningConfig;
    },
  ) {
    this.ws = ws;
    this.options = opts.options;
    this.matcher = opts.matcher ?? substringMatcher;
    this.optionGenerator = opts.optionGenerator;

    this.inputPositioning = {
      mode: opts.inputPositioning?.mode ?? 'mouse',
      fixedPosition: opts.inputPositioning?.fixedPosition ?? { x: 100, y: 10 }
    };

    this.blockFactory = new BlockFactory(ws);
    this.blockPositioner = new BlockPositioner(ws);

    if (opts.enablePatternRecognition !== false) { // Default to true
      this.patternManager = new InputPatternManager(opts.patternConfig);
      this.patternManager.registerBuiltinPatterns(getBuiltinPatterns());
    }

    if (opts.enableSmartConnection !== false) { // Default to true
      this.connectionManager = new ConnectionManager(ws, opts.connectionConfig);
    }

    ws.getInjectionDiv().addEventListener('pointermove', this.pointerMoveListener);
  }

  dispose(): void {
    this.ws.getInjectionDiv().removeEventListener('pointermove', this.pointerMoveListener)
    // TODO: remove event listeners - I will need access to them
    //this.renderer?.inputEl.removeEventListener('input', this.renderer?.inputEl);
  }

  pointerMoveListener = (ev: PointerEvent) => { this.lastX = ev.x; this.lastY = ev.y };

  /** Called by the shortcut to pop up the widget. */
  show(initial = ''): void {
    Blockly.WidgetDiv.show(
      {},
      this.ws.RTL,
      () => this.ws.getInjectionDiv().focus(),
      this.ws,
      true,
    );

    const renderer = new Renderer((v) => this.choose(v), initial);
    Blockly.WidgetDiv.getDiv()!.appendChild(renderer.root);

    this.positionWidgetDiv();

    const refresh = () => {
      let currentOptions = this.options;

      if (this.optionGenerator instanceof SmartOptionGenerator) {
        console.debug('TypeBlocking: Using smart option generation for query:', renderer.query);
        currentOptions = this.optionGenerator.generateOptionsForInput(renderer.query);
        console.debug('TypeBlocking: Generated', currentOptions.length, 'options:', currentOptions.slice(0, 5));
      } else {
        console.debug('TypeBlocking: Using static options, generator type:', typeof this.optionGenerator);
      }
      
      const matchedOptions = this.matcher(currentOptions, renderer.query);
      console.debug('TypeBlocking: After matching, got', matchedOptions.length, 'options:', matchedOptions.slice(0, 5));
      renderer.setSuggestions(matchedOptions);
    };
    renderer.inputEl.addEventListener('input', refresh);
    refresh();

    renderer.inputEl.addEventListener('keydown', (kev) => {
      if (renderer.onKey(kev.key, (v) => this.choose(v))) kev.preventDefault();
      else if (kev.key === 'Escape') Blockly.WidgetDiv.hide();
      kev.stopPropagation();
    });

    renderer.inputEl.addEventListener('blur', () => Blockly.WidgetDiv.hide());

    setTimeout(() => renderer.focus());
  }

  private choose(value: string): void {
    console.debug('TypeBlocking: Choosing value:', value);
    
    let newBlock: Blockly.BlockSvg | undefined;

    // First, try pattern recognition if enabled
    if (this.patternManager) {
      console.debug('TypeBlocking: Trying pattern recognition for:', value);
      const instruction = this.patternManager.getBlockInstructions(value);
      if (instruction) {
        console.debug('TypeBlocking: Found pattern instruction:', instruction);
        newBlock = this.blockFactory.createBlockFromInstruction(instruction);
        if (newBlock) {
          console.debug('TypeBlocking: Created block using pattern recognition:', newBlock.type);
        }
      }
    }

    // Fall back to regular block creation if pattern recognition didn't work
    if (!newBlock) {
      console.debug('TypeBlocking: Falling back to regular block creation');
      newBlock = this.blockFactory.createBlock(value);
      if (newBlock) {
        console.debug('TypeBlocking: Created block using regular method:', newBlock.type);
      }
    }

    if (newBlock) {
      // Position the block first
      this.blockPositioner.positionBlock(newBlock, this.lastX, this.lastY);

      // Then attempt smart connection if enabled
      if (this.connectionManager) {
        this.connectionManager.attemptConnection(newBlock, this.lastX, this.lastY);
      }
    } else {
      console.warn('TypeBlocking: Failed to create block for value:', value);
    }

    Blockly.WidgetDiv.hide();
    // TODO: does this interfere with the new block's focus?
    this.ws.getInjectionDiv().focus();
  }

  private positionWidgetDiv(): void {
    const div = Blockly.WidgetDiv.getDiv()!;
    let left: number;
    let top: number;

    if (this.inputPositioning.mode === 'fixed') {
      // Use fixed position relative to the workspace
      const workspaceRect = this.ws.getInjectionDiv().getBoundingClientRect();
      left = workspaceRect.left + this.inputPositioning.fixedPosition.x;
      top = workspaceRect.top + this.inputPositioning.fixedPosition.y;
    } else {
      // Use mouse-based positioning
      left = this.lastX;
      top = this.lastY;

      // Fallback to center if no mouse position available
      if (!left && !top) {
        const r = this.ws.getInjectionDiv().getBoundingClientRect();
        left = r.left + r.width / 2;
        top = r.top + r.height / 2;
      }
    }

    Object.assign(div.style, {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
    });
  }
}