/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule isRelayStaticContext
 * 
 */

'use strict';

/**
 * Determine if the object is a plain object that matches the `RelayContext`
 * type.
 */
function isRelayStaticContext(context) {
  return typeof context === 'object' && context !== null && !Array.isArray(context) && require('./isRelayStaticEnvironment')(context.environment) && require('./isRelayVariables')(context.variables);
}

module.exports = isRelayStaticContext;