import * as Blockly from "blockly/core";
import {SHORTCUT} from "./constants";
import {FloatingInputController} from "./autocomplete/controller";
import {Option, Matcher} from './types';

export interface InstallOptions {
    options: Option[];
    matcher?: Matcher;
}
/**
 * Create blocks by typing instead of navigating through the toolbox.
 */
export class TypeBlocking {
    /** The workspace. */
    protected workspace: Blockly.WorkspaceSvg;

    /**
     * Constructor for ...
     * @param workspace The workspace that the plugin will
     *     be added to.
     */
    constructor(workspace: Blockly.WorkspaceSvg) {
        this.workspace = workspace;
    }

    /**
     * Initialize.
     */
    init(): void {
        const allTypeblockTexts = [];
        // FIXME: Quick and dirty way to add typeblocks to all internal blocks
        // except for IF; just for development.
        Blockly.Blocks['controls_if'].typeblock = Blockly.Msg.CONTROLS_IF_MSG_IF;
        for (const blockType in Blockly.Blocks) {
            if (blockType.split('_').length > 1) {
                if (!Blockly.Blocks[blockType].typeblock) {
                    Blockly.Blocks[blockType].typeblock = blockType;
                }
                allTypeblockTexts.push(Blockly.Blocks[blockType].typeblock);
            }
        }

        this.installFloatingInput({options: allTypeblockTexts});
        console.info('Typeblocking initialized on workspace: still going', this.workspace.id);
    }

    /**
     * Dispose of the plugin.
     */
    dispose(): void {
        if (!this.workspace) return;
        const ws = this.workspace;

        // TODO: remove event listeners - I will need access to them - Can I set them up as Blockly events?
        // const injectionDiv = ws.getInjectionDiv();
        // injectionDiv.removeEventListener('pointermove', this.pointerMoveHandler);
        // injectionDiv.removeEventListener('keydown', this.keyHandler);
        Blockly.ShortcutRegistry.registry.unregister(SHORTCUT);

        Blockly.DropDownDiv.hideWithoutAnimation();


        const id = ws.id;
        // @ts-expect-error – intentional reference break for GC.
        this.workspace = null;
        console.info(`Typeblocking disposed from workspace ${id}`);
    }

    installFloatingInput(
        {options, matcher}: InstallOptions,
    ): void {
        const controller = new FloatingInputController(this.workspace, {options, matcher});

        const isPrintable = (k: KeyboardEvent) =>
            k.key.length === 1 && !k.ctrlKey && !k.metaKey && !k.altKey;

        Blockly.ShortcutRegistry.registry.register({
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
    }
}