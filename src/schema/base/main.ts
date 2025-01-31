/*
 * @vinejs/vine
 *
 * (c) VineJS
 *
 * For the full copyright and license information, please view the LICENSE
 * file that was distributed with this source code.
 */

import type { FieldContext, RefsStore } from '@vinejs/compiler/types'

import { ITYPE, OTYPE, COTYPE, PARSE, VALIDATION } from '../../symbols.js'
import type {
  Parser,
  Validation,
  RuleBuilder,
  FieldOptions,
  CompilerNodes,
  ParserOptions,
  ConstructableSchema,
  ComparisonOperators,
  ArrayComparisonOperators,
  NumericComparisonOperators,
} from '../../types.js'
import Macroable from '@poppinss/macroable'
import { requiredWhen } from './rules.js'
import { helpers } from '../../vine/helpers.js'

/**
 * Base schema type with only modifiers applicable on all the schema types.
 */
export abstract class BaseModifiersType<Input, Output, CamelCaseOutput>
  extends Macroable
  implements ConstructableSchema<Input, Output, CamelCaseOutput>
{
  /**
   * Each subtype should implement the compile method that returns
   * one of the known compiler nodes
   */
  abstract [PARSE](propertyName: string, refs: RefsStore, options: ParserOptions): CompilerNodes

  /**
   * The child class must implement the clone method
   */
  abstract clone(): this

  /**
   * Define the input type of the schema
   */
  declare [ITYPE]: Input;

  /**
   * The output value of the field. The property points to a type only
   * and not the real value.
   */
  declare [OTYPE]: Output;
  declare [COTYPE]: CamelCaseOutput

  /**
   * Mark the field under validation as optional. An optional
   * field allows both null and undefined values.
   */
  optional(): OptionalModifier<this> {
    return new OptionalModifier(this)
  }

  /**
   * Mark the field under validation to be null. The null value will
   * be written to the output as well.
   *
   * If `optional` and `nullable` are used together, then both undefined
   * and null values will be allowed.
   */
  nullable(): NullableModifier<this> {
    return new NullableModifier(this)
  }
}

/**
 * Modifies the schema type to allow null values
 */
export class NullableModifier<
  Schema extends BaseModifiersType<any, any, any>,
> extends BaseModifiersType<
  Schema[typeof ITYPE] | null,
  Schema[typeof OTYPE] | null,
  Schema[typeof COTYPE] | null
