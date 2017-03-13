/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayLegacyCore
 * 
 */

'use strict';

var _require = require('./RelayGraphQLTag'),
    getLegacyFragment = _require.getLegacyFragment,
    getLegacyOperation = _require.getLegacyOperation;

var _require2 = require('./RelayOperationSelector'),
    createOperationSelector = _require2.createOperationSelector;

var _require3 = require('./RelaySelector'),
    areEqualSelectors = _require3.areEqualSelectors,
    getDataIDsFromObject = _require3.getDataIDsFromObject,
    getSelector = _require3.getSelector,
    getSelectorList = _require3.getSelectorList,
    getSelectorsFromObject = _require3.getSelectorsFromObject,
    getVariablesFromObject = _require3.getVariablesFromObject;

function createFragmentSpecResolver(context, fragments, props, callback) {
  return new (require('./RelayFragmentSpecResolver'))(context, fragments, props, callback);
}

/**
 * The legacy implementation of the `RelayCore` interface defined in
 * `RelayEnvironmentTypes`.
 */
module.exports = {
  areEqualSelectors: areEqualSelectors,
  createFragmentSpecResolver: createFragmentSpecResolver,
  createOperationSelector: createOperationSelector,
  getDataIDsFromObject: getDataIDsFromObject,
  getFragment: getLegacyFragment,
  getOperation: getLegacyOperation,
  getSelector: getSelector,
  getSelectorList: getSelectorList,
  getSelectorsFromObject: getSelectorsFromObject,
  getVariablesFromObject: getVariablesFromObject
};