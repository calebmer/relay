/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @providesModule RelayConnectionTransform
 */

'use strict';

var _extends3 = _interopRequireDefault(require('babel-runtime/helpers/extends'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('./RelayConnectionConstants'),
    CONNECTION = _require.CONNECTION,
    FIRST = _require.FIRST,
    HANDLE = _require.HANDLE,
    LAST = _require.LAST;

var _require2 = require('./RelayConnectionInterface'),
    CURSOR = _require2.CURSOR,
    EDGES = _require2.EDGES,
    END_CURSOR = _require2.END_CURSOR,
    HAS_NEXT_PAGE = _require2.HAS_NEXT_PAGE,
    HAS_PREV_PAGE = _require2.HAS_PREV_PAGE,
    NODE = _require2.NODE,
    PAGE_INFO = _require2.PAGE_INFO,
    START_CURSOR = _require2.START_CURSOR;

var assertCompositeType = require('graphql').assertCompositeType,
    GraphQLInterfaceType = require('graphql').GraphQLInterfaceType,
    GraphQLList = require('graphql').GraphQLList,
    GraphQLObjectType = require('graphql').GraphQLObjectType,
    GraphQLScalarType = require('graphql').GraphQLScalarType,
    GraphQLUnionType = require('graphql').GraphQLUnionType;

/**
 * @public
 *
 * Transforms fields with the `@connection` directive:
 * - Verifies that the field type is connection-like.
 * - Adds a `handle` property to the field, either the user-provided `handle`
 *   argument or the default value "connection".
 * - When the `generateRequisiteFields` option is set to true, inserts a
 *   sub-fragment on the field to ensure that standard connection fields are
 *   fetched (e.g. cursors, node ids, page info).
 */
function transform(context, options) {
  var generateRequisiteFields = !!(options && options.generateRequisiteFields);
  return require('./RelayIRTransformer').transform(context, {
    Fragment: visitFragmentOrRoot,
    LinkedField: visitLinkedField,
    Root: visitFragmentOrRoot
  }, function () {
    return {
      definitionName: null,
      generateRequisiteFields: generateRequisiteFields
    };
  });
}

/**
 * @public
 *
 * Extend the original schema with support for the `@connection` directive.
 */
function transformSchema(schema) {
  var exportSchema = require('./RelaySchemaUtils').parseSchema('\n    # TODO: replace this when extendSchema supports directives\n    schema {\n      query: QueryType\n      mutation: MutationType\n    }\n    type QueryType {\n      id: ID\n    }\n    type MutationType {\n      id: ID\n    }\n    # The actual directive to add\n    directive @connection(handle: String) on FIELD\n  ');
  return require('./RelaySchemaUtils').schemaWithDirectives(schema, exportSchema.getDirectives().filter(function (directive) {
    return directive.name === CONNECTION;
  }));
}

/**
 * @internal
 */
function visitFragmentOrRoot(node, options) {
  return this.traverse(node, (0, _extends3['default'])({}, options, {
    definitionName: node.name
  }));
}

/**
 * @internal
 */
function visitLinkedField(field, options) {
  var transformedField = this.traverse(field, options);
  var connectionDirective = field.directives.find(function (directive) {
    return directive.name === CONNECTION;
  });
  if (!connectionDirective) {
    return transformedField;
  }
  var definitionName = options.definitionName;

  require('fbjs/lib/invariant')(definitionName, 'RelayConnectionTransform: Transform error, expected a name to have ' + 'been set by the parent operation or fragment definition.');
  validateConnectionSelection(definitionName, transformedField);
  validateConnectionType(definitionName, transformedField.type);

  var _getRelayLiteralArgum = require('./getRelayLiteralArgumentValues')(connectionDirective.args),
      handle = _getRelayLiteralArgum.handle;

  require('fbjs/lib/invariant')(typeof handle === 'string' || handle === undefined, 'RelayConnectionTransform: Expected the %s argument to @%s to ' + 'be a string literal or not specified.', HANDLE, CONNECTION);
  handle = handle || CONNECTION;

  if (options.generateRequisiteFields) {
    var fragment = generateConnectionFragment(this.getContext(), transformedField.type);
    transformedField = (0, _extends3['default'])({}, transformedField, {
      selections: transformedField.selections.concat(fragment)
    });
  }
  return (0, _extends3['default'])({}, transformedField, {
    directives: transformedField.directives.filter(function (directive) {
      return directive.name !== CONNECTION;
    }),
    handles: transformedField.handles ? [].concat(transformedField.handles, [handle]) : [handle]
  });
}

/**
 * @internal
 *
 * Generates a fragment on the given type that fetches the minimal connection
 * fields in order to merge different pagination results together at runtime.
 */
function generateConnectionFragment(context, type) {
  var compositeType = assertCompositeType(type);
  var ast = require('graphql').parse('\n    fragment ConnectionFragment on ' + String(compositeType) + ' {\n      ' + EDGES + ' {\n        ' + CURSOR + '\n        ' + NODE + ' {\n          __typename # rely on GenerateRequisiteFieldTransform to add "id"\n        }\n      }\n      ' + PAGE_INFO + ' {\n        ' + END_CURSOR + '\n        ' + HAS_NEXT_PAGE + '\n        ' + HAS_PREV_PAGE + '\n        ' + START_CURSOR + '\n      }\n    }\n  ');
  var fragmentAST = ast.definitions[0];
  require('fbjs/lib/invariant')(fragmentAST && fragmentAST.kind === 'FragmentDefinition', 'RelayConnectionTransform: Expected a fragment definition AST.');
  var fragment = require('./RelayParser').transform(context.schema, fragmentAST);
  require('fbjs/lib/invariant')(fragment && fragment.kind === 'Fragment', 'RelayConnectionTransform: Expected a connection fragment.');
  return {
    directives: [],
    kind: 'InlineFragment',
    metadata: null,
    selections: fragment.selections,
    typeCondition: compositeType
  };
}

/**
 * @internal
 *
 * Validates that the selection is a valid connection:
 * - Specifies a first or last argument to prevent accidental, unconstrained
 *   data access.
 * - Has an `edges` selection, otherwise there is nothing to paginate.
 *
 * TODO: This implementation requires the edges field to be a direct selection
 * and not contained within an inline fragment or fragment spread. It's
 * technically possible to remove this restriction if this pattern becomes
 * common/necessary.
 */
function validateConnectionSelection(definitionName, field) {
  require('fbjs/lib/invariant')(field.args && field.args.some(function (arg) {
    return arg.name === FIRST || arg.name === LAST;
  }), 'RelayConnectionTransform: Expected field `%s: %s` to have a %s or %s ' + 'argument in document `%s`.', field.name, field.type, FIRST, LAST, definitionName);
  require('fbjs/lib/invariant')(field.selections.some(function (selection) {
    return selection.kind === 'LinkedField' && selection.name === EDGES;
  }), 'RelayConnectionTransform: Expected field `%s: %s` to have a %s ' + 'selection in document `%s`.', field.name, field.type, EDGES, definitionName);
}

/**
 * @internal
 *
 * Validates that the type satisfies the Connection specification:
 * - The type has an edges field, and edges have scalar `cursor` and object
 *   `node` fields.
 * - The type has a page info field which is an object with the correct
 *   subfields.
 */
function validateConnectionType(definitionName, type) {
  var typeWithFields = require('./RelaySchemaUtils').assertTypeWithFields(type);
  var typeFields = typeWithFields.getFields();
  var edges = typeFields[EDGES];

  require('fbjs/lib/invariant')(edges, 'RelayConnectionTransform: Expected type `%s` to have an %s field in ' + 'document `%s`.', type, EDGES, definitionName);

  var edgesType = require('./RelaySchemaUtils').getNullableType(edges.type);
  require('fbjs/lib/invariant')(edgesType instanceof GraphQLList, 'RelayConnectionTransform: Expected `%s` field on type `%s` to be a ' + 'list type in document `%s`.', EDGES, type, definitionName);
  var edgeType = require('./RelaySchemaUtils').getNullableType(edgesType.ofType);
  require('fbjs/lib/invariant')(edgeType instanceof GraphQLObjectType, 'RelayConnectionTransform: Expected %s field on type `%s` to be a list ' + 'of objects in document `%s`.', EDGES, type, definitionName);
  var node = edgeType.getFields()[NODE];
  if (!node || !(node.type instanceof GraphQLInterfaceType || node.type instanceof GraphQLUnionType || node.type instanceof GraphQLObjectType)) {
    require('fbjs/lib/invariant')(false, 'RelayConnectionTransform: Expected type `%s` to have an %s.%s field' + 'for which the type is an interface, object, or union in document `%s`.', type, EDGES, NODE, definitionName);
  }
  var cursor = edgeType.getFields()[CURSOR];
  if (!cursor || !(cursor.type instanceof GraphQLScalarType)) {
    require('fbjs/lib/invariant')(false, 'RelayConnectionTransform: Expected type `%s` to have an ' + '%s.%s field for which the type is an scalar in document `%s`.', type, EDGES, CURSOR, definitionName);
  }
  var pageInfo = typeFields[PAGE_INFO];
  if (!pageInfo || !(pageInfo.type instanceof GraphQLObjectType)) {
    require('fbjs/lib/invariant')(false, 'RelayConnectionTransform: Expected type `%s` to have a %s field for ' + 'which the type is an object in document `%s`.', type, PAGE_INFO, definitionName);
  }
  var pageInfoType = require('./RelaySchemaUtils').assertTypeWithFields(pageInfo.type);
  [END_CURSOR, HAS_NEXT_PAGE, HAS_PREV_PAGE, START_CURSOR].forEach(function (fieldName) {
    var pageInfoField = pageInfoType.getFields()[fieldName];
    if (!pageInfoField || !(pageInfoField.type instanceof GraphQLScalarType)) {
      require('fbjs/lib/invariant')(false, 'RelayConnectionTransform: Expected type `%s` to have an ' + '%s field for which the type is an scalar in document `%s`.', pageInfo.type, fieldName, definitionName);
    }
  });
}

module.exports = {
  CONNECTION: CONNECTION,
  transform: transform,
  transformSchema: transformSchema
};