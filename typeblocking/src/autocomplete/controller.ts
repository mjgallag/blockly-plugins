import * as Blockly from 'blockly/core';
import {Option, Matcher} from '../types';
import {substringMatcher} from './matcher';
import {Renderer} from './renderer';

/** Orchestrates Blockly, Renderer, and matching logic. */
export class FloatingInputController {
  private lastX = 0;
  private lastY = 0;
  private readonly matcher: Matcher;
  private readonly options: Option[];

  constructor(
    private readonly ws: Blockly.WorkspaceSvg,
    opts: {options: Option[]; matcher?: Matcher},
  ) {
    this.ws = ws;
    this.options = opts.options;
    this.matcher = opts.matcher ?? substringMatcher;

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
    const newBlock = this.renderBlock(value);
    if (newBlock) {
      this.moveBlock(newBlock);
    }

    Blockly.WidgetDiv.hide();
    // TODO: does this interfere with the new block's focus?
    this.ws.getInjectionDiv().focus();
  }

  private renderBlock(value: string): Blockly.BlockSvg | undefined {
    let blockType = value;
    if (!Blockly.Blocks[blockType]) {
      for (const t in Blockly.Blocks) {
        if (Blockly.Blocks[t].typeblock === value) {
          blockType = t;
          break;
        }
      }
    }
    if (!Blockly.Blocks[blockType]) {
      console.warn(`No block registered for “${value}”`);
      return;
    }

    const block = this.ws.newBlock(blockType);
    block.initSvg();
    block.render();
    return block;
  }

  private moveBlock(block: Blockly.BlockSvg): void {
    const metrics = this.ws.getMetrics(); // viewport & scroll
    const divRect = this.ws.getInjectionDiv().getBoundingClientRect();

    const clientX = this.lastX || divRect.left + divRect.width / 2;
    const clientY = this.lastY || divRect.top + divRect.height / 2;

    const x = (clientX - divRect.left) / this.ws.scale + metrics.viewLeft;
    const y = (clientY - divRect.top) / this.ws.scale + metrics.viewTop;

    block.moveBy(x, y);
    block.select(); // give it focus
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
