// FIXME: Not used anymore. Delete (eventually) after testing
import * as Blockly from 'blockly/core';
/**
 *
 * @param ws
 */
function installFloatingInput(ws: Blockly.WorkspaceSvg): void {
  const SHORTCUT = 'floatInput';

  let lastClientX = 0;
  let lastClientY = 0;
  ws.getInjectionDiv().addEventListener('pointermove', (ev: PointerEvent) => {
    lastClientX = ev.clientX;
    lastClientY = ev.clientY;
  });

  /**
   *
   * @param initial
   */
  function showInput(initial: string): void {
    Blockly.WidgetDiv.show(
        {},
        ws.RTL,
        () => ws.getInjectionDiv().focus(),
        ws,
        true
    );

    const widgetDiv = Blockly.WidgetDiv.getDiv()!;
    widgetDiv.innerHTML = '';

    const input = document.createElement('input');
    input.type = 'text';
    input.spellcheck = false;
    input.value = initial;
    widgetDiv.appendChild(input);

    let left = lastClientX;
    let top = lastClientY;
    if (left === 0 && top === 0) {
      const rect = ws.getInjectionDiv().getBoundingClientRect();
      left = rect.left + rect.width / 2;
      top = rect.top + rect.height / 2;
    }
    widgetDiv.style.position = 'fixed';
    widgetDiv.style.left = `${left}px`;
    widgetDiv.style.top = `${top}px`;

    setTimeout(() => {
      input.focus();
      input.setSelectionRange(input.value.length, input.value.length);
    });

    const close = () => Blockly.WidgetDiv.hide();
    input.addEventListener('keydown', (kev: KeyboardEvent) => {
      if (kev.key === 'Enter' || kev.key === 'Escape') {
        // read input.value here if needed
        close();
      }
      kev.stopPropagation();
    });
    input.addEventListener('blur', close);
  }

  const isPrintable = (kev: KeyboardEvent) =>
    kev.key.length === 1 && !kev.ctrlKey && !kev.metaKey && !kev.altKey;

  Blockly.ShortcutRegistry.registry.register({
    name: SHORTCUT,
    preconditionFn: () =>
      !(Blockly as any).FieldTextInput.activeField &&
      !Blockly.WidgetDiv.isVisible(),

    callback: (
        ws: Blockly.WorkspaceSvg,
        ev: Event,
    ): boolean => {
      const kev = ev as KeyboardEvent;
      showInput(isPrintable(kev) ? kev.key : '');
      return true;
    },
  }, true);

  // NOTE: Plain keys (no modifiers)
  for (let code = 0; code <= 222; ++code) {
    Blockly.ShortcutRegistry.registry.addKeyMapping(code, SHORTCUT, true);
  }

  // NOTE: Shift+key variants – enables capitals and symbols
  const SHIFT = (Blockly.ShortcutRegistry as any).modifierKeys?.Shift ??
    (Blockly.ShortcutRegistry as any).modifierKeys?.SHIFT ??
    16; // fall-back keyCode
  for (let code = 0; code <= 222; ++code) {
    const shifted = Blockly.ShortcutRegistry.registry.createSerializedKey(
        code, [SHIFT]
    );
    Blockly.ShortcutRegistry.registry.addKeyMapping(shifted, SHORTCUT, true);
  }
}
