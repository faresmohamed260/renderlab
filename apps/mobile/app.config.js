/**
 * Owner-approved, DEV-ONLY Android application identity (2026-10-28).
 *
 * Normal builds preserve the unprovisioned M0 config. Only the explicit
 * RENDERLAB_ANDROID_DEV_VARIANT=1 opt-in sets a stable Android package.
 * No EAS project/OTA channel, real Auth or production signing is enabled.
 */
const DEV_PACKAGE = 'uk.faresuniform.renderlab.dev';
const DEV_SCHEME = 'renderlab-dev';

module.exports = ({ config }) => {
  if (process.env.RENDERLAB_ANDROID_DEV_VARIANT !== '1') return config;
  if (config.android?.package || config.updates?.url || config.extra?.eas?.projectId) {
    throw new Error('Cannot override an already-provisioned Android app or OTA identity');
  }
  if (process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_URL ||
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.EXPO_PUBLIC_SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Development-only Android builds cannot include real Supabase public configuration');
  }
  return {
    ...config,
    name: 'RenderLab Dev',
    slug: 'renderlab-dev',
    scheme: DEV_SCHEME,
    android: {
      ...config.android,
      package: DEV_PACKAGE,
      versionCode: 1,
    },
  };
};
