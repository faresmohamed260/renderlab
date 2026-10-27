import { resolveApiUrl } from '../../services/api/url-policy.ts';
import { RENDERLAB_PRODUCTION_ORIGIN } from '../../services/api/production-read.ts';

/**
 * Deliberately duplicated small, stable wire contract: mobile is an independent
 * package, not a web/native monorepo workspace. Both sides get regression tests.
 *
 * This can only change the rendering of EXISTING routes (label/icon/order/brand).
 * It cannot change API origin, auth, permissions, feature flags or JS code.
 */
export const TAB_IDS = ['index', 'library', 'activity', 'settings'] as const;
export type TabId = (typeof TAB_IDS)[number];

export const ICONS_BY_TAB = {
  index: ['sparkles-outline', 'add-circle-outline', 'home-outline'],
  library: ['images-outline', 'grid-outline', 'albums-outline'],
  activity: ['time-outline', 'notifications-outline', 'play-circle-outline'],
  settings: ['settings-outline', 'person-circle-outline', 'options-outline'],
} as const;

export type TabIcon = (typeof ICONS_BY_TAB)[TabId][number];
export type TabOption = Readonly<{ id: TabId; label: string; icon: TabIcon }>;
export type AndroidUiConfig = Readonly<{
  version: 1;
  revision: string;
  brand: string;
  tabs: readonly TabOption[];
}>;

export const EMBEDDED_ANDROID_UI_CONFIG: AndroidUiConfig = {
  version: 1,
  revision: 'v1-initial',
  brand: 'RenderLab',
  tabs: [
    { id: 'index', label: 'Create', icon: 'sparkles-outline' },
    { id: 'library', label: 'Library', icon: 'images-outline' },
    { id: 'activity', label: 'Activity', icon: 'time-outline' },
    { id: 'settings', label: 'Settings', icon: 'settings-outline' },
  ],
};

const allowedRoutes = new Set<string>(TAB_IDS);
const unsafeText = /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u;
const revisionRule = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,39}$/u;
const URL = resolveApiUrl(RENDERLAB_PRODUCTION_ORIGIN, '/api/mobile/ui-config');
const MAX_TEXT_LENGTH = 2048;

function obj(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
function exact(objValue: Record<string, unknown>, keys: readonly string[]): boolean {
  return Object.keys(objValue).length === keys.length
    && keys.every(key => Object.prototype.hasOwnProperty.call(objValue, key));
}
function safeText(value: unknown, max: number): value is string {
  return typeof value === 'string' && value.trim() === value
    && value.length > 0 && value.length <= max && !unsafeText.test(value);
}

/** Untrusted HTTP JSON is always validated before any React component uses it. */
export function parseAndroidUiConfig(value: unknown): AndroidUiConfig {
  if (!obj(value) || !exact(value, ['version', 'revision', 'brand', 'tabs'])
    || value.version !== 1 || typeof value.revision !== 'string'
    || !revisionRule.test(value.revision) || !safeText(value.brand, 24)
    || !Array.isArray(value.tabs) || value.tabs.length !== 4) {
    throw new Error('Invalid Android UI config');
  }
  const seen = new Set<string>();
  const tabs: TabOption[] = [];
  for (const raw of value.tabs) {
    if (!obj(raw) || !exact(raw, ['id', 'label', 'icon'])
      || typeof raw.id !== 'string' || !allowedRoutes.has(raw.id)
      || seen.has(raw.id) || !safeText(raw.label, 18)
      || typeof raw.icon !== 'string') {
      throw new Error('Invalid Android UI tab config');
    }
    const id = raw.id as TabId;
    if (!(ICONS_BY_TAB[id] as readonly string[]).includes(raw.icon)) {
      throw new Error('Unapproved Android tab icon');
    }
    seen.add(id);
    tabs.push({ id, label: raw.label, icon: raw.icon as TabIcon });
  }
  return { version: 1, revision: value.revision, brand: value.brand, tabs };
}

/**
 * Safe read, no token, no cookies, no user data; redirect/error always fails
 * back to the last known trusted config in the caller.
 */
export async function fetchAndroidUiConfig(
  fetchImpl: typeof fetch = fetch,
  signal?: AbortSignal,
): Promise<AndroidUiConfig> {
  const response = await fetchImpl(URL, {
    method: 'GET',
    credentials: 'omit',
    redirect: 'error',
    headers: { Accept: 'application/json' },
    cache: 'no-store',
    signal,
  });
  if (response.status !== 200 || response.url && response.url !== URL
    || !/application\/json/i.test(response.headers.get('content-type') ?? '')) {
    throw new Error('Mobile UI config request rejected');
  }
  const length = Number(response.headers.get('content-length'));
  if (Number.isFinite(length) && length > MAX_TEXT_LENGTH) {
    throw new Error('Mobile UI config is oversized');
  }
  const text = await response.text();
  if (text.length > MAX_TEXT_LENGTH) throw new Error('Mobile UI config is oversized');
  let raw: unknown;
  try { raw = JSON.parse(text); } catch { throw new Error('Invalid Android UI JSON'); }
  return parseAndroidUiConfig(raw);
}
