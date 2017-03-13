/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule FindRelayQL
 * 
 */

'use strict';

// Attempt to be as inclusive as possible of source text.
var BABYLON_OPTIONS = {
  allowImportExportEverywhere: true,
  allowReturnOutsideFunction: true,
  allowSuperOutsideMethod: true,
  sourceType: 'module',
  plugins: [
  // Previously "*"
  'asyncGenerators', 'classProperties', 'decorators', 'doExpressions', 'dynamicImport', 'exportExtensions', 'flow', 'functionBind', 'functionSent', 'jsx', 'objectRestSpread'],
  strictMode: false
};

function find(text, fileName) {
  var result = [];
  var ast = require('babylon').parse(text, BABYLON_OPTIONS);
  var rawModuleName = extractModuleName(text) || fileName;
  !rawModuleName ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: Expected a module name to be defined with ' + '`@providesModule <name>`.') : invariant(false) : void 0;
  var moduleName = rawModuleName.replace(/\.react$/, '').replace(/[-.:]/g, '_');

  var visitors = {
    CallExpression: function CallExpression(node) {
      var callee = node.callee;
      if (!(callee.type === 'Identifier' && CREATE_CONTAINER_FUNCTIONS[callee.name] || callee.kind === 'MemberExpression' && callee.object.type === 'Identifier' && callee.object.value === 'Relay' && callee.property.type === 'Identifier' && CREATE_CONTAINER_FUNCTIONS[callee.property.name])) {
        traverse(node, visitors);
        return;
      }
      var fragments = node.arguments[1];
      if (fragments.type === 'ObjectExpression') {
        fragments.properties.forEach(function (property) {
          !(property.type === 'ObjectProperty' && property.key.type === 'Identifier' && property.value.type === 'TaggedTemplateExpression') ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: `%s` expects fragment definitions to be `key: graphql`.', node.callee.name) : invariant(false) : void 0;
          var keyName = property.key.name;
          var tagName = getGraphQLTagName(property.value.tag);
          !tagName ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: `%s` expects fragment definitions to be tagged with ' + '`graphql` or `Relay2QL`, got `%s`.', node.callee.name, getSourceTextForLocation(text, property.value.tag.loc)) : invariant(false) : void 0;
          var template = getGraphQLText(property.value.quasi);
          if (tagName === 'graphql' || tagName === 'graphql.experimental') {
            validateTemplate(template, moduleName, keyName);
          }
          result.push({
            tag: tagName,
            template: template
          });
        });
      } else {
        !(fragments && fragments.type === 'TaggedTemplateExpression') ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: `%s` expects a second argument of fragment definitions.', node.callee.name) : invariant(false) : void 0;
        var tagName = getGraphQLTagName(fragments.tag);
        !tagName ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: `%s` expects fragment definitions to be tagged with ' + '`graphql`, or `Relay2QL`, got `%s`.', node.callee.name, getSourceTextForLocation(text, fragments.tag.loc)) : invariant(false) : void 0;
        var _template = getGraphQLText(fragments.quasi);
        if (tagName === 'graphql' || tagName === 'graphql.experimental') {
          validateTemplate(_template, moduleName);
        }
        result.push({
          tag: tagName,
          template: _template
        });
      }

      // Visit remaining arguments
      for (var ii = 2; ii < node.arguments.length; ii++) {
        visit(node.arguments[ii], visitors);
      }
    },
    TaggedTemplateExpression: function TaggedTemplateExpression(node) {
      var tagName = getGraphQLTagName(node.tag);
      if (tagName != null) {
        var _template2 = getGraphQLText(node.quasi);
        if (tagName === 'graphql' || tagName === 'graphql.experimental') {
          validateTemplate(_template2, moduleName);
        }
        result.push({
          tag: tagName,
          template: node.quasi.quasis[0].value.raw
        });
      }
    }
  };
  visit(ast, visitors);
  return result;
}

var cache = {};
function memoizedFind(text, fileName) {
  var hash = require('crypto').createHash('md5').update(fileName).update(text).digest('hex');
  var result = cache[hash];
  if (!result) {
    result = find(text, fileName);
    cache[hash] = result;
  }
  return result;
}

