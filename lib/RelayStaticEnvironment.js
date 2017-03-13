/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayStaticEnvironment
 * 
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

var RelayStaticEnvironment = function () {
  function RelayStaticEnvironment(config) {
    (0, _classCallCheck3['default'])(this, RelayStaticEnvironment);

    this._network = config.network;
    this._publishQueue = new (require('./RelayPublishQueue'))(config.store, config.handlerProvider);
    this._store = config.store;
    this.unstable_internal = require('./RelayCore');
  }

  RelayStaticEnvironment.prototype.getStore = function getStore() {
    return this._store;
  };

  RelayStaticEnvironment.prototype.applyUpdate = function applyUpdate(updater) {
    var _this = this;

    var dispose = function dispose() {
      _this._publishQueue.revertUpdate(updater);
      _this._publishQueue.run();
    };
    this._publishQueue.applyUpdate(updater);
    this._publishQueue.run();
    return { dispose: dispose };
  };

  RelayStaticEnvironment.prototype.commitPayload = function commitPayload(selector, payload) {
    // Do not handle stripped nulls when commiting a payload
    var relayPayload = require('./normalizeRelayPayload')(selector, payload);
    this._publishQueue.commitPayload(selector, relayPayload);
    this._publishQueue.run();
  };

  RelayStaticEnvironment.prototype.lookup = function lookup(selector) {
    return this._store.lookup(selector);
  };

  RelayStaticEnvironment.prototype.subscribe = function subscribe(snapshot, callback) {
    return this._store.subscribe(snapshot, callback);
  };

  RelayStaticEnvironment.prototype.retain = function retain(selector) {
    return this._store.retain(selector);
  };

  RelayStaticEnvironment.prototype.sendQuery = function sendQuery(_ref) {
    var _this2 = this;

    var cacheConfig = _ref.cacheConfig,
        onCompleted = _ref.onCompleted,
        onError = _ref.onError,
        onNext = _ref.onNext,
        operation = _ref.operation;

    var isDisposed = false;
    var dispose = function dispose() {
      isDisposed = true;
    };
    this._network.request(operation.node, operation.variables, cacheConfig).then(function (payload) {
      if (isDisposed) {
        return;
      }
      _this2._publishQueue.commitPayload(operation.fragment, payload);
      _this2._publishQueue.run();
      onNext && onNext(payload);
      onCompleted && onCompleted();
    })['catch'](function (error) {
      if (isDisposed) {
        return;
      }
      onError && onError(error);
    });
    return { dispose: dispose };
  };

  RelayStaticEnvironment.prototype.sendQuerySubscription = function sendQuerySubscription(_ref2) {
    var _this3 = this;

    var cacheConfig = _ref2.cacheConfig,
        onCompleted = _ref2.onCompleted,
        onError = _ref2.onError,
        _onNext = _ref2.onNext,
        operation = _ref2.operation;

    return this._network.requestSubscription(operation.node, operation.variables, cacheConfig, {
      onCompleted: onCompleted,
      onError: onError,
      onNext: function onNext(payload) {
        _this3._publishQueue.commitPayload(operation.fragment, payload);
        _this3._publishQueue.run();
        _onNext && _onNext(payload);
      }
    });
  };

  RelayStaticEnvironment.prototype.sendMutation = function sendMutation(_ref3) {
    var _this4 = this;

    var onCompleted = _ref3.onCompleted,
        onError = _ref3.onError,
        operation = _ref3.operation,
        optimisticUpdater = _ref3.optimisticUpdater,
        updater = _ref3.updater;

    if (optimisticUpdater) {
      this._publishQueue.applyUpdate(optimisticUpdater);
      this._publishQueue.run();
    }
    var isDisposed = false;
    var dispose = function dispose() {
      if (optimisticUpdater) {
        _this4._publishQueue.revertUpdate(optimisticUpdater);
        _this4._publishQueue.run();
        optimisticUpdater = null;
      }
      isDisposed = true;
    };
    this._network.request(operation.node, operation.variables, { force: true }).then(function (payload) {
      if (isDisposed) {
        return;
      }
      if (optimisticUpdater) {
        _this4._publishQueue.revertUpdate(optimisticUpdater);
      }
      _this4._publishQueue.commitPayload(operation.fragment, payload, updater);
      _this4._publishQueue.run();
      onCompleted && onCompleted();
    })['catch'](function (error) {
      if (isDisposed) {
        return;
      }
      if (optimisticUpdater) {
        _this4._publishQueue.revertUpdate(optimisticUpdater);
      }
      _this4._publishQueue.run();
      onError && onError(error);
    });
    return { dispose: dispose };
  };

  return RelayStaticEnvironment;
}();

module.exports = RelayStaticEnvironment;