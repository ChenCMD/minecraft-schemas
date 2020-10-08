import { INode, Base } from './Node'
import { CollectionRegistry } from '../Registries'
import { ValidationOption } from '../ValidationOption'
import { quoteString } from '../utils'
import { Hook } from '../Hook'
import { ModelPath } from '../model/Path'

export type EnumOption = {
  enum: string | string[]
  additional?: boolean
}

const isEnum = (value?: ValidationOption | EnumOption): value is EnumOption => {
  return !!(value as any)?.enum
}

const isValidator = (value?: ValidationOption | EnumOption): value is ValidationOption => {
  return !!(value as any)?.validator
}

export type StringHookParams = {
  getValues: () => string[],
  config?: ValidationOption | EnumOption
}

/**
 * Simple string node with one text field
 */
export const StringNode = (collections?: CollectionRegistry, config?: ValidationOption | EnumOption): INode<string> => {
  const getValues = 
    isEnum(config)
    ? ((typeof config.enum === 'string')
      ? () => collections?.get(config.enum as string) ?? []
      : () => config.enum as string[])
    : ((config?.validator === 'resource')
      ? ((typeof config.params.pool === 'string')
        ? (config.params.pool.startsWith('$')
          ? () => collections?.get((config.params.pool as string).slice(1)) ?? []
          : () => collections?.get(config.params.pool as string) ?? [])
        : () => config.params.pool as string[])
      : () => [])

  return {
    ...Base,
    type: () => 'string',
    default: () => '',
    validate(path, value, errors, options) {
      if (options.loose && typeof value !== 'string') {
        value = this.default() || undefined
      }
      if (typeof value !== 'string') {
        errors.add(path, 'error.expected_string')
        return value
      }
      if (isValidator(config)) {
        if (config.validator === 'resource' && value.length > 0 && !value.includes(':')) {
          value = 'minecraft:' + value
        }
        if (config.validator === 'resource' && typeof config.params.pool === 'string' && config.params.pool.startsWith('$')) {
          return value
        }
      }
      if ((isEnum(config) && config.additional)) {
        return value
      }
      const values = getValues()
      if (values.length > 0 && !values.includes(value)) {
        errors.add(path, 'error.invalid_enum_option', value)
      }
      return value
    },
    suggest: () => getValues().map(quoteString),
    validationOption() {
      return isValidator(config) ? config : undefined
    },
    hook<U extends any[], V>(hook: Hook<U, V>, path: ModelPath, ...args: U) {
      return hook.string({ node: this, getValues, config }, path, ...args)
    }
  }
}
