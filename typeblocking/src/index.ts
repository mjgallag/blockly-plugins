/**
 * @license
 * Copyright 2025 App Inventor Foundation
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * @fileoverview Plugin to provide TypeBlocking to Blockly. Blocks can be
 * created by typing instead of having to navigate through the toolbox.
 */
export {TypeBlocking} from './typeblocking';

// Types for customization - power users can implement these interfaces
export type {
  Option,
  Matcher,
  OptionGenerator,
  ScopeAnalyzer
} from './types';

// Smart connection types for advanced users
export type {
  ConnectionStrategy,
  ConnectionContext,
  ConnectionResult
} from './block-actions/connection-strategies';
export type {SmartPositioningConfig} from './block-actions/smart-block-positioner';

// NOTE: there might be a case for exporting the default Options Generator and Analyzer