var CREATE_CONTAINER_FUNCTIONS = {
  createFragmentContainer: true,
  createPaginationContainer: true,
  createRefetchContainer: true
};

var IDENTIFIERS = {
  Relay2QL: true,
  graphql: true
};

var IGNORED_KEYS = {
  comments: true,
  end: true,
  leadingComments: true,
  loc: true,
  name: true,
  start: true,
  trailingComments: true,
  type: true
};

function getGraphQLTagName(tag) {
  if (tag.type === 'Identifier' && IDENTIFIERS.hasOwnProperty(tag.name)) {
    return tag.name;
  } else if (tag.type === 'MemberExpression' && tag.object.type === 'Identifier' && tag.object.name === 'graphql' && tag.property.type === 'Identifier' && tag.property.name === 'experimental') {
    return 'graphql.experimental';
  }
  return null;
}

function getGraphQLText(quasi) {
  var quasis = quasi.quasis;
  !(quasis && quasis.length === 1) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: Substitutions are not allowed in graphql tags.') : invariant(false) : void 0;
  return quasis[0].value.raw;
}

function getSourceTextForLocation(text, loc) {
  if (loc == null) {
    return '(source unavailable)';
  }
  var lines = text.split('\n').slice(loc.start.line - 1, loc.end.line);
  lines[0] = lines[0].slice(loc.start.column);
  lines[lines.length - 1] = lines[lines.length - 1].slice(0, loc.end.column);
  return lines.join('\n');
}

function validateTemplate(template, moduleName, keyName) {
  var ast = require('graphql').parse(template);
  ast.definitions.forEach(function (def) {
    var definitionName = def.name.value;
    if (def.kind === 'OperationDefinition') {
      var operationNameParts = definitionName.match(/^(.*)(Mutation|Query|Subscription)$/);
      !(operationNameParts && definitionName.startsWith(moduleName)) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: Operation names in graphql tags must be prefixed with ' + 'the module name and end in "Mutation", "Query", or "Subscription". ' + 'Got `%s` in module `%s`.', definitionName, moduleName) : invariant(false) : void 0;
    } else if (def.kind === 'FragmentDefinition') {
      if (keyName) {
        !(definitionName === moduleName + '_' + keyName) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: Container fragment names must be `<ModuleName>_<propName>`. ' + 'Got `%s`, expected `%s`.', definitionName, moduleName + '_' + keyName) : invariant(false) : void 0;
      } else {
        !definitionName.startsWith(moduleName) ? process.env.NODE_ENV !== 'production' ? invariant(false, 'FindRelayQL: Fragment names in graphql tags must be prefixed with ' + 'the module name. Got `%s` in module `%s`.', definitionName, moduleName) : invariant(false) : void 0;
      }
    }
  });
}

function extractModuleName(text) {
  var propertyRegex = /@(\S+) *(\S*)/g;
  var captures = void 0;
  while (captures = propertyRegex.exec(text)) {
    var prop = captures[1];
    var value = captures[2];
    if (prop === 'providesModule') {
      return value;
    }
  }
  return null;
}

function invariant(condition, msg) {
  if (!condition) {
    for (var _len = arguments.length, args = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
      args[_key - 2] = arguments[_key];
    }

    throw new Error(require('util').format.apply(require('util'), [msg].concat(args)));
  }
}

function visit(node, visitors) {
  var fn = visitors[node.type];
  if (fn != null) {
    fn(node);
    return;
  }
  traverse(node, visitors);
}

function traverse(node, visitors) {
  for (var key in node) {
    if (IGNORED_KEYS[key]) {
      continue;
    }
    var prop = node[key];
    if (prop && typeof prop === 'object' && typeof prop.type === 'string') {
      visit(prop, visitors);
    } else if (Array.isArray(prop)) {
      prop.forEach(function (item) {
        if (item && typeof item === 'object' && typeof item.type === 'string') {
          visit(item, visitors);
        }
      });
    }
  }
}

module.exports = {
  find: find,
  memoizedFind: memoizedFind
};