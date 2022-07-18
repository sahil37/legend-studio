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

import packageJson from '../../../package.json';
import { QuestionIcon } from '@finos/legend-art';
import type { PackageableElement } from '@finos/legend-graph';
import {
  type DSL_LegendStudioPlugin_Extension,
  type EditorStore,
  type ElementEditorState,
  type ElementEditorStateCreator,
  type ElementIconGetter,
  type ElementProjectExplorerDnDTypeGetter,
  type ElementTypeGetter,
  type NewElementFromStateCreator,
  type NewElementState,
  LegendStudioPlugin,
  UnsupportedElementEditorState,
} from '@finos/legend-studio';
import { MasterRecordDefinition } from '../../models/metamodels/pure/model/packageableElements/mastery/DSLMastery_MasterRecordDefinition.js';

const MASTERY_ELEMENT_TYPE = 'MASTERY';
const MASTERY_ELEMENT_PROJECT_EXPLORER_DND_TYPE = 'PROJECT_EXPLORER_MASTERY';

export class DSLMastery_LegendStudioPlugin
  extends LegendStudioPlugin
  implements DSL_LegendStudioPlugin_Extension
{
  constructor() {
    super(packageJson.extensions.studioPlugin, packageJson.version);
  }

  getExtraSupportedElementTypes(): string[] {
    return [MASTERY_ELEMENT_TYPE];
  }

  getExtraElementTypeGetters(): ElementTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof MasterRecordDefinition) {
          return MASTERY_ELEMENT_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraElementIconGetters(): ElementIconGetter[] {
    return [
      (type: string): React.ReactNode | undefined => {
        if (type === MASTERY_ELEMENT_TYPE) {
          return (
            <div className="icon">
              <QuestionIcon />
            </div>
          );
        }
        return undefined;
      },
    ];
  }

  getExtraNewElementFromStateCreators(): NewElementFromStateCreator[] {
    return [
      (
        type: string,
        name: string,
        state: NewElementState,
      ): PackageableElement | undefined => {
        if (type === MASTERY_ELEMENT_TYPE) {
          return new MasterRecordDefinition(name);
        }
        return undefined;
      },
    ];
  }

  getExtraElementEditorStateCreators(): ElementEditorStateCreator[] {
    return [
      (
        editorStore: EditorStore,
        element: PackageableElement,
      ): ElementEditorState | undefined => {
        if (element instanceof MasterRecordDefinition) {
          return new UnsupportedElementEditorState(editorStore, element);
        }
        return undefined;
      },
    ];
  }

  getExtraElementProjectExplorerDnDTypeGetters(): ElementProjectExplorerDnDTypeGetter[] {
    return [
      (element: PackageableElement): string | undefined => {
        if (element instanceof MasterRecordDefinition) {
          return MASTERY_ELEMENT_PROJECT_EXPLORER_DND_TYPE;
        }
        return undefined;
      },
    ];
  }

  getExtraGrammarTextEditorDnDTypes(): string[] {
    return [MASTERY_ELEMENT_PROJECT_EXPLORER_DND_TYPE];
  }
}
