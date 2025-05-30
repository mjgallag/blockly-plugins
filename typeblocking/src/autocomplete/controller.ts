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
    private ws: Blockly.WorkspaceSvg,
    opts: {options: Option[]; matcher?: Matcher},
  ) {
    this.options = opts.options;
    this.matcher = opts.matcher ?? substringMatcher;

    /* remember mouse for positioning */
    ws.getInjectionDiv().addEventListener('pointermove', (ev) => {
      this.lastX = ev.clientX;
      this.lastY = ev.clientY;
    });
  }

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
    console.log('chosen:', value); // TODO: create block / etc.
    Blockly.WidgetDiv.hide();
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
