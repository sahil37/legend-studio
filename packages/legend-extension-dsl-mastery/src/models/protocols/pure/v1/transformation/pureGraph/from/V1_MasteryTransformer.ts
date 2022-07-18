/**
 * Copyright (c) 2020-present, Goldman Sachs
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import type { MasterRecordDefinition } from '../../../../../../metamodels/pure/model/packageableElements/mastery/DSLMastery_MasterRecordDefinition.js';
import type {
  IdentityResolution,
  ResolutionQuery,
} from '../../../../../../metamodels/pure/model/packageableElements/mastery/DSLMastery_IdentityResolution.js';
import { V1_MasterRecordDefinition } from '../../../model/packageableElements/mastery/V1_DSLMastery_MasterRecordDefinition.js';
import {
  V1_IdentityResolution,
  V1_ResolutionQuery,
} from '../../../model/packageableElements/mastery/V1_DSLMastery_IdentityResolution.js';
import {
  type V1_GraphTransformerContext,
  V1_initPackageableElement,
  V1_RawLambda,
} from '@finos/legend-graph';

/**********
 * identity resolution
 **********/

export const V1_transformResolutionQuery = (
  element: ResolutionQuery,
  context: V1_GraphTransformerContext,
): V1_ResolutionQuery => {
  const resolutionQuery = new V1_ResolutionQuery();
  resolutionQuery.keyType = element.keyType;
  resolutionQuery.precedence = element.precedence;
  resolutionQuery.queries = element.queries.map((rq) => {
    const lambda = new V1_RawLambda();
    lambda.parameters = rq.parameters;
    lambda.body = rq.body;
    return lambda;
  });
  return resolutionQuery;
};

export const V1_transformIdentityResolution = (
  element: IdentityResolution,
  context: V1_GraphTransformerContext,
): V1_IdentityResolution => {
  const identityResolution = new V1_IdentityResolution();
  identityResolution.modelClass = element.modelClass;
  identityResolution.resolutionQueries = element.resolutionQueries.map((q) =>
    V1_transformResolutionQuery(q, context),
  );
  return identityResolution;
};

/**********
 * master record definition
 **********/

export const V1_transformMasterRecordDefinition = (
  element: MasterRecordDefinition,
  context: V1_GraphTransformerContext,
): V1_MasterRecordDefinition => {
  const protocol = new V1_MasterRecordDefinition();
  V1_initPackageableElement(protocol, element);
  protocol.modelClass = element.modelClass;
  protocol.identityResolution = V1_transformIdentityResolution(
    element.identityResolution,
    context,
  );
  return protocol;
};
