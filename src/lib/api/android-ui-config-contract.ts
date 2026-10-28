/**
 * Public presentation-only configuration for the separate RenderLab Android app.
 *
 * This does NOT authorize new routes, native capabilities, backend destinations,
 * authentication state, entitlements, data mutations, or remotely executable code.
 * Only the existing, explicitly allowlisted tab labels, icon IDs and their order
 * may change. The mobile client enforces the same contract independently.
 */
export const ANDROID_UI_CONFIG_VERSION = 1 as const;

export const ANDROID_TAB_IDS = ["index", "library", "activity", "settings"] as const;
export type AndroidTabId = (typeof ANDROID_TAB_IDS)[number];

export const ANDROID_TAB_ICONS = {
  index: ["sparkles-outline", "add-circle-outline", "home-outline"],
  library: ["images-outline", "grid-outline", "albums-outline"],
  activity: ["time-outline", "notifications-outline", "play-circle-outline"],
  settings: ["settings-outline", "person-circle-outline", "options-outline"],
} as const;

export type AndroidTabConfig = {
  [K in AndroidTabId]: Readonly<{
    id: K;
    label: string;
    icon: (typeof ANDROID_TAB_ICONS)[K][number];
  }>
}[AndroidTabId];

export type AndroidUiConfig = Readonly<{
  version: typeof ANDROID_UI_CONFIG_VERSION;
  revision: string;
  brand: string;
  tabs: readonly AndroidTabConfig[];
}>;

export const DEFAULT_ANDROID_UI_CONFIG: AndroidUiConfig = {
  version: 1,
  revision: "v1-initial",
  brand: "RenderLab",
  tabs: [
    { id: "index", label: "Create", icon: "sparkles-outline" },
    { id: "library", label: "Library", icon: "images-outline" },
    { id: "activity", label: "Activity", icon: "time-outline" },
    { id: "settings", label: "Settings", icon: "settings-outline" },
  ],
};

const TAB_IDS = new Set<string>(ANDROID_TAB_IDS);
const UNSAFE_TEXT = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
const REVISION = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/u;
const MAX_RESPONSE_BYTES = 2048;

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}
function exactlyKeys(value: Record<string, unknown>, expected: readonly string[]) {
  return Object.keys(value).length === expected.length
    && expected.every(key => Object.hasOwn(value, key));
}
function label(value: unknown, max: number): value is string {
  return typeof value === "string"
    && value.length >= 1 && value.length <= max
    && value === value.trim() && !UNSAFE_TEXT.test(value);
}

/** Invalid or future-version payloads throw; callers keep last-known safe config. */
export function parseAndroidUiConfig(input: unknown): AndroidUiConfig {
  if (!isRecord(input) || !exactlyKeys(input, ["version", "revision", "brand", "tabs"])) {
    throw new Error("Invalid Android UI configuration shape");
  }
  if (input.version !== 1
    || typeof input.revision !== "string" || !REVISION.test(input.revision)
    || !label(input.brand, 24)) {
    throw new Error("Unsupported Android UI configuration");
  }
  if (!Array.isArray(input.tabs) || input.tabs.length !== ANDROID_TAB_IDS.length) {
    throw new Error("Android UI configuration must include all existing tabs");
  }
  const seen = new Set<string>();
  const tabs: AndroidTabConfig[] = [];
  for (const raw of input.tabs) {
    if (!isRecord(raw) || !exactlyKeys(raw, ["id", "label", "icon"])
      || typeof raw.id !== "string" || !TAB_IDS.has(raw.id) || seen.has(raw.id)
      || !label(raw.label, 18) || typeof raw.icon !== "string") {
      throw new Error("Invalid Android tab configuration");
    }
    const id = raw.id as AndroidTabId;
    if (!(ANDROID_TAB_ICONS[id] as readonly string[]).includes(raw.icon)) {
      throw new Error("Unapproved Android tab icon");
    }
    seen.add(id);
    tabs.push({ id, label: raw.label, icon: raw.icon } as AndroidTabConfig);
  }
  return {
    version: 1,
    revision: input.revision,
    brand: input.brand,
    tabs,
  };
}

/**
 * Privileged server-only env override has a tiny strict upper bound.
 * Never parse untrusted text, network URLs, navigation destinations or JSX.
 */
export function parseAndroidUiConfigOverride(text: string | undefined): AndroidUiConfig {
  if (!text) return parseAndroidUiConfig(DEFAULT_ANDROID_UI_CONFIG);
  if (Buffer.byteLength(text, "utf8") > MAX_RESPONSE_BYTES) {
    throw new Error("Android UI config exceeds permitted length");
  }
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error("Android UI config is invalid JSON"); }
  return parseAndroidUiConfig(raw);
}
