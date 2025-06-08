# blockly-typeblocking [![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

A [Blockly](https://www.npmjs.com/package/blockly) plugin that enables block creation by typing instead of navigating
through the toolbox. This plugin abstracts MIT App Inventor's [TypeBlocking](https://appinventor.mit.edu/explore/tips/typeblocking)
functionality into a standalone, reusable Blockly plugin.

## Features

- **Dynamic Option Generation** - Automatically reflects workspace state (variables, procedures, events)
- **Smart Pattern Recognition** - Creates blocks from natural input like "42", "true", "2 + 3", "set x to 5"
- **Contextual Block Connections** - Automatically connects newly created blocks with smart positioning
- **Configurable Input Positioning** - Choose between mouse-following or fixed-position input
- **Performance Optimized** - Lazy loading and intelligent caching for large workspaces
- **Extensible Architecture** - Clean interfaces for customization
- **TypeScript Support** - Full type definitions included

## Installation

### npm
NOTE: This plugin has not been published to npm yet. You can install it from the source code repository.

```bash
npm install @mit-app-inventor/blockly-typeblocking
```

### Yarn

```bash
yarn add @mit-app-inventor/blockly-typeblocking
```

## Basic Usage

```typescript
import * as Blockly from 'blockly';
import {TypeBlocking} from '@mit-app-inventor/blockly-typeblocking';

// Inject Blockly workspace
const workspace = Blockly.inject('blocklyDiv', {
  toolbox: toolboxCategories,
});

// Initialize TypeBlocking plugin
const typeBlocking = new TypeBlocking(workspace);
typeBlocking.init();

// The plugin is now active! Users can:
// - Press any key to open the autocomplete
// - Type to filter options (e.g., "if", "set item to", "get myVar")
// - Type natural input (e.g., "42", "true", "2 + 3", "set x to 5")
// - Use arrow keys and Enter to select blocks
// - Press Escape to cancel
// - Blocks automatically connect when appropriate
```

## Advanced Configuration

### Pattern Recognition

Enable natural language block creation:

```typescript
typeBlocking.init({
  enablePatternRecognition: true, // Default: true
  patternConfig: {
    enableNumberDetection: true,      // "42" → math_number block
    enableTextDetection: true,        // "hello" → text block
    enableBooleanDetection: true,     // "true" → logic_boolean block
    enableMathExpressions: true,      // "2 + 3" → math_arithmetic block
    enableVariableAssignments: true, // "set x to 5" → variable assignment
    confidenceThreshold: 0.7,        // Pattern matching confidence
    customPatterns: []                // Add your own patterns
  }
});
```

### Smart Block Connections

Configure intelligent block positioning and connections:

```typescript
typeBlocking.init({
  enableSmartConnection: true, // Default: true
  connectionConfig: {
    enableAutoConnection: true,     // Auto-connect compatible blocks
    connectionRadius: 200,          // Search radius for nearby blocks (pixels)
    maxNearbyBlocks: 10,           // Max blocks to consider for connection
    strategies: [                   // Custom connection strategies
      new ValueInputConnector(),
      new StatementSequenceConnector()
    ]
  }
});
```

### Input Positioning

Control where the floating input appears:

```typescript
// Fixed position (great for accessibility)
typeBlocking.init({
  inputPositioning: {
    mode: 'fixed',
    fixedPosition: { x: 100, y: 50 } // Pixels from workspace top-left
  }
});

// Mouse-following (default behavior)
typeBlocking.init({
  inputPositioning: {
    mode: 'mouse' // Appears at last mouse position
  }
});
```

### Complete Configuration Example

```typescript
typeBlocking.init({
  // Core settings
  enableDynamicOptions: true,

  // Pattern recognition for natural input
  enablePatternRecognition: true,
  patternConfig: {
    enableNumberDetection: true,
    enableTextDetection: true,
    enableBooleanDetection: true,
    enableMathExpressions: true,
    enableVariableAssignments: true,
    confidenceThreshold: 0.8
  },

  // Smart block connections
  enableSmartConnection: true,
  connectionConfig: {
    enableAutoConnection: true,
    connectionRadius: 250,
    maxNearbyBlocks: 15
  },

  // Fixed input position (accessibility-friendly)
  inputPositioning: {
    mode: 'fixed',
    fixedPosition: { x: 20, y: 20 }
  },

  // Custom option generation
  optionGenerator: new CustomOptionGenerator()
});
```

### Custom Options (Legacy Mode)

```typescript
// Static options (legacy mode)
typeBlocking.init({
  enableDynamicOptions: false,
  options: [
    { blockType: 'custom_block_1', displayText: 'custom block 1' },
    { blockType: 'custom_block_2', displayText: 'custom block 2' }
  ],
  matcher: customMatcherFunction
});
```

### Custom Option Generation

A made up example of how to implement a custom option generator for App Inventor:

```typescript
import {OptionGenerator, Option} from '@mit-app-inventor/blockly-typeblocking';

class AppInventorOptionGenerator implements OptionGenerator {
  generateOptions(): Option[] {
    return [
      ...this.getVariableOptions(),
      ...this.getProcedureOptions(),
      ...this.getComponentOptions(), // App Inventor specific
      ...this.getBuiltinBlockOptions()
    ];
  }

  getVariableOptions(): Option[] {
    // Custom variable option generation
    return [
      { blockType: 'get global myVar', displayText: 'get global myVar' },
      { blockType: 'set global myVar to', displayText: 'set global myVar to' }
    ];
  }

  getProcedureOptions(): Option[] {
    // Custom procedure option generation
    return [
      { blockType: 'myProcedure', displayText: 'myProcedure' },
      { blockType: 'calculate(x, y)', displayText: 'calculate(x, y)' }
    ];
  }

  getBuiltinBlockOptions(): Option[] {
    // App Inventor's block library with user-friendly display text
    return [
      { blockType: 'when_Button_Click', displayText: 'when Button.Click' },
      { blockType: 'set_Label_Text_to', displayText: 'set Label.Text to' },
      { blockType: 'lists_create_with', displayText: 'create list with' }
    ];
  }
}

// Use custom generator
typeBlocking.init({
  optionGenerator: new AppInventorOptionGenerator()
});
```

### Custom Scope Analysis
Note: there is an existing `LexicalScopeAnalyzer` class that currently fallbacks to the `BasicScopeAnalyzer` for
compatibility. The idea is to eventually integrate it with the `block-lexical-variables` plugin.
Here's an example of how you might implement a custom scope analyzer:

```typescript
import {ScopeAnalyzer} from '@mit-app-inventor/blockly-typeblocking';

class LexicalScopeAnalyzer implements ScopeAnalyzer {
  getLocalVariablesInScope(): string[] {
    // Integration with lexical variables plugin
    return this.lexicalPlugin.getVariablesInScope();
  }
}
```

### Custom Matching

```typescript
import {Matcher, Option} from '@mit-app-inventor/blockly-typeblocking';

const fuzzyMatcher: Matcher = (options, query) => {
  // Custom fuzzy matching logic - matches against displayText
  return options.filter(option => 
    option.displayText.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => {
    // Custom ranking logic based on display text
    return a.displayText.indexOf(query) - b.displayText.indexOf(query);
  });
};

typeBlocking.init({
  matcher: fuzzyMatcher
});
```

## How It Works

### Dynamic Option Generation

The plugin automatically generates typeblock options from your workspace:

1. **Variables**: Creates "get variableName" and "set variableName to" options
2. **Procedures**: Creates procedure call options with parameter hints
3. **Built-in Blocks**: Uses existing `typeblock` properties or generates from block types
4. **Scope-Aware**: Local variables only appear when in scope (with proper scope analyzer)

A note on built-in blocks: By default, blocks without a `typeblock` property will have their
block type converted to display text by replacing underscores with spaces. For example:
- `lists_create_with` displays as "lists create with"
- `math_arithmetic` displays as "math arithmetic"

For better user experience, blocks should define a `typeblock` property with human-friendly text.
The plugin will use this text as the display text while still using the actual block type for creation.

### Smart Pattern Recognition

The plugin recognizes natural input patterns and creates appropriate blocks:

1. **Numbers**: `42`, `3.14`, `-5` → `math_number` blocks
2. **Text**: `"hello world"`, `'text'` → `text` blocks
3. **Booleans**: `true`, `false` → `logic_boolean` blocks
4. **Math Expressions**: `2 + 3`, `10 / 2` → `math_arithmetic` blocks with connected operands
5. **Variable Assignments**: `set x to 5` → `variables_set` block with connected value

### Contextual Block Connections

When blocks are created, the plugin automatically:

1. **Finds nearby compatible blocks** within a configurable radius
2. **Prioritizes connections** based on compatibility and context
3. **Connects blocks intelligently** using multiple connection strategies:
   - **Value Input**: Connects output blocks to input connections
   - **Statement Sequence**: Connects statement blocks in sequence
   - **Statement Insertion**: Inserts blocks within statement chains

### Automatic Block Creation

When users select options, the plugin:

1. **Tries pattern recognition first** for natural input
2. **Falls back to typeblock parsing** using regex patterns
3. **Creates appropriate block types** (e.g., `variables_get`, `procedures_callnoreturn`)
4. **Configures block fields** (variable references, procedure names)
5. **Positions blocks intelligently** with anti-overlap logic
6. **Attempts smart connections** to nearby compatible blocks

### Performance & Caching

- **Lazy Loading**: Options generated only when autocomplete is shown
- **Intelligent Caching**: Cache invalidated only on relevant workspace changes
- **Event-Driven Updates**: Monitors variable/procedure creation/deletion
- **Debounced Regeneration**: Batches rapid workspace changes

## Architecture Overview

### Core Classes

- **`TypeBlocking`** - Main plugin class, handles initialization and lifecycle
- **`OptionGenerator`** - Generates dynamic options from workspace state
- **`ScopeAnalyzer`** - Analyzes local variable scope for context-aware options
- **`BlockFactory`** - Creates and configures blocks from typeblock text
- **`WorkspaceStateTracker`** - Monitors workspace changes for cache invalidation

NOTE: there might be a case for exposing the default OptionGenerator and ScopeAnalyzer classes
so they can be extended or used as a base for custom implementations.

### Design Principles

1. **Clean API Surface** - Only essential classes and types are exported
2. **Interface-Based Customization** - Power users implement interfaces rather than extending classes
3. **Separation of Concerns** - Each class has a single, well-defined responsibility
4. **Performance First** - Lazy loading and intelligent caching throughout

## API Reference

### Main Plugin Class

```typescript
class TypeBlocking {
  constructor(workspace: Blockly.WorkspaceSvg)
  init(options?: InstallOptions): void
  dispose(): void
}

interface InstallOptions {
  // Core Options
  options?: Option[];                    // Static options (legacy mode)
  matcher?: Matcher;                     // Custom matching function
  optionGenerator?: OptionGenerator;     // Custom option generation
  enableDynamicOptions?: boolean;        // Enable/disable dynamic features (default: true)

  // Pattern Recognition
  enablePatternRecognition?: boolean;    // Enable natural input patterns (default: true)
  patternConfig?: PatternConfig;         // Pattern recognition configuration

  // Smart Connections
  enableSmartConnection?: boolean;       // Enable intelligent block connections (default: true)
  connectionConfig?: ConnectionConfig;   // Connection behavior configuration

  // Input Positioning
  inputPositioning?: InputPositioningConfig; // Control floating input position
}
```

### Customization Interfaces

```typescript
interface Option {
  blockType: string;    // The block type identifier used for block creation
  displayText: string;  // Human-friendly display text shown in autocomplete
}

interface OptionGenerator {
  generateOptions(): Option[];
  getVariableOptions(): Option[];
  getProcedureOptions(): Option[];
  getBuiltinBlockOptions(): Option[];
}

interface ScopeAnalyzer {
  getLocalVariablesInScope(position?: {x: number, y: number}): string[];
}

interface Matcher {
  (options: Option[], query: string): Option[];
}

interface PatternConfig {
  enableNumberDetection?: boolean;       // Detect numeric input (default: true)
  enableTextDetection?: boolean;         // Detect quoted strings (default: true)
  enableBooleanDetection?: boolean;      // Detect true/false (default: true)
  enableMathExpressions?: boolean;       // Detect "2 + 3" style input (default: true)
  enableVariableAssignments?: boolean;   // Detect "set x to value" (default: true)
  customPatterns?: InputPattern[];       // Add custom pattern recognizers
  patternPriorities?: Record<string, number>; // Override pattern priorities
  confidenceThreshold?: number;          // Minimum confidence for pattern match (default: 0.7)
}

interface ConnectionConfig {
  enableAutoConnection?: boolean;        // Auto-connect blocks (default: true)
  connectionRadius?: number;             // Search radius in pixels (default: 200)
  maxNearbyBlocks?: number;             // Max blocks to consider (default: 10)
  strategies?: ConnectionStrategy[];     // Custom connection strategies
}

interface InputPositioningConfig {
  mode?: 'mouse' | 'fixed';             // Positioning mode (default: 'mouse')
  fixedPosition?: {                     // Position when mode is 'fixed'
    x: number;                          // X pixels from workspace left (default: 100)
    y: number;                          // Y pixels from workspace top (default: 10)
  };
}
```

## Development

### Building

```bash
npm run build
```

### Testing

```bash
npm run test
```

### Development Server

```bash
npm run start
```

## Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Contributing

This plugin is part of the MIT App Inventor Blockly plugins monorepo. See the main README for contribution guidelines.

## Credits

Based on the original TypeBlocking implementation from [MIT App Inventor](https://github.com/mit-cml/appinventor-sources/blob/master/appinventor/blocklyeditor/src/typeblock.js).

## License

Apache 2.0
