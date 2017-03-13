/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule ASTConvert
 * 
 */

'use strict';

var _require = require('./RelayIRTransforms'),
    SCHEMA_TRANSFORMS = _require.SCHEMA_TRANSFORMS;

var _require2 = require('./RelaySchemaUtils'),
    isSchemaDefinitionAST = _require2.isSchemaDefinitionAST,
    isOperationDefinitionAST = _require2.isOperationDefinitionAST;

var _require3 = require('graphql'),
    extendSchema = _require3.extendSchema;

function convertASTDocuments(schema, documents, validationRules) {
  // should be Array<FragmentDefinitionNode | OperationDefinitionNode>
  // Graphql's AST types have a flow problem where
  var astDefinitions = [];
  documents.forEach(function (doc) {
    doc.definitions.forEach(function (definition) {
      if (isOperationDefinitionAST(definition)) {
        // TODO: isOperationDefinitionAST should %checks, once %checks is available
        astDefinitions.push(definition);
      }
    });
  });

  var validationAST = {
    kind: 'Document',
    definitions: astDefinitions
  };
  // Will throw an error if there are validation issues
  require('./RelayValidator').validate(validationAST, schema, validationRules);
  var operationDefinitions = astDefinitions;

  return operationDefinitions.map(function (definition) {
    return require('./RelayParser').transform(schema, definition);
  });
}

function transformASTSchema(baseSchema) {
  return SCHEMA_TRANSFORMS.reduce(function (acc, transform) {
    return transform(acc);
  }, baseSchema);
}

function extendASTSchema(baseSchema, documents) {
  // Should be TypeSystemDefinitionNode
  var schemaExtensions = [];
  documents.forEach(function (doc) {
    // TODO: isSchemaDefinitionAST should %checks, once %checks is available
    schemaExtensions.push.apply(schemaExtensions, doc.definitions.filter(isSchemaDefinitionAST));
  });

  if (schemaExtensions.length <= 0) {
    return baseSchema;
  }

  // Flow doesn't recognize that TypeSystemDefinitionNode is a subset of DefinitionNode
  var definitions = schemaExtensions;
  return extendSchema(baseSchema, {
    kind: 'Document',
    definitions: definitions
  });
}

module.exports = {
  convertASTDocuments: convertASTDocuments,
  extendASTSchema: extendASTSchema,
  transformASTSchema: transformASTSchema
};