/**
 * P1-03: local, observe-only instruments for the existing server runtime logs.
 * No exporter, persistence, provider header propagation or job-state dependency.
 * Never accept arbitrary metric labels or raw provider/user payloads.
 */
export const generationHistogramBucketsSeconds = [
  0.25, 0.5, 1, 2, 5, 10, 30, 60, 120, 300, 900, 3600,
] as const;

export const generationMetricDefinitions = {
  renderlab_generation_active_age_seconds: {
    kind: "gauge",
    labels: { status: ["queued", "running", "cancelling", "persisting"] },
  },
  renderlab_generation_submit_duration_seconds: {
    kind: "histogram",
    labels: {
      operation: ["create-image", "edit-image", "create-video", "animate-image", "unknown"],
      outcome: ["accepted", "rejected", "timeout", "error"],
    },
  },
  renderlab_generation_dispatch_latency_seconds: {
    kind: "histogram",
    labels: { backend: ["fibo"], outcome: ["accepted", "deferred", "unknown", "failed"] },
  },
  renderlab_generation_provider_rejections_total: {
    kind: "counter",
    labels: {
      operation: ["create-image", "edit-image", "create-video", "animate-image", "upscale-image"],
      category: ["auth", "capacity", "timeout", "transport", "other"],
      status_class: ["4xx", "5xx", "none"],
    },
  },
  renderlab_generation_provider_duration_seconds: {
    kind: "histogram",
    labels: { outcome: ["ready", "failed", "timed_out", "unknown"] },
  },
  renderlab_generation_finalization_duration_seconds: {
    kind: "histogram",
    labels: { outcome: ["succeeded", "failed", "cas_lost"] },
  },
  renderlab_generation_admission_release_total: {
    kind: "counter",
    labels: {
      outcome: ["released", "already_released", "failed"],
      path: ["terminal", "replay", "cancellation", "expiry"],
    },
  },
  renderlab_generation_terminal_held_reservations: {
    kind: "gauge",
    labels: { terminal_status: ["succeeded", "failed", "cancelled"] },
  },
  renderlab_generation_provider_to_settle_seconds: {
    kind: "histogram",
    labels: {
      operation: ["create-image", "edit-image", "create-video", "animate-image", "upscale-image"],
      result: ["settled", "recovered", "unknown"],
    },
  },
} as const;

export type GenerationMetricName = keyof typeof generationMetricDefinitions;
export type GenerationMetricInput = {
  name: GenerationMetricName;
  labels: Record<string, string>;
  value: number;
  /** Only a restricted 24-hex SHA-256 job correlation, never an ID or metric label. */
  linkCorrelation?: string;
};

const nonzero32 = /^(?!0{32}$)[0-9a-f]{32}$/;
const nonzero16 = /^(?!0{16}$)[0-9a-f]{16}$/;
const safeCorrelation = /^[0-9a-f]{24}$/;

/** Inbound traceparent is never trusted as parent or used for authorization. */
export function validGenerationTraceparent(value: unknown): value is string {
  if (typeof value !== "string") return false;
  const match = /^00-([0-9a-f]{32})-([0-9a-f]{16})-(00|01)$/.exec(value);
  return Boolean(match && nonzero32.test(match[1]!) && nonzero16.test(match[2]!));
}

export function createGenerationTraceparent(): string {
  // Each async HTTP/worker phase is a new local span; correlation is a private link only.
  const bytes = new Uint8Array(24);
  globalThis.crypto.getRandomValues(bytes);
  const hex = (part: Uint8Array) => Array.from(part, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return `00-${hex(bytes.subarray(0, 16))}-${hex(bytes.subarray(16))}-01`;
}

export function classifyGenerationProviderRejection(status: number | null, transportFailure = false) {
  const statusClass = status !== null && status >= 400 && status < 500 ? "4xx"
    : status !== null && status >= 500 && status < 600 ? "5xx" : "none";
  const category = status === 401 || status === 403 ? "auth"
    : status === 429 || status === 503 ? "capacity"
      : status === 408 || status === 504 ? "timeout"
        : transportFailure ? "transport" : "other";
  return { category, status_class: statusClass };
}

export function normalizeGenerationMetric(input: GenerationMetricInput, now = new Date().toISOString()) {
  const definition = generationMetricDefinitions[input.name];
  if (!definition || !Number.isFinite(input.value) || input.value < 0 || input.value > 31 * 86400) return null;
  if (!input.labels || typeof input.labels !== "object" || Array.isArray(input.labels)) return null;
  const allowed = definition.labels as Record<string, readonly string[]>;
  const keys = Object.keys(allowed);
  if (Object.keys(input.labels).length !== keys.length) return null;
  const labels: Record<string, string> = {};
  for (const key of keys) {
    const label = input.labels[key];
    if (typeof label !== "string" || !allowed[key]!.includes(label)) return null;
    labels[key] = label;
  }
  if (definition.kind === "counter" && input.value !== 1) return null;
  const bucket = definition.kind === "histogram"
    ? generationHistogramBucketsSeconds.find((limit) => input.value <= limit) ?? "+Inf"
    : undefined;
  return {
    event: "generation.metric" as const,
    name: input.name,
    kind: definition.kind,
    labels,
    value: input.value,
    ...(bucket === undefined ? {} : { bucketLeSeconds: bucket }),
    timestamp: now,
    traceparent: createGenerationTraceparent(),
    ...(typeof input.linkCorrelation === "string" && safeCorrelation.test(input.linkCorrelation)
      ? { correlation: input.linkCorrelation } : {}),
  };
}

export type GenerationMetricLog = NonNullable<ReturnType<typeof normalizeGenerationMetric>>;

/** Synchronous and deliberately fail-open, including when clock, RNG or log sink fails. */
export function recordGenerationMetric(
  input: GenerationMetricInput,
  sink: (event: GenerationMetricLog) => void = (event) => console.info(`[renderlab] ${JSON.stringify(event)}`),
): void {
  try {
    const event = normalizeGenerationMetric(input);
    if (event) sink(event);
  } catch {
    // Observability is not a dependency of admission, provider calls or terminalization.
  }
}

export function generationMetricAlertThreshold(
  name: GenerationMetricName,
  sample: { values: readonly number[]; outcome?: string },
): "no_data" | "ok" | "warning" | "critical" {
  const clean = sample.values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  if (!clean.length) return "no_data";
  if (name === "renderlab_generation_provider_rejections_total") {
    return sample.outcome === "auth" && clean.some((v) => v > 0) ? "critical" : "ok";
  }
  if (name === "renderlab_generation_admission_release_total") {
    return sample.outcome === "failed" && clean.some((v) => v > 0) ? "critical" : "ok";
  }
  if (name === "renderlab_generation_terminal_held_reservations") {
    return clean.some((v) => v > 300) ? "critical" : "ok"; // held duration, not count
  }
  if (name === "renderlab_generation_active_age_seconds") {
    return clean.some((v) => v >= 3600) ? "warning" : "ok";
  }
  if (clean.length < 10) return "no_data"; // avoid fictitious percentiles
  const p95 = clean[Math.ceil(clean.length * 0.95) - 1]!;
  const threshold: Partial<Record<GenerationMetricName, number>> = {
    renderlab_generation_submit_duration_seconds: 5,
    renderlab_generation_dispatch_latency_seconds: 60,
    renderlab_generation_provider_duration_seconds: 240,
    renderlab_generation_finalization_duration_seconds: 30,
    renderlab_generation_provider_to_settle_seconds: 120,
  };
  return p95 > (threshold[name] ?? Number.POSITIVE_INFINITY) ? "warning" : "ok";
}
