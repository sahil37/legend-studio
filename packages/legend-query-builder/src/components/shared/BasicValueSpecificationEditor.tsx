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

import { useApplicationStore } from '@finos/legend-application';
import {
  type TooltipPlacement,
  type InputActionData,
  Tooltip,
  DollarIcon,
  clsx,
  InfoCircleIcon,
  RefreshIcon,
  CheckSquareIcon,
  SquareIcon,
  CustomSelectorInput,
  SaveIcon,
  PencilIcon,
  DragPreviewLayer,
  FilledWindowMaximizeIcon,
  BasePopover,
  PanelFormSection,
} from '@finos/legend-art';
import {
  type Enum,
  type Type,
  type ValueSpecification,
  type PureModel,
  PrimitiveInstanceValue,
  CollectionInstanceValue,
  EnumValueInstanceValue,
  INTERNAL__PropagatedValue,
  SimpleFunctionExpression,
  VariableExpression,
  EnumValueExplicitReference,
  PrimitiveType,
  PRIMITIVE_TYPE,
  GenericTypeExplicitReference,
  GenericType,
  Enumeration,
  getEnumValue,
  getMultiplicityDescription,
  type ObserverContext,
} from '@finos/legend-graph';
import {
  type DebouncedFunc,
  type GeneratorFn,
  guaranteeNonNullable,
  isNonNullable,
  returnUndefOnError,
  uniq,
  parseCSVString,
} from '@finos/legend-shared';
import { flowResult } from 'mobx';
import { observer } from 'mobx-react-lite';
import CSVParser from 'papaparse';
import { useEffect, useRef, useState } from 'react';
import {
  instanceValue_setValue,
  instanceValue_setValues,
} from '../../stores/shared/ValueSpecificationModifierHelper.js';
import { CustomDatePicker } from './CustomDatePicker.js';

type TypeCheckOption = {
  expectedType: Type;
  /**
   * Indicates if a strict type-matching will happen.
   * Sometimes, auto-boxing allow some rooms to wiggle,
   * for example we can assign a Float to an Integer, a
   * Date to a DateTime. With this flag set to `true`
   * we will not allow this.
   */
  match?: boolean;
};

export const VariableInfoTooltip: React.FC<{
  variable: VariableExpression;
  children: React.ReactElement;
  placement?: TooltipPlacement | undefined;
}> = (props) => {
  const { variable, children, placement } = props;
  const type = variable.genericType?.value.rawType;
  return (
    <Tooltip
      arrow={true}
      {...(placement !== undefined ? { placement } : {})}
      classes={{
        tooltip: 'value-spec-paramater__tooltip',
        arrow: 'value-spec-paramater__tooltip__arrow',
        tooltipPlacementRight: 'value-spec-paramater__tooltip--right',
      }}
      TransitionProps={{
        // disable transition
        // NOTE: somehow, this is the only workaround we have, if for example
        // we set `appear = true`, the tooltip will jump out of position
        timeout: 0,
      }}
      title={
        <div className="value-spec-paramater__tooltip__content">
          <div className="value-spec-paramater__tooltip__item">
            <div className="value-spec-paramater__tooltip__item__label">
              Type
            </div>
            <div className="value-spec-paramater__tooltip__item__value">
              {type?.name ?? ''}
            </div>
          </div>
          <div className="value-spec-paramater__tooltip__item">
            <div className="value-spec-paramater__tooltip__item__label">
              Var Name
            </div>
            <div className="value-spec-paramater__tooltip__item__value">
              {variable.name}
            </div>
          </div>
          <div className="value-spec-paramater__tooltip__item">
            <div className="value-spec-paramater__tooltip__item__label">
              Multiplicity
            </div>
            <div className="value-spec-paramater__tooltip__item__value">
              {getMultiplicityDescription(variable.multiplicity)}
            </div>
          </div>
        </div>
      }
    >
      {children}
    </Tooltip>
  );
};

export const QUERY_BUILDER_VARIABLE_DND_TYPE = 'VARIABLE';

export interface QueryBuilderVariableDragSource {
  variable: VariableExpression;
}

