/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayNetwork
 * 
 */

'use strict';

var _stringify2 = _interopRequireDefault(require('babel-runtime/core-js/json/stringify'));

var _promise2 = _interopRequireDefault(require('fbjs/lib/Promise'));

var _asyncToGenerator3 = _interopRequireDefault(require('babel-runtime/helpers/asyncToGenerator'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var _require = require('./RelayStoreUtils'),
    ROOT_ID = _require.ROOT_ID;

/**
 * Creates an implementation of the `Network` interface defined in
 * `RelayNetworkTypes` given a single `fetch` function.
 */
function create(fetch) {
  var request = function () {
    var _ref = (0, _asyncToGenerator3['default'])(function* (operation, variables, cacheConfig) {
      var payload = yield fetch(operation, variables, cacheConfig);
      return normalizePayload(operation, variables, payload);
    });

    return function request(_x, _x2, _x3) {
      return _ref.apply(this, arguments);
    };
  }();

  function requestSubscription(operation, variables, cacheConfig, _ref2) {
    var onCompleted = _ref2.onCompleted,
        onError = _ref2.onError,
        onNext = _ref2.onNext;

    var isDisposed = false;
    fetch(operation, variables, cacheConfig).then(function (payload) {
      if (isDisposed) {
        return;
      }
      var relayPayload = void 0;
      try {
        relayPayload = normalizePayload(operation, variables, payload);
      } catch (err) {
        onError && onError(err);
        return;
      }
      onNext && onNext(relayPayload);
      onCompleted && onCompleted();
    }, function (error) {
      if (isDisposed) {
        return;
      }
      onError && onError(error);
    })['catch'](rethrow);
    return {
      dispose: function dispose() {
        isDisposed = true;
      }
    };
  }

  return {
    fetch: fetch,
    request: request,
    requestSubscription: requestSubscription
  };
}

function normalizePayload(operation, variables, payload) {
  var _ref3 = payload,
      data = _ref3.data,
      errors = _ref3.errors;

  if (data != null) {
    if (errors && errors.length) {
      require('fbjs/lib/warning')(false, 'RelayNetwork: Operation completed but had errors:\n' + 'Operation: %s\n' + 'Variables:\n%s\n' + 'Errors:\n%s', operation.name, (0, _stringify2['default'])(variables), errors.map(function (_ref4) {
        var message = _ref4.message;
        return '- ' + String(message);
      }).join('\n'));
    }
    return require('./normalizeRelayPayload')({
      dataID: ROOT_ID,
      node: operation.query,
      variables: variables
    }, data, { handleStrippedNulls: true });
  }
  var error = require('./RelayError').create('RelayNetwork', 'No data returned for operation `%s`, got error(s):\n%s\n\nSee the error ' + '`source` property for more information.', operation.name, errors ? errors.map(function (_ref5) {
    var message = _ref5.message;
    return message;
  }).join('\n') : '(No errors)');
  error.source = { errors: errors, operation: operation, variables: variables };
  throw error;
}

function rethrow(err) {
  setTimeout(function () {
    throw err;
  }, 0);
}

module.exports = { create: create };