/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayGraphQLTag
 * 
 */

'use strict';

var _stringify2 = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Runtime function to correspond to the `graphql` tagged template function.
 * All calls to this function should be transformed by the plugin.
 */


// The type of a graphql`...` tagged template expression.
function graphql() {
  require('fbjs/lib/invariant')(false, 'graphql: Unexpected invocation at runtime. Either the Babel transform ' + 'was not set up, or it failed to identify this call site. Make sure it ' + 'is being used verbatim as `graphql`.');
}

/**
 * Variant of the `graphql` tag that enables experimental features.
 */
graphql.experimental = function () {
  require('fbjs/lib/invariant')(false, 'graphql.experimental: Unexpected invocation at runtime. Either the ' + 'Babel transform was not set up, or it failed to identify this call ' + 'site. Make sure it is being used verbatim as `graphql.experimental`.');
};

var LEGACY_NODE = '__legacy_node__';

/**
 * Memoizes the results of executing the `.relay()` functions on
 * graphql`...` tagged expressions. Memoization allows the framework to use
 * object equality checks to compare fragments (useful, for example, when
 * comparing two `Selector`s to see if they select the same data).
 */
function getLegacyNode(taggedNode) {
  var concreteNode = taggedNode[LEGACY_NODE];
  if (concreteNode == null) {
    var fn = taggedNode.relay;
    require('fbjs/lib/invariant')(typeof fn === 'function', 'RelayGraphQLTag: Expected a graphql literal, got `%s`.', (0, _stringify2['default'])(taggedNode));
    concreteNode = fn();
    taggedNode[LEGACY_NODE] = concreteNode;
  }
  return concreteNode;
}

function getLegacyFragment(taggedNode) {
  var concreteNode = getLegacyNode(taggedNode);
  var fragment = require('./QueryBuilder').getFragmentDefinition(concreteNode);
  require('fbjs/lib/invariant')(fragment, 'RelayGraphQLTag: Expected a fragment, got `%s`.', (0, _stringify2['default'])(concreteNode));
  return fragment;
}

function getLegacyOperation(taggedNode) {
  var concreteNode = getLegacyNode(taggedNode);
  var operation = require('./QueryBuilder').getOperationDefinition(concreteNode);
  require('fbjs/lib/invariant')(operation, 'RelayGraphQLTag: Expected an operation, got `%s`.', (0, _stringify2['default'])(concreteNode));
  return operation;
}

module.exports = {
  getLegacyFragment: getLegacyFragment,
  getLegacyOperation: getLegacyOperation,
  graphql: graphql
};