const VariableExpressionParameterEditor = observer(
  (props: {
    valueSpecification: VariableExpression;
    resetValue: () => void;
    className?: string | undefined;
    isConstant?: boolean;
  }) => {
    const { valueSpecification, resetValue, isConstant, className } = props;
    const varName = valueSpecification.name;
    return (
      <>
        <DragPreviewLayer
          labelGetter={(item: QueryBuilderVariableDragSource): string =>
            item.variable.name
          }
          types={[QUERY_BUILDER_VARIABLE_DND_TYPE]}
        />
        <div
          className={clsx('value-spec-editor__variable', className, {
            'value-spec-editor__variable__constant': isConstant,
          })}
        >
          <div className="value-spec-editor__variable__icon">
            {isConstant ? <div className="icon">C</div> : <DollarIcon />}
          </div>
          <div className="value-spec-editor__variable__label">
            <div className="value-spec-editor__variable__text">{varName}</div>
            <VariableInfoTooltip variable={valueSpecification}>
              <div className="value-spec-editor__variable__info">
                <InfoCircleIcon />
              </div>
            </VariableInfoTooltip>

            <button
              className="value-spec-editor__variable__reset-btn"
              title="Reset"
              onClick={resetValue}
            >
              <RefreshIcon />
            </button>
          </div>
        </div>
      </>
    );
  },
);

const StringPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
    selectorConfig?:
      | {
          values: string[] | undefined;
          isLoading: boolean;
          reloadValues:
            | DebouncedFunc<(inputValue: string) => GeneratorFn<void>>
            | undefined;
          cleanUpReloadValues?: () => void;
        }
      | undefined;
  }) => {
    const {
      valueSpecification,
      className,
      resetValue,
      setValueSpecification,
      selectorConfig,
    } = props;
    const useSelector = Boolean(selectorConfig);
    const applicationStore = useApplicationStore();
    const value = valueSpecification.values[0] as string;
    const updateValueSpec = (val: string): void => {
      instanceValue_setValue(valueSpecification, val, 0);
      setValueSpecification(valueSpecification);
    };
    const changeInputValue: React.ChangeEventHandler<HTMLInputElement> = (
      event,
    ) => {
      updateValueSpec(event.target.value);
    };
    // custom select
    const selectedValue = { value: value, label: value };
    const reloadValuesFunc = selectorConfig?.reloadValues;
    const changeValue = (
      val: null | { value: number | string; label: string },
    ): void => {
      const newValue = val === null ? '' : val.value.toString();
      updateValueSpec(newValue);
    };
    const handleInputChange = (
      inputValue: string,
      actionChange: InputActionData,
    ): void => {
      if (actionChange.action === 'input-change') {
        updateValueSpec(inputValue);
        reloadValuesFunc?.cancel();
        const reloadValuesFuncTransformation = reloadValuesFunc?.(inputValue);
        if (reloadValuesFuncTransformation) {
          flowResult(reloadValuesFuncTransformation).catch(
            applicationStore.alertUnhandledError,
          );
        }
      }
      if (actionChange.action === 'input-blur') {
        reloadValuesFunc?.cancel();
        selectorConfig?.cleanUpReloadValues?.();
      }
    };
    const isLoading = selectorConfig?.isLoading;
    const queryOptions = selectorConfig?.values?.length
      ? selectorConfig.values.map((e) => ({
          value: e,
          label: e.toString(),
        }))
      : undefined;
    const noOptionsMessage =
      selectorConfig?.values === undefined ? (): null => null : undefined;

    return (
      <div className={clsx('value-spec-editor', className)}>
        {useSelector ? (
          <CustomSelectorInput
            className="value-spec-editor__enum-selector"
            options={queryOptions}
            onChange={changeValue}
            value={selectedValue}
            inputValue={value}
            onInputChange={handleInputChange}
            darkMode={
              !applicationStore.layoutService
                .TEMPORARY__isLightColorThemeEnabled
            }
            isLoading={isLoading}
            allowCreateWhileLoading={true}
            noOptionsMessage={noOptionsMessage}
            components={{
              DropdownIndicator: null,
            }}
          />
        ) : (
          <input
            className="panel__content__form__section__input value-spec-editor__input"
            spellCheck={false}
            value={value}
            placeholder={value === '' ? '(empty)' : undefined}
            onChange={changeInputValue}
          />
        )}
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const BooleanPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: ValueSpecification) => void;
  }) => {
    const { valueSpecification, className, resetValue, setValueSpecification } =
      props;
    const value = valueSpecification.values[0] as boolean;
    const toggleValue = (): void => {
      instanceValue_setValue(valueSpecification, !value, 0);
      setValueSpecification(valueSpecification);
    };

    return (
      <div className={clsx('value-spec-editor', className)}>
        <button
          className={clsx('value-spec-editor__toggler__btn', {
            'value-spec-editor__toggler__btn--toggled': value,
          })}
          onClick={toggleValue}
        >
          {value ? <CheckSquareIcon /> : <SquareIcon />}
        </button>
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const NumberPrimitiveInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue;
    isInteger: boolean;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: ValueSpecification) => void;
  }) => {
    const {
      valueSpecification,
      isInteger,
      className,
      resetValue,
      setValueSpecification,
    } = props;

    const DECIMAL_POINT = '.';
    const NEGATIVE_SIGN = '-';

    // NOTE: Although we want to allow the user to type
    // '-' and '.' for negative and decimal numbers respectively,
    // we want to check for when user leaves the input to not
    // leave the number value at an invalid state (i.e. if
    // user just left '-' without an actual number)
    const onBlur = (): void => {
      if (valueSpecification.values[0] === NEGATIVE_SIGN) {
        instanceValue_setValue(valueSpecification, 0, 0);
      }
      const numberInputValue = valueSpecification.values[0] as string;
      if (
        numberInputValue.length > 0 &&
        numberInputValue.at(-1) === DECIMAL_POINT
      ) {
        instanceValue_setValue(
          valueSpecification,
          parseInt(
            numberInputValue.substring(0, numberInputValue.length - 1),
            10,
          ),
          0,
        );
      }
      const val = isInteger
        ? parseInt(numberInputValue, 10)
        : parseFloat(numberInputValue);
      instanceValue_setValue(valueSpecification, val, 0);
      setValueSpecification(valueSpecification);
    };

    const value = valueSpecification.values[0] as number;
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      const valueIsDecimalPoint =
        (event.nativeEvent as InputEvent).data === DECIMAL_POINT;

      const valueIsNegativeSymbol =
        (event.nativeEvent as InputEvent).data === NEGATIVE_SIGN;

      if (
        !isInteger &&
        valueIsDecimalPoint &&
        value.toString().length > 0 &&
        !value.toString().includes(DECIMAL_POINT)
      ) {
        instanceValue_setValue(
          valueSpecification,
          valueSpecification.values[0] + DECIMAL_POINT,
          0,
        );
        return;
      }
      if (
        value.toString().includes(DECIMAL_POINT) &&
        (event.nativeEvent as InputEvent).data === '0'
      ) {
        instanceValue_setValue(
          valueSpecification,
          `${valueSpecification.values[0]}0`,
          0,
        );
        setValueSpecification(valueSpecification);
        return;
      }

      let inputVal = isInteger
        ? parseInt(event.target.value, 10)
        : parseFloat(event.target.value);
      inputVal = isNaN(inputVal) ? 0 : inputVal;

      valueIsNegativeSymbol
        ? instanceValue_setValue(valueSpecification, NEGATIVE_SIGN, 0)
        : instanceValue_setValue(valueSpecification, inputVal, 0);
      setValueSpecification(valueSpecification);
    };

    return (
      <div className={clsx('value-spec-editor', className)}>
        <input
          className="panel__content__form__section__input value-spec-editor__input"
          spellCheck={false}
          type="text"
          value={value}
          onBlur={onBlur}
          onChange={changeValue}
        />
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const EnumValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: EnumValueInstanceValue;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
  }) => {
    const { valueSpecification, className, resetValue, setValueSpecification } =
      props;
    const enumValueRef = guaranteeNonNullable(valueSpecification.values[0]);
    const enumValue = enumValueRef.value;
    const options = enumValue._OWNER.values.map((value) => ({
      label: value.name,
      value: value,
    }));
    const changeValue = (val: { value: Enum; label: string }): void => {
      instanceValue_setValue(
        valueSpecification,
        EnumValueExplicitReference.create(val.value),
        0,
      );
      setValueSpecification(valueSpecification);
    };

    return (
      <div className={clsx('value-spec-editor', className)}>
        <CustomSelectorInput
          className="value-spec-editor__enum-selector"
          options={options}
          onChange={changeValue}
          value={{ value: enumValue, label: enumValue.name }}
          darkMode={true}
        />
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

const stringifyValue = (values: ValueSpecification[]): string => {
  if (values.length === 0) {
    return '';
  }
  return CSVParser.unparse([
    values
      .map((val) => {
        if (val instanceof PrimitiveInstanceValue) {
          return val.values[0];
        } else if (val instanceof EnumValueInstanceValue) {
          return guaranteeNonNullable(val.values[0]).value.name;
        }
        return undefined;
      })
      .filter(isNonNullable),
  ]).trim();
};

/**
 * NOTE: We attempt to be less disruptive here by not throwing errors left and right, instead
 * we silently remove values which are not valid or parsable. But perhaps, we can consider
 * passing in logger or notifier to show give the users some idea of what went wrong instead
 * of silently swallow parts of their inputs like this.
 */
const setCollectionValue = (
  valueSpecification: CollectionInstanceValue,
  expectedType: Type,
  value: string,
): void => {
  if (value.trim().length === 0) {
    instanceValue_setValues(valueSpecification, []);
    return;
  }
  let result: unknown[] = [];

  const parseData = parseCSVString(value);

  if (!parseData) {
    return;
  }

  if (expectedType instanceof PrimitiveType) {
    switch (expectedType.path) {
      case PRIMITIVE_TYPE.STRING: {
        result = uniq(parseData)
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
            );
            instanceValue_setValues(primitiveInstanceValue, [item.toString()]);
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.INTEGER: {
        result = uniq(
          parseData
            .filter((val) => !isNaN(Number(val)))
            .map((val) => Number(val)),
        )
          .map((item): PrimitiveInstanceValue | undefined => {
            const primitiveInstanceValue = new PrimitiveInstanceValue(
              GenericTypeExplicitReference.create(
                new GenericType(expectedType),
              ),
            );
            instanceValue_setValues(primitiveInstanceValue, [item]);
            return primitiveInstanceValue;
          })
          .filter(isNonNullable);
        break;
      }
      default:
        // unsupported expected type, just escape
        return;
    }
  } else if (expectedType instanceof Enumeration) {
    result = uniq(parseData.map((item) => item.trim()))
      .map((item): EnumValueInstanceValue | undefined => {
        const _enum = returnUndefOnError(() =>
          getEnumValue(expectedType, item),
        );
        if (!_enum) {
          return undefined;
        }
        const enumValueInstanceValue = new EnumValueInstanceValue(
          GenericTypeExplicitReference.create(new GenericType(expectedType)),
        );
        instanceValue_setValues(enumValueInstanceValue, [
          EnumValueExplicitReference.create(_enum),
        ]);
        return enumValueInstanceValue;
      })
      .filter(isNonNullable);
  }
  instanceValue_setValues(valueSpecification, result);
};

const COLLECTION_PREVIEW_CHAR_LIMIT = 50;

const CollectionValueInstanceValueEditor = observer(
  (props: {
    valueSpecification: CollectionInstanceValue;
    graph: PureModel;
    expectedType: Type;
    className?: string | undefined;
    resetValue: () => void;
    setValueSpecification: (val: ValueSpecification) => void;
  }) => {
    const {
      valueSpecification,
      expectedType,
      className,
      resetValue,
      setValueSpecification,
    } = props;
    const inputRef = useRef<HTMLInputElement>(null);
    const [text, setText] = useState(stringifyValue(valueSpecification.values));
    const [editable, setEditable] = useState(false);
    const [showAdvancedEditorPopover, setShowAdvancedEditorPopover] =
      useState(false);
    const valueText = stringifyValue(valueSpecification.values);
    const previewText = `List(${
      valueSpecification.values.length === 0
        ? 'empty'
        : valueSpecification.values.length
    })${
      valueSpecification.values.length === 0
        ? ''
        : `: ${
            valueText.length > COLLECTION_PREVIEW_CHAR_LIMIT
              ? `${valueText.substring(0, COLLECTION_PREVIEW_CHAR_LIMIT)}...`
              : valueText
          }`
    }`;
    const enableEdit = (): void => setEditable(true);
    const saveEdit = (): void => {
      setEditable(false);
      setShowAdvancedEditorPopover(false);
      setCollectionValue(valueSpecification, expectedType, text);
      setText(stringifyValue(valueSpecification.values));
      setValueSpecification(valueSpecification);
    };
    const changeValue: React.ChangeEventHandler<HTMLInputElement> = (event) => {
      setText(event.target.value);
    };
    const changeValueTextArea: React.ChangeEventHandler<HTMLTextAreaElement> = (
      event,
    ) => {
      setText(event.target.value);
    };

    // focus the input box when edit is enabled
    useEffect(() => {
      if (editable) {
        inputRef.current?.focus();
      }
    }, [editable]);

    if (editable) {
      return (
        <>
          {showAdvancedEditorPopover && (
            <BasePopover
              onClose={() => setShowAdvancedEditorPopover(false)}
              open={showAdvancedEditorPopover}
              anchorEl={inputRef.current}
            >
              <textarea
                className="panel__content__form__section__input value-spec-editor__list-editor__textarea"
                spellCheck={false}
                value={text}
                placeholder={text === '' ? '(empty)' : undefined}
                onChange={changeValueTextArea}
                onKeyDown={(event): void => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    saveEdit();
                  }
                }}
              />
              <PanelFormSection>
                <div className="value-spec-editor__list-editor__textarea__description">
                  Hit Enter to Apply Change
                </div>
              </PanelFormSection>
            </BasePopover>
          )}
          <div className={clsx('value-spec-editor', className)}>
            <input
              ref={inputRef}
              className={clsx(
                'panel__content__form__section__input value-spec-editor__input',
              )}
              spellCheck={false}
              value={text}
              placeholder={text === '' ? '(empty)' : undefined}
              onChange={changeValue}
            />
            <button
              className="value-spec-editor__list-editor__expand-button btn--dark"
              onClick={() => setShowAdvancedEditorPopover(true)}
              tabIndex={-1}
              title="Expand window..."
            >
              <FilledWindowMaximizeIcon />
            </button>
            <button
              className="value-spec-editor__list-editor__save-button btn--dark"
              onClick={saveEdit}
            >
              <SaveIcon />
            </button>
            <button
              className="value-spec-editor__reset-btn"
              title="Reset"
              onClick={resetValue}
            >
              <RefreshIcon />
            </button>
          </div>
        </>
      );
    }
    return (
      <div
        className={clsx('value-spec-editor', className)}
        onClick={enableEdit}
        title="Click to edit"
      >
        <input
          className="value-spec-editor__list-editor__preview"
          spellCheck={false}
          value={previewText}
          disabled={true}
        />
        <button className="value-spec-editor__list-editor__edit-icon">
          <PencilIcon />
        </button>
      </div>
    );
  },
);

