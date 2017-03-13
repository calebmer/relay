/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule parseGraphQLText
 * 
 */

'use strict';

var _require = require('./ASTConvert'),
    convertASTDocuments = _require.convertASTDocuments;

var _require2 = require('graphql'),
    extendSchema = _require2.extendSchema,
    parse = _require2.parse;

function parseGraphQLText(schema, text) {
  var ast = parse(text);
  var extendedSchema = extendSchema(schema, ast);
  var definitions = convertASTDocuments(extendedSchema, [ast], []);
  return {
    definitions: definitions,
    schema: extendedSchema !== schema ? extendedSchema : null
  };
}

module.exports = parseGraphQLText;