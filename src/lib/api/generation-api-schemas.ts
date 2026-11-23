import { parseGenerationRequest } from "@/lib/api/generation-contract";
import { generationApiContractSource } from "@/lib/api/generation-api-source";

export { generationApiContractSource };
export type GenerationErrorDomain = keyof typeof generationApiContractSource.domainErrors;
export type GenerationApiOperationErrorCode<K extends GenerationErrorDomain> =
  (typeof generationApiContractSource.domainErrors)[K][number];

type JsonSchema = Record<string, unknown>;
const source = generationApiContractSource;

const successSchema: JsonSchema = source.schemas.GenerationSuccess;
export function generationErrorEnvelopeSchema(codes: readonly string[]): JsonSchema {
  // Project the permitted codes into the one shared JSON Schema envelope.
  const envelope = source.schemas.GenerationError;
  return {
    ...envelope,
    properties: {
      ...envelope.properties,
      error: {
        ...envelope.properties.error,
        properties: {
          ...envelope.properties.error.properties,
          code: { ...envelope.properties.error.properties.code, enum: [...new Set(codes)] },
        },
      },
    },
  };
}

/** One source drives the parser used by POST, the response validators and the generator. */
export const generationApiSchemas = {
  request: {
    schema: source.schemas.GenerationRequest,
    parse: parseGenerationRequest,
  },
  response: {
    success: successSchema,
    capabilities: source.schemas.GenerationCapabilities,
    error: generationErrorEnvelopeSchema,
  },
  job: source.schemas.GenerationJob,
  status: source.endpoints,
} as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function checkSchema(value: unknown, schema: JsonSchema, components: Record<string, JsonSchema>): boolean {
  if (typeof schema.$ref === "string") {
    const prefix = "#/components/schemas/";
    if (!schema.$ref.startsWith(prefix)) return false;
    const resolved = components[schema.$ref.slice(prefix.length)];
    return Boolean(resolved && checkSchema(value, resolved, components));
  }
  if (schema.const !== undefined && !Object.is(value, schema.const)) return false;
  if (Array.isArray(schema.enum) && !schema.enum.some((entry) => Object.is(entry, value))) return false;
  if (typeof schema.type === "string") {
    if (schema.type === "object" && !isRecord(value)) return false;
    if (schema.type === "array" && !Array.isArray(value)) return false;
    if (schema.type === "string" && typeof value !== "string") return false;
    if (schema.type === "boolean" && typeof value !== "boolean") return false;
    if (schema.type === "number" && (typeof value !== "number" || !Number.isFinite(value))) return false;
    if (schema.type === "integer" && !Number.isInteger(value)) return false;
  }
  if (typeof value === "number") {
    if (typeof schema.minimum === "number" && value < schema.minimum) return false;
    if (typeof schema.maximum === "number" && value > schema.maximum) return false;
  }
  if (typeof value === "string") {
    const chars = Array.from(value).length;
    if (typeof schema.minLength === "number" && chars < schema.minLength) return false;
    if (typeof schema.maxLength === "number" && chars > schema.maxLength) return false;
    if (typeof schema.pattern === "string" && !new RegExp(schema.pattern).test(value)) return false;
  }
  if (Array.isArray(value)) {
    if (typeof schema.minItems === "number" && value.length < schema.minItems) return false;
    if (typeof schema.maxItems === "number" && value.length > schema.maxItems) return false;
    if (isRecord(schema.items) && !value.every((entry) => checkSchema(entry, schema.items as JsonSchema, components))) return false;
  }
  if (isRecord(value)) {
    if (Array.isArray(schema.required)
      && !schema.required.every((key) => typeof key === "string" && Object.hasOwn(value, key))) return false;
    const properties: Record<string, unknown> = isRecord(schema.properties) ? schema.properties : {};
    for (const [key, entry] of Object.entries(value)) {
      const property = properties[key];
      if (isRecord(property)) {
        if (!checkSchema(entry, property, components)) return false;
      } else if (schema.additionalProperties === false) return false;
      else if (isRecord(schema.additionalProperties)
        && !checkSchema(entry, schema.additionalProperties, components)) return false;
    }
  }
  if (Array.isArray(schema.allOf)
    && !schema.allOf.every((item) => isRecord(item) && checkSchema(value, item, components))) return false;
  if (Array.isArray(schema.anyOf)
    && !schema.anyOf.some((item) => isRecord(item) && checkSchema(value, item, components))) return false;
  if (Array.isArray(schema.oneOf)
    && schema.oneOf.filter((item) => isRecord(item) && checkSchema(value, item, components)).length !== 1) return false;
  if (isRecord(schema.not) && checkSchema(value, schema.not, components)) return false;
  if (isRecord(schema.if)) {
    const branch = checkSchema(value, schema.if, components) ? schema.then : schema.else;
    if (isRecord(branch) && !checkSchema(value, branch, components)) return false;
  }
  return true;
}

/** Execute the machine-readable structural contract (separate from semantic parser refinements). */
export function matchesGenerationApiSchema(value: unknown, schema: JsonSchema): boolean {
  return checkSchema(value, schema, {
    GenerationJob: source.schemas.GenerationJob as JsonSchema,
    GenerationRequest: source.schemas.GenerationRequest as JsonSchema,
    GenerationCapabilities: source.schemas.GenerationCapabilities as JsonSchema,
    GenerationSuccess: successSchema,
    GenerationError: source.schemas.GenerationError as JsonSchema,
  });
}
