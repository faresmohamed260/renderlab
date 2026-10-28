/** A narrow, dependency-injected native AppState/auto-refresh coordinator.
 * No real Supabase client is created or registered by this module. */
export type NativeAppState = 'active' | 'inactive' | 'background' | 'unknown' | 'extension';
export type NativeAppStateSource = Readonly<{
  currentState: NativeAppState;
  addEventListener: (event: 'change', callback: (next: NativeAppState) => void) =>
    { remove: () => void };
}>;
export type NativeRefreshAuth = Readonly<{
  startAutoRefresh: () => void | Promise<void>;
  stopAutoRefresh: () => void | Promise<void>;
}>;

export function createNativeAuthForegroundLifecycle(
  appState: NativeAppStateSource,
  auth: NativeRefreshAuth,
  invalidateLocalAdmission: () => void,
  onFailure: () => void,
  onActive?: () => void | Promise<void>,
) {
  let subscribed = false;
  let active = false;
  let subscription: { remove: () => void } | null = null;
  function run(callback: () => void | Promise<void>) {
    try {
      void Promise.resolve(callback()).catch(() => {
        invalidateLocalAdmission();
        onFailure();
      });
    } catch {
      invalidateLocalAdmission();
      onFailure();
    }
  }
  function apply(next: NativeAppState) {
    if (next !== 'active') {
      invalidateLocalAdmission(); // Cannot retain server admission through suspension.
      if (active) {
        active = false;
        run(() => auth.stopAutoRefresh());
      }
    } else if (!active) {
      active = true;
      // Resuming refresh never restores admission; it must be server-proven.
      invalidateLocalAdmission();
      run(() => {
        const started = auth.startAutoRefresh();
        return onActive ? Promise.resolve(started).then(() => onActive()) : started;
      });
    }
  }
  return Object.freeze({
    start() {
      if (subscribed) return;
      subscribed = true;
      subscription = appState.addEventListener('change', apply);
      apply(appState.currentState);
    },
    stop() {
      if (!subscribed) return;
      subscribed = false;
      subscription?.remove();
      subscription = null;
      invalidateLocalAdmission();
      if (active) {
        active = false;
        run(() => auth.stopAutoRefresh());
      }
    },
  });
}
