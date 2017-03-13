/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule commitRelayStaticMutation
 * 
 */

'use strict';

/**
 * Higher-level helper function to execute a mutation against a specific
 * environment.
 */
function commitRelayStaticMutation(environment, config) {
  var _environment$unstable = environment.unstable_internal,
      createOperationSelector = _environment$unstable.createOperationSelector,
      getOperation = _environment$unstable.getOperation;

  var mutation = getOperation(config.mutation);
  var onError = config.onError,
      optimisticUpdater = config.optimisticUpdater,
      updater = config.updater,
      variables = config.variables;

  var operation = createOperationSelector(mutation, variables);
  return environment.sendMutation({
    onError: onError,
    operation: operation,
    optimisticUpdater: optimisticUpdater,
    updater: updater,
    onCompleted: function onCompleted() {
      var onCompleted = config.onCompleted;

      if (onCompleted) {
        var snapshot = environment.lookup(operation.fragment);
        onCompleted(snapshot.data);
      }
    }
  });
}

module.exports = commitRelayStaticMutation;