/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @providesModule RelayFlowParser
 */

'use strict';

var _require = require('./RelaySchemaUtils'),
    getOperationDefinitionAST = _require.getOperationDefinitionAST;

var formatError = require('graphql').formatError,
    Source = require('graphql').Source,
    validate = require('graphql').validate;

/**
 * Validates that a given DocumentNode is properly formed. Returns an Array
 * of ValidationErrors if there are errors.
 */


function validateDocument(document, documentName, schema) {
  require('fbjs/lib/invariant')(document.definitions.length === 1, 'You supplied a GraphQL document named `%s` with %d definitions, but ' + 'it must have exactly one definition.', documentName, document.definitions.length);
  var definition = document.definitions[0];
  var isMutation = definition.kind === 'OperationDefinition' && definition.operation === 'mutation';

  var rules = [require('graphql/validation/rules/ArgumentsOfCorrectType').ArgumentsOfCorrectType, require('graphql/validation/rules/DefaultValuesOfCorrectType').DefaultValuesOfCorrectType, require('graphql/validation/rules/FieldsOnCorrectType').FieldsOnCorrectType, require('graphql/validation/rules/FragmentsOnCompositeTypes').FragmentsOnCompositeTypes, require('graphql/validation/rules/KnownArgumentNames').KnownArgumentNames, require('graphql/validation/rules/KnownTypeNames').KnownTypeNames, require('graphql/validation/rules/PossibleFragmentSpreads').PossibleFragmentSpreads, require('graphql/validation/rules/VariablesInAllowedPosition').VariablesInAllowedPosition];
  if (!isMutation) {
    rules.push(require('graphql/validation/rules/ProvidedNonNullArguments').ProvidedNonNullArguments);
  }
  var validationErrors = validate(schema, document, rules);

  if (validationErrors && validationErrors.length > 0) {
    return validationErrors.map(formatError);
  }
  return null;
}

/**
 * Parses a given string containing one or more GraphQL operations into an array
 * of GraphQL documents.
 */
function parse(source, schema) {
  var sourceName = arguments.length > 2 && arguments[2] !== undefined ? arguments[2] : 'default';

  // We need to ignore these directives. The RelayParser cannot handle these
  // directives, so this needs to happen here.
  var PATTERN_LIST = ['@relay(pattern:true)', '@fixme_fat_interface'];
  var strippedSource = source.replace(/ /g, '');
  var patternFound = PATTERN_LIST.some(function (pattern) {
    var isSubstring = strippedSource.indexOf(pattern) !== -1;
    if (isSubstring) {
      console.warn('Skipping Relay.QL template string because it contains ' + pattern + ': ' + sourceName);
    }
    return isSubstring;
  });
  if (patternFound) {
    return [];
  }

  var ast = null;
  try {
    ast = require('graphql').parse(new Source(source, sourceName));
  } catch (e) {
    console.error('\n-- GraphQL Parsing Error --\n');
    console.error(['File:  ' + sourceName, 'Error: ' + e.message].join('\n'));
    return [];
  }

  var validationErrors = validateDocument(ast, sourceName, schema);
  if (validationErrors) {
    var errorMessages = [];
    var sourceLines = source.split('\n');
    validationErrors.forEach(function (_ref) {
      var message = _ref.message,
          locations = _ref.locations;

      errorMessages.push(message);
      console.error('\n-- GraphQL Validation Error --\n');
      console.error(['File:  ' + sourceName, 'Error: ' + message, 'Source:'].join('\n'));
      locations.forEach(function (location) {
        var preview = sourceLines[location.line - 1];
        if (preview) {
          console.error(['> ', '> ' + preview, '> ' + ' '.repeat(location.column - 1) + '^^^'].join('\n'));
        }
      });
    });
    return [];
  }

  var _ast = ast,
      definitions = _ast.definitions;

  definitions.forEach(function (definition) {
    if (definition.kind !== 'OperationDefinition' || definition.operation !== 'mutation') {
      return;
    }

    var selections = definition.selectionSet.selections;
    // As of now, FB mutations should only have one input.
    require('fbjs/lib/invariant')(selections.length <= 1, 'Mutations should only have one argument, ' + selections.length + ' found.');

    // We need to manually add a `name` and a selection to each `selectionSet`
    // in order for this to be a valid GraphQL document. The RelayParser will
    // throw an error if we give it a "legacy" mutation. `__typename` is a
    // valid field in *all* mutation payloads.
    var mutationField = selections[0];
    require('fbjs/lib/invariant')(mutationField.kind === 'Field', 'RelayFlowParser: Expected the first selection of a mutation to be a ' + 'field, got `%s`.', mutationField.kind);
    definition.name = mutationField.name;
    mutationField.selectionSet = {
      kind: 'SelectionSet',
      selections: [{
        kind: 'Field',
        name: {
          kind: 'Name',
          value: '__typename'
        }
      }]
    };
  });

  var nodes = [];
  definitions.forEach(function (definition) {
    var operationDefinition = getOperationDefinitionAST(definition);
    if (operationDefinition) {
      nodes.push(require('./RelayParser').transform(schema, operationDefinition));
    }
  });
  return nodes;
}

/**
 * Parses each extracted template literal from an array of ExtractedRelayTags
 * into a GraphQL Document type. Each element in the returned array is a
 * ExtractedGQLDocuments type which includes the filename.
 */
function transformFiles(extractedTags, schema) {
  var gqlMapping = [];
  extractedTags.forEach(function (file) {
    var documents = [];
    file.tags.forEach(function (tag) {
      var transformed = parse(tag, schema, file.filename);
      if (transformed.length) {
        documents.push.apply(documents, transformed);
      }
    });

    if (documents.length) {
      gqlMapping.push({
        filename: file.filename,
        documents: documents
      });
    }
  });
  return gqlMapping;
}

module.exports = {
  transformFiles: transformFiles,
  parse: parse
};