/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule BabelPluginGraphQL
 */

'use strict';

var _keys2 = _interopRequireDefault(require('babel-runtime/core-js/object/keys'));

var _assign2 = _interopRequireDefault(require('babel-runtime/core-js/object/assign'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var PROVIDES_MODULE = 'providesModule';

/* eslint-disable comma-dangle */

function create() {
  return function BabelPluginGraphQL(babel) {
    var t = babel.types;

    return {
      visitor: {
        /**
         * Extract the module name from `@providesModule`.
         */
        Program: function Program(node, state) {
          var parent = node.parent;
          if (state.file.opts.documentName) {
            return;
          }
          var documentName = void 0;
          if (parent.comments && parent.comments.length) {
            var docblock = parent.comments[0].value || '';
            var propertyRegex = /@(\S+) *(\S*)/g;
            var captures = void 0;
            while (captures = propertyRegex.exec(docblock)) {
              var property = captures[1];
              var value = captures[2];
              if (property === PROVIDES_MODULE) {
                documentName = value.replace(/[-.:]/g, '_');
                break;
              }
            }
          }
          var basename = state.file.opts.basename;
          if (basename && !documentName) {
            var _captures = basename.match(/^[_A-Za-z][_0-9A-Za-z]*/);
            if (_captures) {
              documentName = _captures[0];
            }
          }
          state.file.opts.documentName = documentName || 'UnknownFile';
        },
        TaggedTemplateExpression: function TaggedTemplateExpression(path, state) {
          var tag = path.get('tag');
          var tagName = void 0;
          if (tag.isIdentifier({ name: 'graphql' })) {
            tagName = 'graphql';
          } else if (tag.matchesPattern('graphql.experimental')) {
            tagName = 'graphql.experimental';
          } else {
            return;
          }

          if (path.node.quasi.quasis.length !== 1) {
            throw new Error('BabelPluginGraphQL: Substitutions are not allowed in ' + 'graphql fragments. Included fragments should be referenced ' + 'as `...MyModule_propName`.');
          }

          var text = path.node.quasi.quasis[0].value.raw;
          var ast = require('graphql').parse(text);

          if (ast.definitions.length === 0) {
            throw new Error('BabelPluginGraphQL: Unexpected empty graphql tag.');
          }
          validateTag(tagName, text);

          var mainDefinition = ast.definitions[0];

          if (mainDefinition.kind === 'FragmentDefinition') {
            var objPropName = getAssignedObjectPropertyName(t, path);
            if (objPropName) {
              if (ast.definitions.length !== 1) {
                throw new Error('BabelPluginGraphQL: Expected exactly one fragment in the ' + ('graphql tag referenced by the property ' + objPropName + '.'));
              }
              return replaceMemoized(t, path, createFragmentConcreteNode(t, path, mainDefinition));
            }

            var nodeMap = {};
            var _iteratorNormalCompletion = true;
            var _didIteratorError = false;
            var _iteratorError = undefined;

            try {
              for (var _iterator = ast.definitions[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
                var definition = _step.value;

                if (definition.kind !== 'FragmentDefinition') {
                  throw new Error('BabelPluginGraphQL: Expected only fragments within this ' + 'graphql tag.');
                }

                var _getFragmentNameParts = getFragmentNameParts(definition.name.value),
                    propName = _getFragmentNameParts[1];

                nodeMap[propName] = createFragmentConcreteNode(t, path, definition);
              }
            } catch (err) {
              _didIteratorError = true;
              _iteratorError = err;
            } finally {
              try {
                if (!_iteratorNormalCompletion && _iterator['return']) {
                  _iterator['return']();
                }
              } finally {
                if (_didIteratorError) {
                  throw _iteratorError;
                }
              }
            }

            return replaceMemoized(t, path, createObject(t, nodeMap));
          }

          if (mainDefinition.kind === 'OperationDefinition') {
            if (ast.definitions.length !== 1) {
              throw new Error('BabelPluginGraphQL: Expected exactly one operation ' + '(query, mutation, or subscription) per graphql tag.');
            }
            return replaceMemoized(t, path, createOperationConcreteNode(t, path, mainDefinition));
          }

          throw new Error('BabelPluginGraphQL: Expected a fragment, mutation, query, or ' + 'subscription, got `' + mainDefinition.kind + '`.');
        }
      }
    };
  };
}

function replaceMemoized(t, path, ast) {
  var topScope = path.scope;
  while (topScope.parent) {
    topScope = topScope.parent;
  }

  if (path.scope === topScope) {
    path.replaceWith(ast);
  } else {
    var id = topScope.generateDeclaredUidIdentifier('graphql');
    path.replaceWith(t.logicalExpression('||', id, t.assignmentExpression('=', id, ast)));
  }
}

function getAssignedObjectPropertyName(t, path) {
  var property = path;
  while (property) {
    if (t.isObjectProperty(property) && property.node.key.name) {
      return property.node.key.name;
    }
    property = property.parentPath;
  }
}

function createFragmentConcreteNode(t, path, definition) {
  var definitionName = definition.name.value;

  var _createLegacyAST = createLegacyAST(t, definition),
      legacyAST = _createLegacyAST.legacyAST,
      fragments = _createLegacyAST.fragments,
      variables = _createLegacyAST.variables,
      argumentDefinitions = _createLegacyAST.argumentDefinitions;

  var substitutions = createSubstitutionsForFragmentSpreads(t, path, fragments);

  var transformedAST = createObject(t, {
    kind: t.stringLiteral('FragmentDefinition'),
    argumentDefinitions: createFragmentArguments(t, argumentDefinitions, variables),
    node: createRelayQLTemplate(t, legacyAST)
  });

  return createConcreteNode(t, definitionName, transformedAST, substitutions);
}

function createOperationConcreteNode(t, path, definition) {
  var definitionName = definition.name.value;

  var _createLegacyAST2 = createLegacyAST(t, definition),
      legacyAST = _createLegacyAST2.legacyAST,
      fragments = _createLegacyAST2.fragments;

  var substitutions = createSubstitutionsForFragmentSpreads(t, path, fragments);
  var nodeAST = legacyAST.operation === 'query' ? createFragmentForOperation(t, legacyAST) : createRelayQLTemplate(t, legacyAST);
  var transformedAST = createObject(t, {
    kind: t.stringLiteral('OperationDefinition'),
    argumentDefinitions: createOperationArguments(t, definition.variableDefinitions),
    name: t.stringLiteral(definitionName),
    operation: t.stringLiteral(legacyAST.operation),
    node: nodeAST
  });

  return createConcreteNode(t, definitionName, transformedAST, substitutions);
}

function createLegacyAST(t, definition) {
  var fragmentID = 0;

  var fragments = {};
  var variables = {};
  var argumentDefinitions = null;

  var visitors = {
    Directive: function Directive(node) {
      switch (node.name.value) {
        case 'argumentDefinitions':
          if (argumentDefinitions) {
            throw new Error('BabelPluginGraphQL: Expected only one ' + '@argumentDefinitions directive');
          }
          argumentDefinitions = node.arguments;
          return null;
        case 'connection':
          return null;
        default:
          return node;
      }
    },
    FragmentSpread: function FragmentSpread(node) {
      var directives = node.directives;

      var fragmentName = node.name.value;
      var fragmentArgumentsAST = null;
      var substitutionName = null;

      if (directives.length === 0) {
        substitutionName = fragmentName;
      } else {
        // TODO: add support for @include and other directives.
        var directive = directives[0];
        if (directives.length !== 1 || directive.name.value !== 'arguments') {
          throw new Error('BabelPluginGraphQL: Unsupported directive `' + directive.name.value + '` on fragment spread `...' + fragmentName + '`.');
        }
        var fragmentArgumentsObject = {};
        directive.arguments.forEach(function (argNode) {
          var arg = convertArgument(t, argNode);
          fragmentArgumentsObject[arg.name] = arg.ast;
        });
        fragmentArgumentsAST = createObject(t, fragmentArgumentsObject);
        fragmentID++;
        substitutionName = fragmentName + '_args' + fragmentID;
      }

      fragments[substitutionName] = {
        name: fragmentName,
        args: fragmentArgumentsAST
      };
      return (0, _assign2['default'])({}, node, {
        name: { kind: 'Name', value: substitutionName },
        directives: []
      });
    },
    Variable: function Variable(node) {
      variables[node.name.value] = null;
      return node;
    }
  };
  var legacyAST = require('graphql').visit(definition, visitors);

  return {
    legacyAST: legacyAST,
    fragments: fragments,
    variables: variables,
    argumentDefinitions: argumentDefinitions
  };
}

function createConcreteNode(t, definitionName, transformedAST, substitutions) {
  return createObject(t, {
    relay: t.functionExpression(null, [], t.blockStatement([t.variableDeclaration('const', [t.variableDeclarator(t.identifier('RelayQL_GENERATED'), createRequireCall(t, 'RelayQL_GENERATED'))].concat(substitutions)), t.returnStatement(transformedAST)])),
    relayExperimental: t.functionExpression(null, [], t.blockStatement([t.returnStatement(createRequireCall(t, definitionName + '.graphql'))]))
  });
}

function createOperationArguments(t, variableDefinitions) {
  return t.arrayExpression(variableDefinitions.map(function (definition) {
    var name = definition.variable.name.value;
    var defaultValue = definition.defaultValue ? parseValue(t, definition.defaultValue) : t.nullLiteral();
    return createLocalArgument(t, name, defaultValue);
  }));
}

function createFragmentArguments(t, argumentDefinitions, variables) {
  var concreteDefinitions = [];
  (0, _keys2['default'])(variables).forEach(function (name) {
    var definition = (argumentDefinitions || []).find(function (arg) {
      return arg.name.value === name;
    });
    if (definition) {
      var defaultValueField = definition.value.fields.find(function (field) {
        return field.name.value === 'defaultValue';
      });
      var defaultValue = defaultValueField ? parseValue(t, defaultValueField.value) : t.nullLiteral();
      concreteDefinitions.push(createLocalArgument(t, name, defaultValue));
    } else {
      concreteDefinitions.push(createRootArgument(t, name));
    }
  });
  return t.arrayExpression(concreteDefinitions);
}

function createLocalArgument(t, variableName, defaultValue) {
  return createObject(t, {
    defaultValue: defaultValue,
    kind: t.stringLiteral('LocalArgument'),
    name: t.stringLiteral(variableName)
  });
}

function createRootArgument(t, variableName) {
  return t.objectExpression([t.objectProperty(t.identifier('kind'), t.stringLiteral('RootArgument')), t.objectProperty(t.identifier('name'), t.stringLiteral(variableName))]);
}

function parseValue(t, value) {
  switch (value.kind) {
    case 'BooleanValue':
      return t.booleanLiteral(value.value);
    case 'IntValue':
      return t.numericLiteral(parseInt(value.value, 10));
    case 'FloatValue':
      return t.numericLiteral(parseFloat(value.value));
    case 'StringValue':
      return t.stringLiteral(value.value);
    case 'EnumValue':
      return t.stringLiteral(value.value);
    case 'ListValue':
      return t.arrayExpression(value.values.map(function (item) {
        return parseValue(t, item);
      }));
    default:
      throw new Error('BabelPluginGraphQL: Unsupported literal type `' + value.kind + '`.');
  }
}

function convertArgument(t, argNode) {
  var name = argNode.name.value;
  var value = argNode.value;
  var ast = null;
  switch (value.kind) {
    case 'Variable':
      var paramName = value.name.value;
      ast = createObject(t, {
        kind: t.stringLiteral('CallVariable'),
        callVariableName: t.stringLiteral(paramName)
      });
      break;
    default:
      ast = parseValue(t, value);
  }
  return { name: name, ast: ast };
}

function createObject(t, obj) {
  return t.objectExpression((0, _keys2['default'])(obj).map(function (key) {
    return t.objectProperty(t.identifier(key), obj[key]);
  }));
}

function createRequireCall(t, moduleName) {
  return t.callExpression(t.identifier('require'), [t.stringLiteral(moduleName)]);
}

function createFragmentForOperation(t, operation) {
  var type = void 0;
  switch (operation.operation) {
    case 'query':
      type = 'Query';
      break;
    case 'mutation':
      type = 'Mutation';
      break;
    case 'subscription':
      type = 'Subscription';
      break;
    default:
      throw new Error('BabelPluginGraphQL: Unexpected operation type: `' + operation.operation + '`.');
  }
  return createRelayQLTemplate(t, {
    kind: 'FragmentDefinition',
    loc: operation.loc,
    name: {
      kind: 'Name',
      value: operation.name.value
    },
    typeCondition: {
      kind: 'NamedType',
      name: {
        kind: 'Name',
        value: type
      }
    },
    directives: operation.directives,
    selectionSet: operation.selectionSet
  });
}

function createRelayQLTemplate(t, node) {
  var text = require('graphql').print(node);
  return t.taggedTemplateExpression(t.identifier('RelayQL_GENERATED'), t.templateLiteral([t.templateElement({ raw: text, cooked: text }, true)], []));
}

function getFragmentNameParts(fragmentName) {
  var match = fragmentName.match(/^(\w+)_(\w+)$/);
  if (!match) {
    throw new Error('BabelPluginGraphQL: Fragments should be named ' + '`ModuleName_fragmentName`, got `' + fragmentName + '`.');
  }
  var module = match[1];
  var propName = match[2];
  return [module, propName];
}

function createSubstitutionsForFragmentSpreads(t, path, fragments) {
  return (0, _keys2['default'])(fragments).map(function (varName) {
    var fragment = fragments[varName];

    var _getFragmentNameParts2 = getFragmentNameParts(fragment.name),
        module = _getFragmentNameParts2[0],
        propName = _getFragmentNameParts2[1];

    return t.variableDeclarator(t.identifier(varName), createGetFragmentCall(t, path, module, propName, fragment.args));
  });
}

function createGetFragmentCall(t, path, module, propName, fragmentArguments) {
  var args = [t.stringLiteral(propName)];

  if (fragmentArguments) {
    args.push(fragmentArguments);
  }

  // If "module" is defined locally, then it's unsafe to assume it's a
  // container. It might be a bound reference to the React class itself.
  // To be safe, when defined locally, always check the __container__ property
  // first.
  var container = isDefinedLocally(path, module) ? t.logicalExpression('||',
  // __container__ is defined via ReactRelayCompatContainerBuilder.
  t.memberExpression(t.identifier(module), t.identifier('__container__')), t.identifier(module)) : t.identifier(module);

  return t.callExpression(t.memberExpression(container, t.identifier('getFragment')), args);
}

function isDefinedLocally(path, name) {
  var binding = path.scope.getBinding(name);
  if (!binding) {
    return false;
  }

  // Binding comes from import.
  if (binding.kind === 'module') {
    return false;
  }

  // Binding comes from require.
  if (binding.path.isVariableDeclarator() && binding.path.get('init.callee').isIdentifier({ name: 'require' })) {
    return false;
  }

  // Otherwise, defined locally.
  return true;
}

function validateTag(tagName, text) {
  // All features enabled in experimental mode
  if (tagName === 'graphql.experimental') {
    return;
  }
  // `graphql` only supports spec-compliant GraphQL: experimental extensions
  // such as fragment arguments are disabled
  if (/@argument(Definition)?s\b/.test(text)) {
    throw new Error('BabelPluginGraphQL: Unexpected use of fragment variables: ' + '@arguments and @argumentDefinitions are only supported in ' + 'experimental mode. Source: ' + text);
  }
}

module.exports = {
  create: create
};