/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * 
 * @providesModule RelayPublishQueue
 */

'use strict';

var _classCallCheck3 = _interopRequireDefault(require('babel-runtime/helpers/classCallCheck'));

var _set2 = _interopRequireDefault(require('babel-runtime/core-js/set'));

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

/**
 * Coordinates the concurrent modification of a `Store` due to optimistic and
 * server updates:
 * - Applies optimistic updates.
 * - Reverts optimistic updates, rebasing any subsequent updates.
 * - Commits server updates:
 *   - Normalizes query/mutation/subscription responses.
 *   - Executes handlers for "handle" fields.
 *   - Reverts and reapplies pending optimistic updates.
 */
var RelayPublishQueue = function () {
  // Updaters to add with the next `run()`

  // True if the next `run()` should apply the backup and rerun all updates
  // performing a rebase.
  function RelayPublishQueue(store, handlerProvider) {
    (0, _classCallCheck3['default'])(this, RelayPublishQueue);

    this._backup = new (require('./RelayInMemoryRecordSource'))();
    this._handlerProvider = handlerProvider || null;
    this._pendingBackupRebase = false;
    this._pendingPayloads = new _set2['default']();
    this._pendingUpdaters = new _set2['default']();
    this._store = store;
    this._appliedUpdaters = new _set2['default']();
  }

  /**
   * Schedule applying an optimistic updates on the next `run()`.
   */

  // Updaters that are already added and might be rerun in order to rebase them.

  // Payloads to apply with the next `run()`.


  // A "negative" of all applied updaters. It can be published to the store to
  // undo them in order to re-apply some of them for a rebase.


  RelayPublishQueue.prototype.applyUpdate = function applyUpdate(updater) {
    require('fbjs/lib/invariant')(!this._appliedUpdaters.has(updater) && !this._pendingUpdaters.has(updater), 'RelayPublishQueue: Cannot apply the same update function more than ' + 'once concurrently.');
    this._pendingUpdaters.add(updater);
  };

  /**
   * Schedule reverting an optimistic updates on the next `run()`.
   */


  RelayPublishQueue.prototype.revertUpdate = function revertUpdate(updater) {
    if (this._pendingUpdaters.has(updater)) {
      // Reverted before it was applied
      this._pendingUpdaters['delete'](updater);
    } else if (this._appliedUpdaters.has(updater)) {
      this._pendingBackupRebase = true;
      this._appliedUpdaters['delete'](updater);
    }
  };

  /**
   * Schedule a revert of all optimistic updates on the next `run()`.
   */


  RelayPublishQueue.prototype.revertAll = function revertAll() {
    this._pendingBackupRebase = true;
    this._pendingUpdaters.clear();
    this._appliedUpdaters.clear();
  };

  /**
   * Schedule applying a payload to the store on the next `run()`.
   */


  RelayPublishQueue.prototype.commitPayload = function commitPayload(selector, _ref, updater) {
    var fieldPayloads = _ref.fieldPayloads,
        source = _ref.source;

    this._pendingBackupRebase = true;
    this._pendingPayloads.add({ fieldPayloads: fieldPayloads, selector: selector, source: source, updater: updater });
  };

  /**
   * Execute all queued up operations from the other public methods.
   */


  RelayPublishQueue.prototype.run = function run() {
    if (this._pendingBackupRebase && this._backup.size()) {
      this._store.publish(this._backup);
      this._backup = new (require('./RelayInMemoryRecordSource'))();
    }
    this._commitPayloads();
    this._applyUpdates();
    this._pendingBackupRebase = false;
    this._store.notify();
  };

  RelayPublishQueue.prototype._commitPayloads = function _commitPayloads() {
    var _this = this;

    if (!this._pendingPayloads.size) {
      return;
    }
    this._pendingPayloads.forEach(function (_ref2) {
      var fieldPayloads = _ref2.fieldPayloads,
          selector = _ref2.selector,
          source = _ref2.source,
          updater = _ref2.updater;

      var mutator = new (require('./RelayRecordSourceMutator'))(_this._store.getSource(), source);
      var proxy = new (require('./RelayRecordSourceSelectorProxy'))(mutator, selector);
      if (fieldPayloads && fieldPayloads.length) {
        fieldPayloads.forEach(function (fieldPayload) {
          var handler = _this._handlerProvider && _this._handlerProvider(fieldPayload.handle);
          require('fbjs/lib/invariant')(handler, 'RelayStaticEnvironment: Expected a handler to be provided for handle `%s`.', fieldPayload.handle);
          handler.update(proxy, fieldPayload);
        });
      }
      if (updater) {
        updater(proxy);
      }
      // Publish the server data first so that it is reflected in the mutation
      // backup created during the rebase
      _this._store.publish(source);
    });
    this._pendingPayloads.clear();
  };

  RelayPublishQueue.prototype._applyUpdates = function _applyUpdates() {
    var _this2 = this;

    if (this._pendingUpdaters.size || this._pendingBackupRebase && this._appliedUpdaters.size) {
      var sink = new (require('./RelayInMemoryRecordSource'))();
      var mutator = new (require('./RelayRecordSourceMutator'))(this._store.getSource(), sink, this._backup);
      var proxy = new (require('./RelayRecordSourceProxy'))(mutator);

      // rerun all updaters in case we are running a rebase
      if (this._pendingBackupRebase && this._appliedUpdaters.size) {
        this._appliedUpdaters.forEach(function (updater) {
          return updater(proxy);
        });
      }

      // apply any new updaters
      if (this._pendingUpdaters.size) {
        this._pendingUpdaters.forEach(function (updater) {
          updater(proxy);
          _this2._appliedUpdaters.add(updater);
        });
        this._pendingUpdaters.clear();
      }

      this._store.publish(sink);
    }
  };

  return RelayPublishQueue;
}();

module.exports = RelayPublishQueue;