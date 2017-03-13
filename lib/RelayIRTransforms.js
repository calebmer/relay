/**
 * Copyright 2004-present Facebook. All Rights Reserved.
 *
 * @providesModule RelayIRTransforms
 * 
 */

'use strict';

// Transforms applied to the code used to process a query response.
var SCHEMA_TRANSFORMS = [require('./RelayConnectionTransform').transformSchema, require('./RelayExportTransform').transformSchema, require('./RelayRelayDirectiveTransform').transformSchema];

// IR-level validators
var VALIDATORS = [require('./RelayKnownFragmentSpreadValidator').validate];

// Transforms applied to fragments used for reading data from a store
var FRAGMENT_TRANSFORMS = [function (ctx) {
  return require('./RelayConnectionTransform').transform(ctx);
}, require('./RelayViewerHandleTransform').transform, require('./RelayRelayDirectiveTransform').transform, require('./RelayFieldHandleTransform').transform, function (ctx) {
  return require('./RelayFlattenTransform').transform(ctx, {
    flattenAbstractTypes: true
  });
}, require('./RelaySkipRedundantNodesTransform').transform];

// Transforms applied to queries/mutations/subscriptions that are used for
// fetching data from the server and parsing those responses.
var QUERY_TRANSFORMS = [function (ctx) {
  return require('./RelayConnectionTransform').transform(ctx, {
    generateRequisiteFields: true
  });
}, require('./RelayViewerHandleTransform').transform, require('./RelayApplyFragmentArgumentTransform').transform, require('./RelaySkipClientFieldTransform').transform, require('./RelaySkipUnreachableNodeTransform').transform, require('./RelayExportTransform').transform, require('./RelayRelayDirectiveTransform').transform, require('./RelayGenerateRequisiteFieldsTransform').transform, require('./RelayFilterDirectivesTransform').transform];

// Transforms applied to the code used to process a query response.
var CODEGEN_TRANSFORMS = [function (ctx) {
  return require('./RelayFlattenTransform').transform(ctx, {
    flattenAbstractTypes: true,
    flattenFragmentSpreads: true
  });
}, require('./RelaySkipRedundantNodesTransform').transform];

// Transforms applied before printing the query sent to the server.
var PRINT_TRANSFORMS = [function (ctx) {
  return require('./RelayFlattenTransform').transform(ctx, {});
}, require('./RelaySkipHandleFieldTransform').transform];

module.exports = {
  SCHEMA_TRANSFORMS: SCHEMA_TRANSFORMS,
  VALIDATORS: VALIDATORS,
  FRAGMENT_TRANSFORMS: FRAGMENT_TRANSFORMS,
  QUERY_TRANSFORMS: QUERY_TRANSFORMS,
  CODEGEN_TRANSFORMS: CODEGEN_TRANSFORMS,
  PRINT_TRANSFORMS: PRINT_TRANSFORMS
};