> {
  #parent: Schema
  constructor(parent: Schema) {
    super()
    this.#parent = parent
  }

  /**
   * Creates a fresh instance of the underlying schema type
   * and wraps it inside the nullable modifier
   */
  clone(): this {
    return new NullableModifier(this.#parent.clone()) as this
  }

  /**
   * Compiles to compiler node
   */
  [PARSE](propertyName: string, refs: RefsStore, options: ParserOptions): CompilerNodes {
    const output = this.#parent[PARSE](propertyName, refs, options)
    if (output.type !== 'union') {
      output.allowNull = true
    }

    return output
  }
}

/**
 * Modifies the schema type to allow undefined values
 */
export class OptionalModifier<
  Schema extends BaseModifiersType<any, any, any>,
> extends BaseModifiersType<
  Schema[typeof ITYPE] | undefined | null,
  Schema[typeof OTYPE] | undefined,
  Schema[typeof COTYPE] | undefined
> {
  #parent: Schema

  /**
   * Optional modifier validations list
   */
  validations: Validation<any>[]

  constructor(parent: Schema, validations?: Validation<any>[]) {
    super()
    this.#parent = parent
    this.validations = validations || []
  }

  /**
   * Shallow clones the validations. Since, there are no API's to mutate
   * the validation options, we can safely copy them by reference.
   */
  protected cloneValidations(): Validation<any>[] {
    return this.validations.map((validation) => {
      return {
        options: validation.options,
        rule: validation.rule,
      }
    })
  }

  /**
   * Compiles validations
   */
  protected compileValidations(refs: RefsStore) {
    return this.validations.map((validation) => {
      return {
        ruleFnId: refs.track({
          validator: validation.rule.validator,
          options: validation.options,
        }),
        implicit: validation.rule.implicit,
        isAsync: validation.rule.isAsync,
      }
    })
  }

  /**
   * Push a validation to the validations chain.
   */
  use(validation: Validation<any> | RuleBuilder): this {
    this.validations.push(VALIDATION in validation ? validation[VALIDATION]() : validation)
    return this
  }

  /**
   * Define a callback to conditionally require a field at
   * runtime.
   *
   * The callback method should return "true" to mark the
   * field as required, or "false" to skip the required
   * validation
   */
  requiredWhen<Operator extends ComparisonOperators>(
    otherField: string,
    operator: Operator,
    expectedValue: Operator extends ArrayComparisonOperators
      ? (string | number | boolean)[]
      : Operator extends NumericComparisonOperators
        ? number
        : string | number | boolean
  ): this
  requiredWhen(callback: (field: FieldContext) => boolean): this
  requiredWhen(
    otherField: string | ((field: FieldContext) => boolean),
    operator?: ComparisonOperators,
    expectedValue?: any
  ) {
    /**
     * The equality check if self implemented
     */
    if (typeof otherField === 'function') {
      return this.use(requiredWhen(otherField))
    }

    /**
     * Creating the checker function based upon the
     * operator used for the comparison
     */
    let checker: (value: any) => boolean
    switch (operator!) {
      case '=':
        checker = (value) => value === expectedValue
        break
      case '!=':
        checker = (value) => value !== expectedValue
        break
      case 'in':
        checker = (value) => expectedValue.includes(value)
        break
      case 'notIn':
        checker = (value) => !expectedValue.includes(value)
        break
      case '>':
        checker = (value) => value > expectedValue
        break
      case '<':
        checker = (value) => value < expectedValue
        break
      case '>=':
        checker = (value) => value >= expectedValue
        break
      case '<=':
        checker = (value) => value <= expectedValue
    }

    /**
     * Registering rule with custom implementation
     */
    return this.use(
      requiredWhen((field) => {
        const otherFieldValue = helpers.getNestedValue(otherField, field)
        return checker(otherFieldValue)
      })
    )
  }

  /**
   * Mark the field under validation as required when all
   * the other fields are present with value other
   * than `undefined` or `null`.
   */
  requiredIfExists(fields: string | string[]) {
    const fieldsToExist = Array.isArray(fields) ? fields : [fields]
    return this.use(
      requiredWhen((field) => {
        return fieldsToExist.every((otherField) => {
          return helpers.exists(helpers.getNestedValue(otherField, field))
        })
      })
    )
  }

  /**
   * Mark the field under validation as required when any
   * one of the other fields are present with non-nullable
   * value.
   */
  requiredIfAnyExists(fields: string[]) {
    return this.use(
      requiredWhen((field) => {
        return fields.some((otherField) =>
          helpers.exists(helpers.getNestedValue(otherField, field))
        )
      })
    )
  }

  /**
   * Mark the field under validation as required when all
   * the other fields are missing or their value is
   * `undefined` or `null`.
   */
  requiredIfMissing(fields: string | string[]) {
    const fieldsToExist = Array.isArray(fields) ? fields : [fields]
    return this.use(
      requiredWhen((field) => {
        return fieldsToExist.every((otherField) =>
          helpers.isMissing(helpers.getNestedValue(otherField, field))
        )
      })
    )
  }

  /**
   * Mark the field under validation as required when any
   * one of the other fields are missing.
   */
  requiredIfAnyMissing(fields: string[]) {
    return this.use(
      requiredWhen((field) => {
        return fields.some((otherField) =>
          helpers.isMissing(helpers.getNestedValue(otherField, field))
        )
      })
    )
  }

  /**
   * Creates a fresh instance of the underlying schema type
   * and wraps it inside the optional modifier
   */
  clone(): this {
    return new OptionalModifier(this.#parent.clone(), this.cloneValidations()) as this
  }

  /**
   * Compiles to compiler node
   */
  [PARSE](propertyName: string, refs: RefsStore, options: ParserOptions): CompilerNodes {
    const output = this.#parent[PARSE](propertyName, refs, options)
    if (output.type !== 'union') {
      output.isOptional = true
      output.validations = output.validations.concat(this.compileValidations(refs))
    }

    return output
  }
}

/**
 * The BaseSchema class abstracts the repetitive parts of creating
 * a custom schema type.
 */
export abstract class BaseType<Input, Output, CamelCaseOutput> extends BaseModifiersType<
  Input,
  Output,
  CamelCaseOutput
> {
  /**
   * Field options
   */
  protected options: FieldOptions

  /**
   * Set of validations to run
   */
  protected validations: Validation<any>[]

  constructor(options?: FieldOptions, validations?: Validation<any>[]) {
    super()
    this.options = options || {
      bail: true,
      allowNull: false,
      isOptional: false,
    }

    this.validations = validations || []
  }

  /**
   * Shallow clones the validations. Since, there are no API's to mutate
   * the validation options, we can safely copy them by reference.
   */
  protected cloneValidations(): Validation<any>[] {
    return this.validations.map((validation) => {
      return {
        options: validation.options,
        rule: validation.rule,
      }
    })
  }

  /**
   * Shallow clones the options
   */
  protected cloneOptions(): FieldOptions {
    return { ...this.options }
  }

  /**
   * Compiles validations
   */
  protected compileValidations(refs: RefsStore) {
    return this.validations.map((validation) => {
      return {
        ruleFnId: refs.track({
          validator: validation.rule.validator,
          options: validation.options,
        }),
        implicit: validation.rule.implicit,
        isAsync: validation.rule.isAsync,
      }
    })
  }

  /**
   * Define a method to parse the input value. The method
   * is invoked before any validation and hence you must
   * perform type-checking to know the value you are
   * working it.
   */
  parse(callback: Parser): this {
    this.options.parse = callback
    return this
  }

  /**
   * Push a validation to the validations chain.
   */
  use(validation: Validation<any> | RuleBuilder): this {
    this.validations.push(VALIDATION in validation ? validation[VALIDATION]() : validation)
    return this
  }

  /**
   * Enable/disable the bail mode. In bail mode, the field validations
   * are stopped after the first error.
   */
  bail(state: boolean) {
    this.options.bail = state
    return this
  }
}
