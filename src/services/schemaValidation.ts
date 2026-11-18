/** Deliberately limited to keywords used by the published v1 HTTP schemas.
 * Unknown keywords fail closed; this is not a general JSON Schema implementation.
 */
export interface Schema {
  $ref?: string;
  $defs?: Record<string, Schema>;
  anyOf?: Schema[];
  type?: string;
  const?: unknown;
  enum?: unknown[];
  properties?: Record<string, Schema>;
  required?: string[];
  additionalProperties?: boolean;
  items?: Schema;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  maxItems?: number;
}

const keywords = new Set([
  '$schema',
  '$defs',
  '$ref',
  'title',
  'default',
  'anyOf',
  'type',
  'const',
  'enum',
  'properties',
  'required',
  'additionalProperties',
  'items',
  'minLength',
  'maxLength',
  'pattern',
  'minimum',
  'maximum',
  'exclusiveMinimum',
  'maxItems',
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function matchesSchema(value: unknown, schema: Schema, root = schema, depth = 0): boolean {
  if (depth > 32 || Object.keys(schema).some(key => !keywords.has(key))) return false;
  if (schema.$ref) {
    const target = root.$defs?.[schema.$ref.replace('#/$defs/', '')];
    return !!target && matchesSchema(value, target, root, depth + 1);
  }
  if (schema.anyOf && !schema.anyOf.some(branch => matchesSchema(value, branch, root, depth + 1)))
    return false;
  if ('const' in schema && value !== schema.const) return false;
  if (schema.enum && !schema.enum.includes(value)) return false;
  switch (schema.type) {
    case 'object': {
      if (!isRecord(value)) return false;
      const properties = schema.properties ?? {};
      if (schema.required?.some(key => !Object.prototype.hasOwnProperty.call(value, key)))
        return false;
      return Object.entries(value).every(([key, item]) =>
        Object.prototype.hasOwnProperty.call(properties, key)
          ? matchesSchema(item, properties[key], root, depth + 1)
          : schema.additionalProperties !== false
      );
    }
    case 'array':
      return (
        Array.isArray(value) &&
        (schema.maxItems === undefined || value.length <= schema.maxItems) &&
        !!schema.items &&
        value.every(item => matchesSchema(item, schema.items!, root, depth + 1))
      );
    case 'string':
      return (
        typeof value === 'string' &&
        (schema.minLength === undefined || [...value].length >= schema.minLength) &&
        (schema.maxLength === undefined || [...value].length <= schema.maxLength) &&
        (schema.pattern === undefined || new RegExp(schema.pattern).test(value))
      );
    case 'integer':
    case 'number':
      return (
        typeof value === 'number' &&
        Number.isFinite(value) &&
        (schema.type !== 'integer' || Number.isSafeInteger(value)) &&
        (schema.minimum === undefined || value >= schema.minimum) &&
        (schema.maximum === undefined || value <= schema.maximum) &&
        (schema.exclusiveMinimum === undefined || value > schema.exclusiveMinimum)
      );
    case 'null':
      return value === null;
    case 'boolean':
      return typeof value === 'boolean';
    default:
      return schema.type === undefined;
  }
}
