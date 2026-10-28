import { AppState, type AppStateStatus } from 'react-native';
import { createContext, type ReactNode, useContext, useEffect, useState } from 'react';
import {
  EMBEDDED_ANDROID_UI_CONFIG,
  fetchAndroidUiConfig,
  type AndroidUiConfig,
} from './runtime-ui-config';

const RuntimeUiConfigContext = createContext<AndroidUiConfig>(EMBEDDED_ANDROID_UI_CONFIG);

/**
 * Config-only refresh: no Metro, Expo account, OTA service or native module.
 * Remote text, fixed icon names and route order can update during an active
 * session; server errors leave the last accepted configuration intact.
 */
export function RuntimeUiConfigProvider({ children }: { children: ReactNode }) {
  const [config, setConfig] = useState(EMBEDDED_ANDROID_UI_CONFIG);

  useEffect(() => {
    let mounted = true;
    let inFlight = false;
    let active = AppState.currentState === 'active' || AppState.currentState === null;
    let controller: AbortController | null = null;

    async function refresh() {
      if (!mounted || !active || inFlight) return;
      inFlight = true;
      controller = new AbortController();
      const abortAfter = setTimeout(() => controller?.abort(), 8000);
      try {
        const next = await fetchAndroidUiConfig(fetch, controller.signal);
        if (mounted) setConfig(previous => previous.revision === next.revision ? previous : next);
      } catch {
        // Invalid/stale/unavailable configuration never changes the UI and
        // is never logged (avoids confusing telemetry with account access).
      } finally {
        clearTimeout(abortAfter);
        controller = null;
        inFlight = false;
      }
    }

    void refresh();
    const interval = setInterval(() => { void refresh(); }, 45000);
    const listener = AppState.addEventListener('change', (state: AppStateStatus) => {
      active = state === 'active';
      if (active) void refresh();
      else controller?.abort();
    });
    return () => {
      mounted = false;
      controller?.abort();
      listener.remove();
      clearInterval(interval);
    };
  }, []);

  return (
    <RuntimeUiConfigContext.Provider value={config}>
      {children}
    </RuntimeUiConfigContext.Provider>
  );
}

export function useRuntimeUiConfig() {
  return useContext(RuntimeUiConfigContext);
}