const UnsupportedValueSpecificationEditor: React.FC = () => (
  <div className="value-spec-editor--unsupported">unsupported</div>
);

const DateInstanceValueEditor = observer(
  (props: {
    valueSpecification: PrimitiveInstanceValue | SimpleFunctionExpression;
    graph: PureModel;
    obseverContext: ObserverContext;
    typeCheckOption: TypeCheckOption;
    className?: string | undefined;
    setValueSpecification: (val: ValueSpecification) => void;
    resetValue: () => void;
  }) => {
    const {
      valueSpecification,
      setValueSpecification,
      graph,
      obseverContext,
      typeCheckOption,
      resetValue,
    } = props;

    return (
      <div className="value-spec-editor">
        <CustomDatePicker
          valueSpecification={valueSpecification}
          graph={graph}
          observerContext={obseverContext}
          typeCheckOption={typeCheckOption}
          setValueSpecification={setValueSpecification}
        />
        <button
          className="value-spec-editor__reset-btn"
          title="Reset"
          onClick={resetValue}
        >
          <RefreshIcon />
        </button>
      </div>
    );
  },
);

/**
 * TODO we should pass in the props `resetValueSpecification`. Reset
 * should be part of this editor. Also through here we can call `observe_` accordingly.
 *
 * See https://github.com/finos/legend-studio/pull/1021
 */
