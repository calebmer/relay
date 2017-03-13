/**
 * Copyright (c) 2013-present, Facebook, Inc.
 * All rights reserved.
 *
 * This source code is licensed under the BSD-style license found in the
 * LICENSE file in the root directory of this source tree. An additional grant
 * of patent rights can be found in the PATENTS file in the same directory.
 *
 * @providesModule RelayExperimental
 * 
 */

'use strict';

/**
 * The public interface to Relay core.
 */
module.exports = {
  QueryRenderer: require('./ReactRelayQueryRenderer'),
  commitMutation: require('./commitRelayStaticMutation'),
  createFragmentContainer: require('./ReactRelayFragmentContainer').createContainer,
  createPaginationContainer: require('./ReactRelayPaginationContainer').createContainer,
  createRefetchContainer: require('./ReactRelayRefetchContainer').createContainer,
  fetchQuery: require('./fetchRelayStaticQuery'),
  graphql: require('./RelayStaticGraphQLTag').graphql
};