/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayNetworkLogger
 * 
 */

'use strict';

/* eslint-disable no-console-disallow */

var _promise2 = _interopRequireDefault(require('fbjs/lib/Promise'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var queryID = 1;

var RelayNetworkLogger = {
  create: function create(fetch, graphiQLPrinter) {
    return function (operation, variables, cacheConfig) {
      var id = queryID++;
      var name = operation.name;

      var idName = '[' + id + '] Relay Modern: ' + name;

      console.time && console.time(idName);

      var onSettled = function onSettled(error, response) {
        console.groupCollapsed('%c' + idName, error ? 'color:red' : '');
        console.timeEnd && console.timeEnd(idName);
        console.log('GraphiQL:', graphiQLPrinter(operation, variables));
        console.log('Cache Config:', cacheConfig);
        console.log('Variables:', require('./prettyStringify')(variables));
        if (error) {
          console.error('Error:', error);
        }
        if (response) {
          console.log('Response:', response);
        }
        console.groupEnd();
      };

      var request = fetch(operation, variables, cacheConfig);
      request.then(function (response) {
        onSettled(null, response);
      }, function (error) {
        onSettled(error, null);
      });
      return request;
    };
  }
};

module.exports = RelayNetworkLogger;