export const BasicValueSpecificationEditor: React.FC<{
  valueSpecification: ValueSpecification;
  graph: PureModel;
  obseverContext: ObserverContext;
  typeCheckOption: TypeCheckOption;
  className?: string | undefined;
  setValueSpecification: (val: ValueSpecification) => void;
  resetValue: () => void;
  isConstant?: boolean;
  selectorConfig?:
    | {
        values: string[] | undefined;
        isLoading: boolean;
        reloadValues:
          | DebouncedFunc<(inputValue: string) => GeneratorFn<void>>
          | undefined;
        cleanUpReloadValues?: () => void;
      }
    | undefined;
}> = (props) => {
  const {
    className,
    valueSpecification,
    graph,
    obseverContext,
    typeCheckOption,
    setValueSpecification,
    resetValue,
    selectorConfig,
    isConstant,
  } = props;
  if (valueSpecification instanceof PrimitiveInstanceValue) {
    const _type = valueSpecification.genericType.value.rawType;
    switch (_type.path) {
      case PRIMITIVE_TYPE.STRING:
        return (
          <StringPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
            selectorConfig={selectorConfig}
          />
        );
      case PRIMITIVE_TYPE.BOOLEAN:
        return (
          <BooleanPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
          />
        );
      case PRIMITIVE_TYPE.NUMBER:
      case PRIMITIVE_TYPE.FLOAT:
      case PRIMITIVE_TYPE.DECIMAL:
      case PRIMITIVE_TYPE.BINARY:
      case PRIMITIVE_TYPE.INTEGER:
        return (
          <NumberPrimitiveInstanceValueEditor
            valueSpecification={valueSpecification}
            isInteger={_type.path === PRIMITIVE_TYPE.INTEGER}
            setValueSpecification={setValueSpecification}
            className={className}
            resetValue={resetValue}
          />
        );
      case PRIMITIVE_TYPE.DATE:
      case PRIMITIVE_TYPE.STRICTDATE:
      case PRIMITIVE_TYPE.DATETIME:
      case PRIMITIVE_TYPE.LATESTDATE:
        return (
          <DateInstanceValueEditor
            valueSpecification={valueSpecification}
            graph={graph}
            obseverContext={obseverContext}
            typeCheckOption={typeCheckOption}
            className={className}
            setValueSpecification={setValueSpecification}
            resetValue={resetValue}
          />
        );
      default:
        return <UnsupportedValueSpecificationEditor />;
    }
  } else if (valueSpecification instanceof EnumValueInstanceValue) {
    return (
      <EnumValueInstanceValueEditor
        valueSpecification={valueSpecification}
        className={className}
        resetValue={resetValue}
        setValueSpecification={setValueSpecification}
      />
    );
  } else if (
    valueSpecification instanceof CollectionInstanceValue &&
    valueSpecification.genericType
  ) {
    // NOTE: since when we fill in the arguments, `[]` (or `nullish` value in Pure)
    // is used for parameters we don't handle, we should not attempt to support empty collection
    // without generic type here as that  is equivalent to `[]`
    return (
      <CollectionValueInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        expectedType={typeCheckOption.expectedType}
        className={className}
        resetValue={resetValue}
        setValueSpecification={setValueSpecification}
      />
    );
  }
  // property expression
  else if (valueSpecification instanceof VariableExpression) {
    return (
      <VariableExpressionParameterEditor
        valueSpecification={valueSpecification}
        className={className}
        resetValue={resetValue}
        isConstant={Boolean(isConstant)}
      />
    );
  } else if (valueSpecification instanceof INTERNAL__PropagatedValue) {
    return (
      <BasicValueSpecificationEditor
        valueSpecification={valueSpecification.getValue()}
        graph={graph}
        obseverContext={obseverContext}
        typeCheckOption={typeCheckOption}
        setValueSpecification={setValueSpecification}
        resetValue={resetValue}
      />
    );
  } else if (
    valueSpecification instanceof SimpleFunctionExpression &&
    [
      PRIMITIVE_TYPE.DATE.toString(),
      PRIMITIVE_TYPE.STRICTDATE.toString(),
      PRIMITIVE_TYPE.DATETIME.toString(),
      PRIMITIVE_TYPE.LATESTDATE.toString(),
    ].includes(typeCheckOption.expectedType.path)
  ) {
    return (
      <DateInstanceValueEditor
        valueSpecification={valueSpecification}
        graph={graph}
        obseverContext={obseverContext}
        typeCheckOption={typeCheckOption}
        className={className}
        setValueSpecification={setValueSpecification}
        resetValue={resetValue}
      />
    );
  }
  return <UnsupportedValueSpecificationEditor />;
};
