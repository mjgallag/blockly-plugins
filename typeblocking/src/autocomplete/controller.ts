import * as Blockly from 'blockly/core';
import {Option, Matcher} from '../types';
import {substringMatcher} from './matcher';
import {Renderer} from './renderer';
import {BlockFactory} from '../block-actions/block-factory';
import {BlockPositioner} from '../block-actions/block-positioner';
import {SmartBlockPositioner, SmartPositioningConfig} from '../block-actions/smart-block-positioner';

/** Orchestrates Blockly, Renderer, and matching logic. */
export class FloatingInputController {
  private lastX = 0;
  private lastY = 0;
  private readonly matcher: Matcher;
  private readonly options: Option[];
  private readonly blockFactory: BlockFactory;
  private readonly blockPositioner: BlockPositioner;

  constructor(
    private readonly ws: Blockly.WorkspaceSvg,
    opts: {options: Option[]; matcher?: Matcher; enableSmartConnection?: boolean; smartConfig?: SmartPositioningConfig},
  ) {
    this.ws = ws;
    this.options = opts.options;
    this.matcher = opts.matcher ?? substringMatcher;
    this.blockFactory = new BlockFactory(ws);

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

    const refresh = () =>
      renderer.setSuggestions(this.matcher(this.options, renderer.query));
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
    const newBlock = this.blockFactory.createBlock(value);
    if (newBlock) {
      this.blockPositioner.positionBlock(newBlock, this.lastX, this.lastY);
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