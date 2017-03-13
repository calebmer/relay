/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule fetchStaticQuery
 * 
 */

'use strict';

var _promise2 = _interopRequireDefault(require('fbjs/lib/Promise'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('./RelayStaticGraphQLTag'),
    getOperation = _require.getOperation;

var _require2 = require('./RelayStaticOperationSelector'),
    createOperationSelector = _require2.createOperationSelector;

/**
 * A helper function to fetch the results of a query without writing to Relay.
 * Note that compiling step might add additional `id` and `__typename` fields.
 *
 * NOTE: This module is primarily intended for integrating with legacy APIs.
 * Most product code should use a Renderer or Container.
 */
function fetchStaticQuery(network, taggedNode, variables, cacheConfig) {
  var query = getOperation(taggedNode);
  var operation = createOperationSelector(query, variables);
  return network.fetch(operation.node, operation.variables, cacheConfig);
}

module.exports = fetchStaticQuery;