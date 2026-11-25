/** Production Design Language V2 §3; named React Spring physics, not CSS timing. */
type Spring = Readonly<{ tension: number; friction: number; mass: number }>;

export const springRoles = {
  snappy: { tension: 400, friction: 40, mass: 1 },
  smooth: { tension: 256, friction: 30, mass: 1 },
  gentle: { tension: 144, friction: 24, mass: 1 },
  "drag-release": { tension: 324, friction: 30, mass: 1 },
} as const satisfies Record<string, Spring>;

export type SpringRole = keyof typeof springRoles;

/** Consumers obtain reduced motion from their maintained React Spring hook.
 * Immediate commits preserve interaction and focus semantics independently of motion. */
export function springOptions(role: SpringRole, reducedMotion: boolean) {
  return { config: springRoles[role], immediate: reducedMotion };
}
