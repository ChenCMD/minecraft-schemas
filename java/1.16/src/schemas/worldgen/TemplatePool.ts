import {
  Case,
  ChoiceNode,
  EnumNode as RawEnumNode,
  Force,
  ListNode,
  Mod,
  NumberNode,
  ObjectNode,
  Reference as RawReference,
  StringNode,
  Switch,
  SchemaRegistry,
  CollectionRegistry,
} from '@mcschema/core'
import './ProcessorList'

export function initTemplatePoolSchemas(schemas: SchemaRegistry, collections: CollectionRegistry) {
  const Reference = RawReference.bind(undefined, schemas)
  const EnumNode = RawEnumNode.bind(undefined, collections)

  const Projection = EnumNode(['rigid', 'terrain_matching'], 'rigid')
  const Processors = ChoiceNode([
    {
      type: 'string',
      node: StringNode(),
      change: v => undefined
    },
    {
      type: 'object',
      node: Reference('processor_list'),
      change: v => ({
        processors: [{}]
      })
    }
  ])

  schemas.register('template_pool', Mod(ObjectNode({
    name: Force(StringNode()),
    fallback: Force(StringNode()),
    elements: Force(ListNode(
      Reference('template_weighted_element')
    ))
  }, { context: 'template_pool' }), {
    default: () => ({
      fallback: 'minecraft:empty',
      elements: [
        {
          weight: 1,
          element: {
            element_type: 'minecraft:list_pool_element'
          }
        }
      ]
    })
  }))

  schemas.register('template_weighted_element', Mod(ObjectNode({
    weight: Force(NumberNode({ integer: true, min: 1 })),
    element: Force(Reference('template_element'))
  }), {
    default: () => ({
      weight: 1,
      element: {
        element_type: 'minecraft:single_pool_element'
      }
    })
  }))

  schemas.register('template_element', ObjectNode({
    element_type: Force(EnumNode('worldgen/structure_pool_element', 'minecraft:single_pool_element')),
    projection: Force(Projection),
    [Switch]: path => path.push('element_type'),
    [Case]: {
      'minecraft:feature_pool_element': {
        feature: Force(EnumNode('configured_feature', { search: true, additional: true })),
        processors: Force(Processors)
      },
      'minecraft:legacy_single_pool_element': {
        location: Force(StringNode()),
        processors: Force(Processors)
      },
      'minecraft:list_pool_element': {
        elements: Force(ListNode(
          Reference('template_element')
        ))
      },
      'minecraft:single_pool_element': {
        location: StringNode(),
        processors: Force(Processors)
      }
    }
  }, { context: 'template_element', disableSwitchContext: true }))
}
