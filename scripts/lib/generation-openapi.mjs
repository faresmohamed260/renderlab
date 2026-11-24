export const buildGenerationOpenApi = function buildGenerationOpenApi(source) {
  const refs = (name) => ({ $ref: "#/components/schemas/" + name });
  const error = (codes) => {
    // Reuse the same JSON Schema envelope as runtime validation; specialize only the enum.
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
  };
  const paths = {};
  const uuidPattern = source.schemas.GenerationRequest.properties.mask.properties.id.pattern;
  for (const endpoint of source.endpoints) {
    const operation = {
      tags: ["Generation"],
      operationId: endpoint.operationId,
      summary: endpoint.summary,
      description: endpoint.description,
      responses: {},
    };
    if (endpoint.path.includes("{jobId}")) {
      operation.parameters = [{
        name: "jobId", in: "path", required: true,
        description: "Owner-scoped generation UUID",
        schema: { type: "string", pattern: uuidPattern },
      }];
    }
    if (endpoint.requestHeaders) {
      operation.parameters = [...(operation.parameters ?? []), ...endpoint.requestHeaders.map((header) => ({
        name: header.name, in: "header", required: header.required,
        description: header.description, schema: header.schema,
      }))];
    }
    if (endpoint.request) {
      operation.requestBody = {
        required: true,
        content: { "application/json": { schema: refs(endpoint.request) } },
      };
    }
    for (const [status, schemaName] of Object.entries(endpoint.success)) {
      operation.responses[status] = {
        description: status === "202" ? "Accepted" : "Successful response",
        content: { "application/json": { schema: refs(schemaName) } },
      };
    }
    for (const [status, codes] of Object.entries(endpoint.errors)) {
      operation.responses[status] = {
        description: "Stable error envelope",
        content: { "application/json": { schema: error(codes) } },
      };
    }
    (paths[endpoint.path] ??= {})[endpoint.method] = operation;
  }
  return {
    openapi: "3.1.0",
    jsonSchemaDialect: "https://json-schema.org/draft/2020-12/schema",
    info: source.info,
    tags: [{ name: "Generation", description: "Private invite-only image generation operations" }],
    paths,
    components: { schemas: source.schemas },
    "x-renderlab-idempotency": source.idempotency,
    "x-renderlab-versioning": source.versioning,
  };
};

export const buildGenerationCompatibility = function buildGenerationCompatibility(source) {
  const fields = source.schemas.GenerationRequest;
  return {
    contractVersion: source.info.version,
    requestRequired: fields.required,
    requestModel: fields.properties.model.const,
    requestKinds: [fields.properties.output.properties.kind.const],
    requestAspectRatios: fields.properties.output.properties.aspectRatio.enum,
    requestMaxInputs: fields.properties.inputs.maxItems,
    responseRequired: source.schemas.GenerationJob.required,
    responseStatuses: source.schemas.GenerationJob.properties.status.enum,
    domainErrors: source.domainErrors,
    routes: source.endpoints.map((endpoint) => ({
      path: endpoint.path,
      method: endpoint.method,
      operationId: endpoint.operationId,
      successes: Object.keys(endpoint.success).sort(),
      errors: Object.fromEntries(Object.entries(endpoint.errors)
        .map(([status, codes]) => [status, [...codes].sort()])),
    })),
    versionPolicy: source.versioning.policy,
  };
};
