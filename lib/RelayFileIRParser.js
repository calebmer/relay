/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule RelayFileIRParser
 * 
 */

'use strict';

// Throws an error if parsing the file fails
function parseFile(file) {
  var text = require('fs').readFileSync(file, 'utf8');
  var moduleName = require('path').basename(file, '.js');
  if (text.indexOf('graphql') < 0) {
    // This file doesn't contain any Relay definitions to parse
    return null;
  }

  var astDefinitions = [];
  require('./FindRelayQL').memoizedFind(text, moduleName).forEach(function (_ref) {
    var tag = _ref.tag,
        template = _ref.template;

    if (!(tag === 'graphql' || tag === 'graphql.experimental')) {
      throw new Error('Invalid tag ' + tag + ' in module ' + moduleName + '. Expected `graphql` ' + ' (common case) or `graphql.experimental` (if using experimental ' + 'directives).');
    }
    if (tag !== 'graphql.experimental' && /@argument(Definition)?s\b/.test(template)) {
      throw new Error('Unexpected use of fragment variables: @arguments and ' + '@argumentDefinitions are only supported in ' + 'graphql.experimental literals. Source: ' + template);
    }
    var ast = require('graphql').parse(template);
    require('fbjs/lib/invariant')(ast.definitions.length, 'RelayFileIRParser: Expected GraphQL text to contain at least one ' + 'definition (fragment, mutation, query, subscription), got `%s`.', template);

    astDefinitions.push.apply(astDefinitions, ast.definitions);
  });

  return {
    kind: 'Document',
    definitions: astDefinitions
  };
}

function parser(baseDir) {
  return new (require('./FileParser'))({
    baseDir: baseDir,
    parse: parseFile
  });
}

module.exports = { parser: parser };