/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayStripRootAliasTransform
 * 
 */

'use strict';

var _extends3 = _interopRequireDefault(require('babel-runtime/helpers/extends'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * A transform to strip any alias from a root field. This is necessary (for now)
 * as some server endpoints do not support root field aliases.
 */
function transform(context) {
  var documents = context.documents();
  return documents.reduce(function (ctx, node) {
    if (node.kind === 'Root') {
      // Only transform roots, not fragments
      var selections = transformSelections(node.selections);
      return ctx.add((0, _extends3['default'])({}, node, {
        selections: selections
      }));
    }
    return ctx.add(node);
  }, new (require('./RelayCompilerContext'))(context.schema));
}

function transformSelections(nodeSelections) {
  return nodeSelections.map(function (selection) {
    if (selection.kind === 'LinkedField' || selection.kind === 'ScalarField') {
      return (0, _extends3['default'])({}, selection, {
        alias: null
      });
    } else if (selection.kind === 'InlineFragment' || selection.kind === 'Condition') {
      var selections = transformSelections(selection.selections);
      return (0, _extends3['default'])({}, selection, {
        selections: selections
      });
    } else if (selection.kind === 'FragmentSpread') {
      require('fbjs/lib/invariant')(false, 'RelayAutoAliasTransform: Fragment spreads are not supported at the ' + 'root.', selection.kind);
    } else {
      require('fbjs/lib/invariant')(false, 'RelayAutoAliasTransform: Unexpected node kind `%s`.', selection.kind);
    }
  });
}

module.exports = { transform: transform };