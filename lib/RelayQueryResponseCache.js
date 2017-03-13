/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayQueryResponseCache
 * 
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _map2 = _interopRequireDefault(require('babel-runtime/core-js/map'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * A cache for storing query responses, featuring:
 * - `get` with TTL
 * - cache size limiting, with least-recently *updated* entries purged first
 */
var RelayQueryResponseCache = function () {
  function RelayQueryResponseCache(_ref) {
    var size = _ref.size,
        ttl = _ref.ttl;
    (0, _classCallCheck3['default'])(this, RelayQueryResponseCache);

    require('fbjs/lib/invariant')(size > 0, 'RelayQueryResponseCache: Expected the max cache size to be > 0, got ' + '`%s`.', size);
    require('fbjs/lib/invariant')(ttl > 0, 'RelayQueryResponseCache: Expected the max ttl to be > 0, got ' + '`%s`.', ttl);
    this._responses = new _map2['default']();
    this._size = size;
    this._ttl = ttl;
  }

  RelayQueryResponseCache.prototype.clear = function clear() {
    this._responses.clear();
  };

  RelayQueryResponseCache.prototype.get = function get(queryID, variables) {
    var cacheKey = getCacheKey(queryID, variables);
    var response = this._responses.get(cacheKey);
    return response != null && isCurrent(response.fetchTime, this._ttl) ? response.payload : null;
  };

  RelayQueryResponseCache.prototype.set = function set(queryID, variables, payload) {
    var _this = this;

    var fetchTime = Date.now();
    var cacheKey = getCacheKey(queryID, variables);
    this._responses['delete'](cacheKey); // deletion resets key ordering
    this._responses.set(cacheKey, {
      fetchTime: fetchTime,
      payload: payload
    });
    // Purge least-recently updated key when max size reached
    if (this._responses.size > this._size) {
      var firstKey = this._responses.keys().next();
      if (!firstKey.done) {
        this._responses['delete'](firstKey.value);
      }
    }
    // Purge the entry on timeout
    setTimeout(function () {
      var response = _this._responses.get(cacheKey);
      if (response && !isCurrent(response.fetchTime, _this._ttl)) {
        // Only purge if the entry hasn't been updated
        _this._responses['delete'](cacheKey);
      }
    }, this._ttl);
  };

  return RelayQueryResponseCache;
}();

function getCacheKey(queryID, variables) {
  return require('./stableJSONStringify')({ queryID: queryID, variables: variables });
}

/**
 * Determine whether a response fetched at `fetchTime` is still valid given
 * some `ttl`.
 */
function isCurrent(fetchTime, ttl) {
  return fetchTime + ttl >= Date.now();
}

module.exports = RelayQueryResponseCache;