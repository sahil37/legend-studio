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

import { observable, computed, makeObservable, action } from 'mobx';
import { addUniqueEntry, deleteEntry, hashArray } from '@finos/legend-shared';
import type { Hashable } from '@finos/legend-shared';
import { SERVICE_STORE_HASH_STRUCTURE } from '../../../../../../../ESService_ModelUtils';
import type { ServiceParameterMapping } from './ServiceParameterMapping';
import type { ServiceStoreService } from '../model/ServiceStoreService';
import type { RootServiceInstanceSetImplementation } from './RootServiceInstanceSetImplementation';

export class ServiceMapping implements Hashable {
  owner!: RootServiceInstanceSetImplementation;
  service!: ServiceStoreService;
  parameterMappings: ServiceParameterMapping[] = [];

  constructor() {
    makeObservable(this, {
      service: observable,
      parameterMappings: observable,
      setService: action,
      addServiceMapping: action,
      deleteServiceMapping: action,
      hashCode: computed,
    });
  }

  setService(value: string): void {
    this.service.setId(value);
  }

  addServiceMapping(value: ServiceParameterMapping): void {
    addUniqueEntry(this.parameterMappings, value);
  }

  deleteServiceMapping(value: ServiceParameterMapping): void {
    deleteEntry(this.parameterMappings, value);
  }

  get hashCode(): string {
    return hashArray([
      SERVICE_STORE_HASH_STRUCTURE.SERVICE_MAPPING,
      this.service.id,
      hashArray(this.parameterMappings),
    ]);
  }
}