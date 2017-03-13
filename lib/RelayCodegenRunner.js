/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule RelayCodegenRunner
 * 
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _promise2 = _interopRequireDefault(require('fbjs/lib/Promise'));

var _asyncToGenerator3 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));

var _set2 = _interopRequireDefault(require('babel-runtime/core-js/set'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('immutable'),
    ImmutableMap = _require.Map;

/* eslint-disable no-console-disallow */

var RelayCodegenRunner = function () {
  function RelayCodegenRunner(options) {
    var _this6 = this;

    (0, _classCallCheck3['default'])(this, RelayCodegenRunner);
    this.parsers = {};

    this.parserConfigs = options.parserConfigs;
    this.writerConfigs = options.writerConfigs;
    this.onlyValidate = options.onlyValidate;
    this.skipPersist = options.skipPersist;

    this.parserWriters = {};
    for (var _parser in options.parserConfigs) {
      this.parserWriters[_parser] = new _set2['default']();
    }

    var _loop = function _loop(_writer) {
      var config = options.writerConfigs[_writer];
      config.baseParsers && config.baseParsers.forEach(function (parser) {
        return _this6.parserWriters[parser].add(_writer);
      });
      _this6.parserWriters[config.parser].add(_writer);
    };

    for (var _writer in options.writerConfigs) {
      _loop(_writer);
    }
  }
  // parser => writers that are affected by it


  RelayCodegenRunner.prototype.compileAll = function compileAll() {
    var _this = this;

    return (0, _asyncToGenerator3['default'])(function* () {
      var hasChanges = false;

      // reset the parsers
      _this.parsers = {};
      for (var parserName in _this.parserConfigs) {
        yield _this.parseEverything(parserName);
      }

      for (var writerName in _this.writerConfigs) {
        var writerChanges = yield _this.write(writerName);
        hasChanges = writerChanges || hasChanges;
      }

      return hasChanges;
    })();
  };

  RelayCodegenRunner.prototype.parseEverything = function parseEverything(parserName) {
    var _this2 = this;

    return (0, _asyncToGenerator3['default'])(function* () {
      if (_this2.parsers[parserName]) {
        // no need to parse
        return;
      }

      var parserConfig = _this2.parserConfigs[parserName];
      var baseParserName = parserConfig.baseParser;
      if (baseParserName) {
        if (!_this2.parsers[baseParserName]) {
          yield _this2.parseEverything(baseParserName);
        }
      }

      // Shortly, this will be moved to a getParser function in the config
      var parser = require('./RelayFileIRParser').parser(parserConfig.baseDir);
      _this2.parsers[parserName] = parser;

      var files = yield require('./RelayCodegenWatcher').queryFiles(parserConfig.baseDir, parserConfig.watchmanExpression, getFileFilter(parserConfig.baseDir));
      _this2.parseFileChanges(parserName, files);
    })();
  };

  RelayCodegenRunner.prototype.parseFileChanges = function parseFileChanges(parserName, files) {
    var tStart = Date.now();
    var parser = this.parsers[parserName];
    // this maybe should be await parser.parseFiles(files);
    parser.parseFiles(files);
    var tEnd = Date.now();
    console.log('Parsed %s in %s', parserName, toSeconds(tStart, tEnd));
  };

  // We cannot do incremental writes right now.
  // When we can, this could be writeChanges(writerName, parserName, parsedDefinitions)


  RelayCodegenRunner.prototype.write = function write(writerName) {
    var _this3 = this;

    return (0, _asyncToGenerator3['default'])(function* () {
      console.log('\nWriting %s', writerName);
      var tStart = Date.now();
      var _this3$writerConfigs$ = _this3.writerConfigs[writerName],
          getWriter = _this3$writerConfigs$.getWriter,
          parser = _this3$writerConfigs$.parser,
          baseParsers = _this3$writerConfigs$.baseParsers;


      var baseDocuments = ImmutableMap();
      if (baseParsers) {
        baseParsers.forEach(function (baseParserName) {
          baseDocuments = baseDocuments.merge(_this3.parsers[baseParserName].documents());
        });
      }

      // always create a new writer: we have to write everything anyways
      var documents = _this3.parsers[parser].documents();
      var schema = _this3.parserConfigs[parser].getSchema();
      var writer = getWriter(_this3.onlyValidate, schema, documents, baseDocuments);
      var outputDirectories = yield writer.writeAll();
      var tWritten = Date.now();

      function combineChanges(accessor) {
        var combined = [];
        var _iteratorNormalCompletion = true;
        var _didIteratorError = false;
        var _iteratorError = undefined;

        try {
          for (var _iterator = outputDirectories.values()[Symbol.iterator](), _step; !(_iteratorNormalCompletion = (_step = _iterator.next()).done); _iteratorNormalCompletion = true) {
            var dir = _step.value;

            combined.push.apply(combined, accessor(dir.changes));
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

        return combined;
      }
      var created = combineChanges(function (_) {
        return _.created;
      });
      var updated = combineChanges(function (_) {
        return _.updated;
      });
      var deleted = combineChanges(function (_) {
        return _.deleted;
      });
      var unchanged = combineChanges(function (_) {
        return _.unchanged;
      });

      if (_this3.onlyValidate) {
        printFiles('Missing', created);
        printFiles('Out of date', updated);
        printFiles('Extra', deleted);
      } else {
        printFiles('Created', created);
        printFiles('Updated', updated);
        printFiles('Deleted', deleted);
        console.log('Unchanged: %s files', unchanged.length);
      }

      console.log('Written %s in %s', writerName, toSeconds(tStart, tWritten));

      var hasChanges = created.length + updated.length + deleted.length > 0;
      return hasChanges;
    })();
  };

  RelayCodegenRunner.prototype.watchAll = function watchAll() {
    var _this4 = this;

    return (0, _asyncToGenerator3['default'])(function* () {
      // get everything set up for watching
      yield _this4.compileAll();

      for (var parserName in _this4.parserConfigs) {
        yield _this4.watch(parserName);
      }
    })();
  };

  RelayCodegenRunner.prototype.watch = function watch(parserName) {
    var _this5 = this;

    return (0, _asyncToGenerator3['default'])(function* () {
      var parserConfig = _this5.parserConfigs[parserName];

      // watchCompile starts with a full set of files as the changes
      // But as we need to set everything up due to potential parser dependencies,
      // we should prevent the first watch callback from doing anything.
      var firstChange = true;

      yield require('./RelayCodegenWatcher').watchCompile(parserConfig.baseDir, parserConfig.watchmanExpression, getFileFilter(parserConfig.baseDir), function () {
        var _ref = (0, _asyncToGenerator3['default'])(function* (files) {
          require('fbjs/lib/invariant')(_this5.parsers[parserName], 'Trying to watch an uncompiled parser config: %s', parserName);
          if (firstChange) {
            firstChange = false;
            return;
          }
          var dependentWriters = [];
          _this5.parserWriters[parserName].forEach(function (writer) {
            return dependentWriters.push(writer);
          });
          if (!_this5.parsers[parserName]) {
            // have to load the parser and make sure all of its dependents are set
            yield _this5.parseEverything(parserName);
          } else {
            _this5.parseFileChanges(parserName, files);
          }

          yield _promise2['default'].all(dependentWriters.map(function (writer) {
            return _this5.write(writer);
          }));
        });

        return function (_x) {
          return _ref.apply(this, arguments);
        };
      }());
      console.log('Watching for changes to %s...', parserName);
    })();
  };

  return RelayCodegenRunner;
}();

function readFile(baseDir, filename) {
  return require('fs').readFileSync(require('path').join(baseDir, filename), 'utf8');
}

function getFileFilter(baseDir) {
  return function (filename) {
    return readFile(baseDir, filename).indexOf('graphql') >= 0;
  };
}

function toSeconds(t0, t1) {
  return ((t1 - t0) / 1000).toFixed(2) + 's';
}

function printFiles(label, files) {
  if (files.length > 0) {
    console.log(label + ':');
    files.forEach(function (file) {
      console.log(' - ' + file);
    });
  }
}

module.exports = RelayCodegenRunner;