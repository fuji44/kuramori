function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function schemaAllowsNull(schema: unknown): boolean {
  if (!isRecord(schema)) {
    return false;
  }

  if (Array.isArray(schema.type) && schema.type.includes('null')) {
    return true;
  }

  return Array.isArray(schema.anyOf) && schema.anyOf.some((variant) =>
    isRecord(variant) && variant.type === 'null'
  );
}

function makeNullable(schema: unknown): unknown {
  if (isRecord(schema) && typeof schema.type === 'string') {
    return { ...schema, type: [schema.type, 'null'] };
  }

  if (isRecord(schema) && Array.isArray(schema.anyOf)) {
    return { ...schema, anyOf: [...schema.anyOf, { type: 'null' }] };
  }

  return { anyOf: [schema, { type: 'null' }] };
}

function makeStrictSchema(schema: unknown): unknown {
  if (Array.isArray(schema)) {
    return schema.map(makeStrictSchema);
  }
  if (!isRecord(schema)) {
    return schema;
  }

  const output: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(schema)) {
    if (key === '$schema' || key === 'default' || key === 'minLength') {
      continue;
    }
    output[key] = makeStrictSchema(value);
  }

  if (isRecord(schema.properties)) {
    const originalRequired = Array.isArray(schema.required) ? schema.required : [];
    const properties: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(schema.properties)) {
      const strictProperty = makeStrictSchema(value);
      properties[key] = originalRequired.includes(key) || schemaAllowsNull(value)
        ? strictProperty
        : makeNullable(strictProperty);
    }
    output.properties = properties;
    output.required = Object.keys(properties);
    output.additionalProperties = false;
  }

  return output;
}

function removeOptionalNulls(value: unknown, schema: unknown): unknown {
  if (Array.isArray(schema)) {
    for (const variant of schema) {
      value = removeOptionalNulls(value, variant);
    }
    return value;
  }
  if (!isRecord(schema)) {
    return value;
  }

  if (Array.isArray(schema.anyOf)) {
    for (const variant of schema.anyOf) {
      value = removeOptionalNulls(value, variant);
    }
  }

  if (Array.isArray(value) && isRecord(schema.items)) {
    return value.map((item) => removeOptionalNulls(item, schema.items));
  }

  if (!isRecord(value) || !isRecord(schema.properties)) {
    return value;
  }

  const required = Array.isArray(schema.required) ? schema.required : [];
  for (const [key, propertySchema] of Object.entries(schema.properties)) {
    if (!(key in value)) {
      continue;
    }
    if (value[key] === null && !required.includes(key) && !schemaAllowsNull(propertySchema)) {
      delete value[key];
      continue;
    }
    value[key] = removeOptionalNulls(value[key], propertySchema);
  }

  return value;
}

export function prepareCodexOutputSchema(schema: unknown): {
  schema: unknown;
  normalizeOutput: (value: unknown) => unknown;
} {
  return {
    schema: makeStrictSchema(schema),
    normalizeOutput: (value) => removeOptionalNulls(value, schema),
  };
}
