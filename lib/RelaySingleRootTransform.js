/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelaySingleRootTransform
 * 
 */

'use strict';

var _set2 = _interopRequireDefault(require('babel-runtime/core-js/set'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('./RelayIRVisitor'),
    visit = _require.visit;

/**
 * A transform that creates a context that is the minimal set of
 * Root | Fragment required to send the provided Root query as a query
 * string request.
 *
 * Given a root:
 *
 * ```
 * query ViewerQuery {
 *   viewer {
 *     ...ViewerFragment0
 *   }
 * }
 * ```
 *
 * And some fragments:
 *
 * ```
 * fragment ViewerFragment0 on Viewer {
 *   ...ViewerFragment2
 * }
 * fragment ViewerFragment1 on Viewer {
 *   id
 * }
 * fragment ViewerFragment2 on Viewer {
 *   name
 * }
 * ```
 *
 * This transform will output:
 *
 * ```
 * query ViewerQuery {
 *   viewer {
 *     ...ViewerFragment0
 *   }
 * }
 * fragment ViewerFragment0 on Viewer {
 *   ...ViewerFragment2
 * }
 * fragment ViewerFragment2 on Viewer {
 *   name
 * }
 * ```
 *
 */
function transform(context, root) {
  var docNames = visitSubFragments(root, context, new _set2['default']([root.name]));
  var ctx = new (require('./RelayCompilerContext'))(context.schema);
  docNames.forEach(function (name) {
    ctx = ctx.add(require('fbjs/lib/nullthrows')(context.get(name)));
  });
  return ctx;
}

/**
 * @internal
 *
 * Recursively build the set of fragments the Root depends on.
 */
function visitSubFragments(fragment, context, visited) {
  visit(fragment, {
    FragmentSpread: function FragmentSpread(spread) {
      if (!visited.has(spread.name)) {
        visited.add(spread.name);
        visitSubFragments(require('fbjs/lib/nullthrows')(context.get(spread.name)), context, visited);
      }
    }
  });

  return visited;
}

module.exports = { transform: transform };