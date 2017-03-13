/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @providesModule RelayViewerHandleTransform
 */

'use strict';

var _extends3 = _interopRequireDefault(require('babel-runtime/helpers/extends'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('./RelaySchemaUtils'),
    getRawType = _require.getRawType;

var VIEWER_HANDLE = 'viewer';
var VIEWER_TYPE = 'Viewer';

/**
 * A transform that adds a "viewer" handle to all fields whose type is `Viewer`.
 */
function transform(context, schema) {
  var viewerType = schema.getType(VIEWER_TYPE);
  require('fbjs/lib/invariant')(viewerType, 'RelayViewerHandleTransform: Expected the schema to have a `%s` type, ' + 'cannot transform context.', VIEWER_TYPE);
  return require('./RelayIRTransformer').transform(context, {
    LinkedField: visitLinkedField
  }, function () {
    return viewerType;
  });
}

function visitLinkedField(field, state) {
  var transformedNode = this.traverse(field, state);
  if (getRawType(field.type) !== state) {
    return transformedNode;
  }
  var handles = transformedNode.handles;
  if (handles && !handles.indexOf(VIEWER_HANDLE)) {
    handles = [].concat(handles, [VIEWER_HANDLE]);
  } else if (!handles) {
    handles = [VIEWER_HANDLE];
  }
  return handles !== transformedNode.handles ? (0, _extends3['default'])({}, transformedNode, { handles: handles }) : transformedNode;
}

module.exports = { transform: transform };