/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayExportTransform
 * 
 */

'use strict';

var _extends3 = _interopRequireDefault(require('babel-runtime/helpers/extends'));

var _keys2 = _interopRequireDefault(require('babel-runtime/core-js/object/keys'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('graphql'),
    GraphQLList = _require.GraphQLList;

var EXPORT = 'export';
var AS = 'as';

function transformSchema(schema) {
  var exportSchema = require('./RelaySchemaUtils').parseSchema('\n    # TODO: replace this when extendSchema supports directives\n    schema {\n      query: QueryType\n      mutation: MutationType\n    }\n    type QueryType {\n      id: ID\n    }\n    type MutationType {\n      id: ID\n    }\n    # The actual directive to add\n    directive @export(as: String!) on FIELD\n  ');
  return require('./RelaySchemaUtils').schemaWithDirectives(schema, exportSchema.getDirectives().filter(function (directive) {
    return directive.name === EXPORT;
  }));
}

/**
 * A transform that extracts `@export(as: "<name>")` directives and converts
 * them to metadata that can be accessed at runtime.
 */
function transform(context) {
  return context.documents().reduce(function (ctx, node) {
    if (node.kind === 'Root') {
      var metadata = {};
      var path = [];
      var transformedNode = transformNode(node, path, metadata);
      transformedNode.metadata = transformedNode.metadata || {};
      if ((0, _keys2['default'])(metadata).length) {
        transformedNode.metadata[EXPORT] = metadata;
      }
      return ctx.add(transformedNode);
    } else {
      return ctx.add(node);
    }
  }, new (require('./RelayCompilerContext'))(context.schema));
}

function transformNode(node, path, metadata) {
  var selections = node.selections.map(function (selection) {
    var nextSelection = selection;
    if (selection.kind === 'ScalarField') {
      var _partitionArray = require('fbjs/lib/partitionArray')(selection.directives, function (directive) {
        return directive.name === EXPORT;
      }),
          exports = _partitionArray[0],
          directives = _partitionArray[1];

      if (exports.length) {
        // Extract export
        require('fbjs/lib/invariant')(exports.length === 1, 'RelayExportTransform: Expected at most one `@${EXPORT}` ' + 'directive on field `%s`, got %s.', selection.name, exports.length);
        var exportAs = exports[0].args.find(function (arg) {
          return arg.name === AS;
        });
        require('fbjs/lib/invariant')(exportAs && exportAs.value.kind === 'Literal', 'RelayExportTransform: Expected a literal `%s` argument on ' + 'the `@${EXPORT}` directive on field `%s`.', AS, selection.name);
        var exportName = exportAs.value.value;
        require('fbjs/lib/invariant')(typeof exportName === 'string', 'RelayExportTransform: Expected the export name to be a string, ' + 'got `%s`.', exportName);
        require('fbjs/lib/invariant')(!metadata.hasOwnProperty(exportName), 'RelayExportTransform: Expected a given name to be exported at ' + 'most once within a given query, `%s` was exported multiple times.', exportName);
        var alias = selection.alias || selection.name;
        var fieldPath = [].concat(path, [alias]);
        if (selection.type instanceof GraphQLList) {
          fieldPath.push('*');
        }
        metadata[exportName] = fieldPath;
        nextSelection = (0, _extends3['default'])({}, selection, {
          directives: directives
        });
      }
    } else if (selection.kind === 'LinkedField') {
      require('fbjs/lib/invariant')(selection.directives.every(function (directive) {
        return directive.name !== EXPORT;
      }), 'RelayExportTransform: Unexpected `@${EXPORT}` directive on linked ' + 'field `%s`. Only scalar fields such as `id` can be exported.', selection.name);
      var _fieldPath = [].concat(path, [selection.alias || selection.name]);
      if (selection.type instanceof GraphQLList) {
        _fieldPath.push('*');
      }
      nextSelection = transformNode(selection, _fieldPath, metadata);
    } else if (selection.kind === 'Condition' || selection.kind === 'InlineFragment') {
      nextSelection = transformNode(selection, path, metadata);
    }
    return nextSelection; // provably the same type as `selection`
  });
  return (0, _extends3['default'])({}, node, {
    selections: selections
  }); // provably of the same type as `node`
}

module.exports = {
  transform: transform,
  transformSchema: transformSchema
};