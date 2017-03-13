/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule validateAST
 * 
 */

'use strict';

// Throws an error when the ast cannot be validated
function validateAST(ast, schema, validationRules) {
  try {
    require('./RelayValidator').validate(ast, schema, validationRules);
  } catch (e) {
    var errorMessages = [];
    var text = ast.loc && ast.loc.source.body;
    if (e.validationErrors && text) {
      var sourceLines = text.split('\n');
      e.validationErrors.forEach(function (formattedError) {
        var message = formattedError.message,
            locations = formattedError.locations;

        var errorMessage = message;
        locations.forEach(function (location) {
          var preview = sourceLines[location.line - 1];
          if (preview) {
            errorMessage += '\n' + ['> ', '> ' + preview, '> ' + ' '.repeat(location.column - 1) + '^^^'].join('\n');
          }
        });
        errorMessages.push(errorMessage);
      });
      require('fbjs/lib/invariant')(false, 'RelayCompilerContext: Encountered following errors while parsing.' + ' \n %s', errorMessages.join('\n'));
    } else {
      throw e;
    }
  }
}

module.exports = validateAST;