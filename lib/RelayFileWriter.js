/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule RelayFileWriter
 * 
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _map2 = _interopRequireDefault(require('babel-runtime/core-js/map'));

var _set2 = _interopRequireDefault(require('babel-runtime/core-js/set'));

var _asyncToGenerator3 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));

var _promise2 = _interopRequireDefault(require('fbjs/lib/Promise'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('immutable'),
    ImmutableMap = _require.Map;

/* eslint-disable no-console-disallow */

var RelayFileWriter = function () {
  function RelayFileWriter(options) {
    (0, _classCallCheck3['default'])(this, RelayFileWriter);
    var config = options.config,
        onlyValidate = options.onlyValidate,
        baseDocuments = options.baseDocuments,
        documents = options.documents,
        schema = options.schema;

    this._onlyValidate = onlyValidate;
    this._outputDir = config.outputDir;
    this._baseSchema = schema;
    this._generateExtraFiles = config.generateExtraFiles || null;
    this._persistQuery = config.persistQuery || null;
    this._platform = config.platform || null;
    this._baseDocuments = baseDocuments || ImmutableMap();
    this._documents = documents;
  }

  RelayFileWriter.prototype.writeAll = function writeAll() {
    var _this = this;

    return (0, _asyncToGenerator3['default'])(function* () {
      var tStart = Date.now();

      var allDocuments = _this._baseDocuments.merge(_this._documents);

      // Can't convert to IR unless the schema already has Relay-local extensions
      var transformedSchema = require('./ASTConvert').transformASTSchema(_this._baseSchema);
      var extendedSchema = require('./ASTConvert').extendASTSchema(transformedSchema, allDocuments.valueSeq().toArray());

      // Build a context from all the documents
      var baseDefinitions = require('./ASTConvert').convertASTDocuments(extendedSchema, _this._baseDocuments.valueSeq().toArray(), require('./RelayValidator').LOCAL_RULES);
      var definitions = require('./ASTConvert').convertASTDocuments(extendedSchema, _this._documents.valueSeq().toArray(), require('./RelayValidator').LOCAL_RULES);
      var baseDefinitionNames = new _set2['default'](baseDefinitions.map(function (definition) {
        return definition.name;
      }));

      var compilerContext = new (require('./RelayCompilerContext'))(extendedSchema);
      compilerContext = compilerContext.addAll(baseDefinitions);
      var compiler = new (require('./RelayCompiler'))(_this._baseSchema, compilerContext);

      var outputDirectory = new (require('./CodegenDirectory'))(_this._outputDir, { onlyValidate: _this._onlyValidate });
      var allOutputDirectories = new _map2['default']();
      allOutputDirectories.set(_this._outputDir, outputDirectory);

      var nodes = compiler.addDefinitions(definitions);

      var transformedQueryContext = compiler.transformedQueryContext();
      var compiledDocumentMap = compiler.compile();

      var tCompiled = Date.now();

      var onlyValidate = _this._onlyValidate;
      function getOutputDirectory(dir) {
        if (!dir) {
          return outputDirectory;
        }
        var outputDir = allOutputDirectories.get(dir);
        if (!outputDir) {
          outputDir = new (require('./CodegenDirectory'))(dir, { onlyValidate: onlyValidate });
          allOutputDirectories.set(dir, outputDir);
        }
        return outputDir;
      }

      var compiledDocuments = [];
      nodes.forEach(function (node) {
        if (baseDefinitionNames.has(node.name)) {
          // don't add definitions that were part of base context
          return;
        }
        if (node.kind === 'Fragment') {
          require('././writeFlowFile')(outputDirectory, node, _this._platform || undefined);
        }
        var compiledNode = compiledDocumentMap.get(node.name);
        if (compiledNode) {
          compiledDocuments.push(compiledNode);
        }
      });

      var tFlow = Date.now();

      var tRelayQL = void 0;
      try {
        yield _promise2['default'].all(compiledDocuments.map(function () {
          var _ref = (0, _asyncToGenerator3['default'])(function* (generatedNode) {
            yield require('././writeRelayQLFile')(outputDirectory, generatedNode, _this.skipPersist ? null : _this._persistQuery, _this._platform || null);
          });

          return function (_x) {
            return _ref.apply(this, arguments);
          };
        }()));
        tRelayQL = Date.now();

        if (_this._generateExtraFiles) {
          _this._generateExtraFiles(getOutputDirectory, transformedQueryContext);
        }

        outputDirectory.deleteExtraFiles();
      } catch (error) {
        tRelayQL = Date.now();
        var details = void 0;
        try {
          details = JSON.parse(error.message);
        } catch (_) {}
        if (details && details.name === 'GraphQL2Exception' && details.message) {
          console.log('ERROR writing modules:\n' + details.message);
        } else {
          console.log('Error writing modules:\n' + error.toString());
        }
        return allOutputDirectories;
      }

      var tExtra = Date.now();
      console.log('Writer time: %s [%s compiling, %s relay files, %s flow types, %s extra]', toSeconds(tStart, tExtra), toSeconds(tStart, tCompiled), toSeconds(tCompiled, tFlow), toSeconds(tFlow, tRelayQL), toSeconds(tRelayQL, tExtra));
      return allOutputDirectories;
    })();
  };

  return RelayFileWriter;
}();

function toSeconds(t0, t1) {
  return ((t1 - t0) / 1000).toFixed(2) + 's';
}

module.exports = RelayFileWriter;