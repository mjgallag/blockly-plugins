import * as Blockly from "blockly/core";
import {SHORTCUT} from "./constants";
import {Option, Matcher, OptionGenerator, WorkspaceStateTracker, InputPositioningConfig} from './types';
import {WorkspaceOptionGenerator} from './autocomplete/option-generator';
import {SmartOptionGenerator} from './autocomplete/smart-option-generator';
import {DefaultWorkspaceStateTracker} from './autocomplete/workspace-state-tracker';
import {BasicScopeAnalyzer} from './autocomplete/scope-analyzer';
import {DynamicFloatingInputController} from './autocomplete/dynamic-controller';
import {ConnectionConfig} from './block-actions/connection-manager';
import {PatternConfig} from './input-patterns/pattern-types';

export interface InstallOptions {
    options?: Option[];
    matcher?: Matcher;
    optionGenerator?: OptionGenerator;
    workspaceStateTracker?: WorkspaceStateTracker;
    enableDynamicOptions?: boolean;
    enableSmartConnection?: boolean;
    connectionConfig?: ConnectionConfig;
    enablePatternRecognition?: boolean;
    patternConfig?: PatternConfig;
    inputPositioning?: InputPositioningConfig;
}
/**
 * Create blocks by typing instead of navigating through the toolbox.
 */
export class TypeBlocking {

    protected workspace: Blockly.WorkspaceSvg;
    private optionGenerator?: OptionGenerator;
    private stateTracker?: WorkspaceStateTracker;
    private controller?: DynamicFloatingInputController;

    constructor(workspace: Blockly.WorkspaceSvg) {
        this.workspace = workspace;
    }

    init(options: InstallOptions = {}): void {
        const enableDynamic = options.enableDynamicOptions !== false; // Default to true
        console.log('what am I enabling?', enableDynamic);
        if (enableDynamic) {
            this.setupDynamicOptions(options);
        } else {
            this.setupStaticOptions(options);
        }

        console.info('Typeblocking initialized on workspace:', this.workspace.id);
    }

    private setupDynamicOptions(options: InstallOptions): void {
        if (options.enablePatternRecognition !== false) { // Default to true
            this.optionGenerator = options.optionGenerator || new SmartOptionGenerator(this.workspace, options.patternConfig);
        } else {
            this.optionGenerator = options.optionGenerator || new WorkspaceOptionGenerator(this.workspace);
        }

        if (this.optionGenerator instanceof WorkspaceOptionGenerator) {
            const scopeAnalyzer = new BasicScopeAnalyzer(this.workspace);
            this.optionGenerator.setScopeAnalyzer(scopeAnalyzer);
        }

        this.stateTracker = options.workspaceStateTracker ?? new DefaultWorkspaceStateTracker(this.workspace);

        this.installFloatingInput({
            options: [], // Will be generated dynamically
            matcher: options.matcher,
            enableSmartConnection: options.enableSmartConnection,
            connectionConfig: options.connectionConfig,
            enablePatternRecognition: options.enablePatternRecognition,
            patternConfig: options.patternConfig,
            inputPositioning: options.inputPositioning
        });
    }

    /**
     * Setup static options (legacy behavior).
     * TODO: Remove in future versions.
     */
    private setupStaticOptions(options: InstallOptions): void {
        const allTypeblockTexts = options.options || this.generateLegacyOptions();

        this.installFloatingInput({
            options: allTypeblockTexts,
            matcher: options.matcher,
            enableSmartConnection: options.enableSmartConnection,
            connectionConfig: options.connectionConfig,
            enablePatternRecognition: options.enablePatternRecognition,
            patternConfig: options.patternConfig,
            inputPositioning: options.inputPositioning
        });
    }

    private generateLegacyOptions(): Option[] {
        const allTypeblockTexts = [];
        // FIXME: Quick and dirty way to add typeblocks to all internal blocks
        // except for IF; just for development.
        Blockly.Blocks['controls_if'].typeblock = Blockly.Msg.CONTROLS_IF_MSG_IF;
        for (const blockType in Blockly.Blocks) {
            if (blockType.split('_').length > 1) { // FIXME: it skips blocks like text.
                if (!Blockly.Blocks[blockType].typeblock) {
                    Blockly.Blocks[blockType].typeblock = blockType;
                }
                allTypeblockTexts.push(Blockly.Blocks[blockType].typeblock);
            }
        }

        return allTypeblockTexts;
    }

    dispose(): void {
        if (!this.workspace) return;
        const ws = this.workspace;

        if (this.stateTracker) {
            this.stateTracker.dispose();
            this.stateTracker = undefined;
        }

        if (this.controller) {
            this.controller.dispose();
            this.controller = undefined;
        }

        Blockly.ShortcutRegistry.registry.unregister(SHORTCUT);
        Blockly.DropDownDiv.hideWithoutAnimation();

        const id = ws.id;
        this.optionGenerator = undefined;
        // @ts-expect-error – intentional reference break for GC.
        this.workspace = null;
        console.info(`Typeblocking disposed from workspace ${id}`);
    }

    installFloatingInput({options = [], matcher, enableSmartConnection, connectionConfig, enablePatternRecognition, patternConfig, inputPositioning}: InstallOptions): void {
        this.controller = new DynamicFloatingInputController(
            this.workspace,
            {
                options,
                matcher,
                optionGenerator: this.optionGenerator,
                stateTracker: this.stateTracker,
                enableSmartConnection,
                connectionConfig,
                enablePatternRecognition,
                patternConfig,
                inputPositioning
            }
        );

        const isPrintable = (k: KeyboardEvent) =>
            k.key.length === 1 && !k.ctrlKey && !k.metaKey && !k.altKey;

        Blockly.ShortcutRegistry.registry.register({
                name: SHORTCUT,
                preconditionFn: () =>
                    !(Blockly as any).FieldTextInput.activeField &&
                    !Blockly.WidgetDiv.isVisible(),
                callback: (_ws, ev) => {
                    const kev = ev as KeyboardEvent;
                    this.controller!.show(isPrintable(kev) ? kev.key : '');
                    return true;
                },
            },
            true,
        );

        const SKIP = new Set([
            8,   // Backspace
            9,   // Tab
            13,  // Enter
            16,  // Shift
            17,  // Ctrl
            18,  // Alt
            19,  // Pause/Break
            20,  // Caps Lock
            27,  // Escape
            33,  // Page Up
            34,  // Page Down
            35,  // End
            36,  // Home
            37,  // Left Arrow
            38,  // Up Arrow
            39,  // Right Arrow
            40,  // Down Arrow
            45,  // Insert
            46,  // Delete
            91,  // Meta
            112, 113, 114, 115, 116, 117,  // F1-F6
            118, 119, 120, 121, 122, 123   // F7-F12
        ]);
        // NOTE: Plain keys (no modifiers)
        for (let code = 0; code <= 222; ++code) {
            if (SKIP.has(code)) continue;
            Blockly.ShortcutRegistry.registry.addKeyMapping(code, SHORTCUT, true);
            // Register shift+key (e.g. ")
            Blockly.ShortcutRegistry.registry.addKeyMapping(
                Blockly.ShortcutRegistry.registry.createSerializedKey(code, [Blockly.utils.KeyCodes.SHIFT]),
                SHORTCUT,
                true
            );
        }
    }
}