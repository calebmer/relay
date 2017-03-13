/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @providesModule RelayCompiler
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _map2 = _interopRequireDefault(require('babel-runtime/core-js/map'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('./RelayIRTransforms'),
    CODEGEN_TRANSFORMS = _require.CODEGEN_TRANSFORMS,
    FRAGMENT_TRANSFORMS = _require.FRAGMENT_TRANSFORMS,
    QUERY_TRANSFORMS = _require.QUERY_TRANSFORMS,
    PRINT_TRANSFORMS = _require.PRINT_TRANSFORMS,
    VALIDATORS = _require.VALIDATORS;

/**
 * A utility class for parsing a corpus of GraphQL documents, transforming them
 * with a standardized set of transforms, and generating runtime representations
 * of each definition.
 */
var RelayCompiler = function () {

  // The context passed in must already have any Relay-specific schema extensions
  function RelayCompiler(schema, context) {
    (0, _classCallCheck3['default'])(this, RelayCompiler);

    this._context = context;
    // some transforms depend on this being the original schema,
    // not the transformed schema/context's schema
    this._schema = schema;
  }

  RelayCompiler.prototype.clone = function clone() {
    return new RelayCompiler(this._schema, this._context);
  };

  RelayCompiler.prototype.context = function context() {
    return this._context;
  };

  RelayCompiler.prototype.addDefinitions = function addDefinitions(definitions) {
    this._context = this._context.addAll(definitions);
    return this._context.documents();
  };

  RelayCompiler.prototype.transformedQueryContext = function transformedQueryContext() {
    var _this = this;

    return QUERY_TRANSFORMS.reduce(function (ctx, transform) {
      return transform(ctx, _this._schema);
    }, this._context);
  };

  RelayCompiler.prototype.compile = function compile() {
    var _this2 = this;

    var transformContext = function transformContext(ctx, transform) {
      return transform(ctx, _this2._schema);
    };
    var fragmentContext = FRAGMENT_TRANSFORMS.reduce(transformContext, this._context);
    var queryContext = this.transformedQueryContext();
    var printContext = PRINT_TRANSFORMS.reduce(transformContext, queryContext);
    var codeGenContext = CODEGEN_TRANSFORMS.reduce(transformContext, queryContext);

    var validationErrors = [];
    VALIDATORS.forEach(function (validate) {
      var errors = validate(_this2._context);
      validationErrors.push.apply(validationErrors, errors);
    });
    require('fbjs/lib/invariant')(!validationErrors.length, 'RelayCompiler: Encountered validation errors:\n%s', validationErrors.map(function (msg) {
      return '* ' + msg;
    }).join('\n'));

    var compiledDocuments = new _map2['default']();
    fragmentContext.documents().forEach(function (node) {
      if (node.kind !== 'Fragment') {
        return;
      }
      var generatedFragment = require('./RelayCodeGenerator').generate(node);
      compiledDocuments.set(node.name, generatedFragment);
    });
    queryContext.documents().forEach(function (node) {
      if (node.kind !== 'Root') {
        return;
      }
      var name = node.name;
      // The unflattened query is used for printing, since flattening creates an
      // invalid query.

      var text = require('./filterContextForNode')(printContext.getRoot(name), printContext).documents().map(require('./RelayPrinter').print).join('\n');
      // The original query (with fragment spreads) is converted to a fragment
      // for reading out the root data.
      var sourceNode = fragmentContext.getRoot(name);
      var rootFragment = buildFragmentForRoot(sourceNode);
      var generatedFragment = require('./RelayCodeGenerator').generate(rootFragment);
      // The flattened query is used for codegen in order to reduce the number of
      // duplicate fields that must be processed during response normalization.
      var codeGenNode = codeGenContext.getRoot(name);
      var generatedQuery = require('./RelayCodeGenerator').generate(codeGenNode);

      var batchQuery = {
        fragment: generatedFragment,
        id: null,
        kind: 'Batch',
        metadata: node.metadata || {},
        name: name,
        query: generatedQuery,
        text: text
      };
      compiledDocuments.set(name, batchQuery);
    });
    return compiledDocuments;
  };

  return RelayCompiler;
}();

/**
 * Construct the fragment equivalent of a root node.
 */


function buildFragmentForRoot(root) {
  return {
    argumentDefinitions: root.argumentDefinitions,
    directives: root.directives,
    kind: 'Fragment',
    metadata: null,
    name: root.name,
    selections: root.selections,
    type: root.type
  };
}

module.exports = RelayCompiler;