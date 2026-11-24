/** Design Language V2 §3. Physics configs, not CSS-duration approximations. */
type Spring = Readonly<{ tension: number; friction: number; mass: number }>;

export const springs = {
  snappy: { tension: 400, friction: 40, mass: 1 },
  smooth: { tension: 256, friction: 30, mass: 1 },
  gentle: { tension: 144, friction: 24, mass: 1 },
  "drag-release": { tension: 324, friction: 30, mass: 1 },
} as const satisfies Record<string, Spring>;

export type SpringRole = keyof typeof springs;
