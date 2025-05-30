import * as Blockly from 'blockly/core';
import {FloatingInputController} from './controller';
import {Option, Matcher} from '../types';

const SHORTCUT = 'floatInput';

export interface InstallOptions {
  options: Option[];
  matcher?: Matcher;
}

/**
 * Installs the floating input controller on the given workspace.
 */
export function installFloatingInput(
  ws: Blockly.WorkspaceSvg,
  {options, matcher}: InstallOptions,
): void {
  const controller = new FloatingInputController(ws, {options, matcher});

  const isPrintable = (k: KeyboardEvent) =>
    k.key.length === 1 && !k.ctrlKey && !k.metaKey && !k.altKey;

  Blockly.ShortcutRegistry.registry.register(
    {
      name: SHORTCUT,
      preconditionFn: () =>
        !(Blockly as any).FieldTextInput.activeField &&
        !Blockly.WidgetDiv.isVisible(),
      callback: (_ws, ev) => {
        const kev = ev as KeyboardEvent;
        controller.show(isPrintable(kev) ? kev.key : '');
        return true;
      },
    },
    true,
  );

  const SKIP = new Set([8, 46]); // 8 = Backspace, 46 = Delete
  // NOTE: Plain keys (no modifiers)
  for (let code = 0; code <= 222; ++code) {
    if (SKIP.has(code)) continue;
    Blockly.ShortcutRegistry.registry.addKeyMapping(code, SHORTCUT, true);
  }

  // NOTE: Shift+key variants – enables capitals and symbols
  const SHIFT =
    (Blockly.ShortcutRegistry as any).modifierKeys?.Shift ??
    (Blockly.ShortcutRegistry as any).modifierKeys?.SHIFT ??
    16; // fall-back keyCode
  for (let code = 0; code <= 222; ++code) {
    if (SKIP.has(code)) continue;
    const shifted = Blockly.ShortcutRegistry.registry.createSerializedKey(
      code,
      [SHIFT],
    );
    Blockly.ShortcutRegistry.registry.addKeyMapping(shifted, SHORTCUT, true);
  }
}
