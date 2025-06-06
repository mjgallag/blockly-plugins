# blockly-typeblocking [![Built on Blockly](https://tinyurl.com/built-on-blockly)](https://github.com/google/blockly)

A [Blockly](https://www.npmjs.com/package/blockly) plugin that enables block creation by typing instead of navigating
through the toolbox. This plugin abstracts MIT App Inventor's [TypeBlocking](https://appinventor.mit.edu/explore/tips/typeblocking)
functionality into a standalone, reusable Blockly plugin.

## Features

- **Dynamic Option Generation** - Automatically reflects workspace state (variables, procedures, events)
- **Automatic Block Creation** - Handles variables, procedures, and built-in blocks with proper configuration
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
// - Use arrow keys and Enter to select blocks
// - Press Escape to cancel
```

## Advanced Configuration

### Custom Options

```typescript
// Static options (legacy mode)
typeBlocking.init({
  enableDynamicOptions: false,
  options: ['custom block 1', 'custom block 2'],
  matcher: customMatcherFunction
});
```

### Custom Option Generation

A made up example of how to implement a custom option generator for App Inventor:

```typescript
import {OptionGenerator} from '@mit-app-inventor/blockly-typeblocking';

class AppInventorOptionGenerator implements OptionGenerator {
  generateOptions(): string[] {
    return [
      ...this.getVariableOptions(),
      ...this.getProcedureOptions(),
      ...this.getComponentOptions(), // App Inventor specific
      ...this.getBuiltinBlockOptions()
    ];
  }

  getVariableOptions(): string[] {
    // Custom variable option generation
    return ['get global myVar', 'set global myVar to'];
  }

  getProcedureOptions(): string[] {
    // Custom procedure option generation
    return ['myProcedure', 'calculate(x, y)'];
  }

  getBuiltinBlockOptions(): string[] {
    // App Inventor's block library
    return ['when Button.Click', 'set Label.Text to'];
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
import {Matcher} from '@mit-app-inventor/blockly-typeblocking';

const fuzzyMatcher: Matcher = (options, query) => {
  // Custom fuzzy matching logic
  return options.filter(option => 
    option.toLowerCase().includes(query.toLowerCase())
  ).sort((a, b) => {
    // Custom ranking logic
    return a.indexOf(query) - b.indexOf(query);
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

A note on built-in blocks: the default implementation likely does NOT what would be expected.
A `typeblock` property should be used for all blocks, including built-in ones, ideally
pointing to an internationalized string that describes the block's functionality.

This is still a work in progress, so watch this space for updates.


### Automatic Block Creation

When users select options, the plugin:

1. **Parses typeblock text** using regex patterns
2. **Creates appropriate block types** (e.g., `variables_get`, `procedures_callnoreturn`)
3. **Configures block fields** (variable references, procedure names)
4. **Handles some special cases** (dropdowns)

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
  options?: string[];                    // Static options (legacy mode)
  matcher?: Matcher;                     // Custom matching function
  optionGenerator?: OptionGenerator;     // Custom option generation
  enableDynamicOptions?: boolean;        // Enable/disable dynamic features (default: true)
}
```

### Customization Interfaces

```typescript
interface OptionGenerator {
  generateOptions(): string[];
  getVariableOptions(): string[];
  getProcedureOptions(): string[];
  getBuiltinBlockOptions(): string[];
}

interface ScopeAnalyzer {
  getLocalVariablesInScope(position?: {x: number, y: number}): string[];
}

interface Matcher {
  (options: string[], query: string): string[];
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
