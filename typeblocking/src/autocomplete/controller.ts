import * as Blockly from 'blockly/core';
import {Option, Matcher, OptionGenerator} from '../types';
import {substringMatcher} from './matcher';
import {Renderer} from './renderer';
import {BlockFactory} from '../block-actions/block-factory';
import {SmartBlockFactory} from '../block-actions/smart-block-factory';
import {BlockPositioner} from '../block-actions/block-positioner';
import {SmartBlockPositioner, SmartPositioningConfig} from '../block-actions/smart-block-positioner';
import {PatternConfig} from '../input-patterns/pattern-types';
import {SmartOptionGenerator} from './smart-option-generator';

/** Orchestrates Blockly, Renderer, and matching logic. */
export class FloatingInputController {
  private lastX = 0;
  private lastY = 0;
  private readonly matcher: Matcher;
  private readonly options: Option[];
  private readonly blockFactory: BlockFactory;
  private readonly blockPositioner: BlockPositioner;
  private readonly optionGenerator?: OptionGenerator;

  constructor(
    private readonly ws: Blockly.WorkspaceSvg,
    opts: {
      options: Option[]; 
      matcher?: Matcher; 
      enableSmartConnection?: boolean; 
      smartConfig?: SmartPositioningConfig;
      enablePatternRecognition?: boolean;
      patternConfig?: PatternConfig;
      optionGenerator?: OptionGenerator;
    },
  ) {
    this.ws = ws;
    this.options = opts.options;
    this.matcher = opts.matcher ?? substringMatcher;
    this.optionGenerator = opts.optionGenerator;

    if (opts.enablePatternRecognition !== false) { // Default to true
      this.blockFactory = new SmartBlockFactory(ws, opts.patternConfig);
    } else {
      this.blockFactory = new BlockFactory(ws);
    }

    if (opts.enableSmartConnection !== false) { // Default to true
      this.blockPositioner = new SmartBlockPositioner(ws, opts.smartConfig);
    } else {
      this.blockPositioner = new BlockPositioner(ws);
    }

    const pointer = ws.getInjectionDiv().addEventListener('pointermove', this.pointerMoveListener);
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
    console.debug('TypeBlocking: Block factory type:', this.blockFactory.constructor.name);
    
    const newBlock = this.blockFactory.createBlock(value);
    if (newBlock) {
      console.debug('TypeBlocking: Successfully created block:', newBlock.type);
      this.blockPositioner.positionBlock(newBlock, this.lastX, this.lastY);
    } else {
      console.warn('TypeBlocking: Failed to create block for value:', value);
    }

    Blockly.WidgetDiv.hide();
    // TODO: does this interfere with the new block's focus?
    this.ws.getInjectionDiv().focus();
  }

  private positionWidgetDiv(): void {
    const div = Blockly.WidgetDiv.getDiv()!;
    let {lastX: left, lastY: top} = this;
    if (!left && !top) {
      const r = this.ws.getInjectionDiv().getBoundingClientRect();
      left = r.left + r.width / 2;
      top = r.top + r.height / 2;
    }
    Object.assign(div.style, {
      position: 'fixed',
      left: `${left}px`,
      top: `${top}px`,
    });
  }
}