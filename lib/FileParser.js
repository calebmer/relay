/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule FileParser
 * 
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _set2 = _interopRequireDefault(require('babel-runtime/core-js/set'));

var _map2 = _interopRequireDefault(require('babel-runtime/core-js/map'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('immutable'),
    ImmutableMap = _require.Map;

var FileParser = function () {
  function FileParser(config) {
    (0, _classCallCheck3['default'])(this, FileParser);
    this._documents = new _map2['default']();

    this._baseDir = config.baseDir;
    this._parse = config.parse;
  }

  // Short-term: we don't do subscriptions/delta updates, instead always use all definitions


  FileParser.prototype.documents = function documents() {
    return ImmutableMap(this._documents);
  };

  // parse should return the set of changes


  FileParser.prototype.parseFiles = function parseFiles(files) {
    var _this = this;

    var documents = ImmutableMap();

    files.forEach(function (file) {
      var doc = _this._parse(require('path').join(_this._baseDir, file));
      if (!doc) {
        _this._documents['delete'](file);
        return;
      }

      documents = documents.set(file, doc);
      _this._documents.set(file, doc);
    });

    return documents;
  };

  return FileParser;
}();

module.exports = FileParser;