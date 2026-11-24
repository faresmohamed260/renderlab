export type MaskPoint = { x: number; y: number };

export function initialMaskPoint(width: number, height: number): MaskPoint {
  return { x: Math.floor((width - 1) / 2), y: Math.floor((height - 1) / 2) };
}

export function keyboardMaskCommand(key: string, coarse: boolean, point: MaskPoint, width: number, height: number):
  { kind: "move" | "apply"; point: MaskPoint } | null {
  const step = coarse ? 10 : 1;
  let { x, y } = point;
  switch (key) {
    case "ArrowLeft": x -= step; break;
    case "ArrowRight": x += step; break;
    case "ArrowUp": y -= step; break;
    case "ArrowDown": y += step; break;
    case "Enter":
    case " ": return { kind: "apply", point };
    default: return null;
  }
  return { kind: "move", point: { x: Math.min(width - 1, Math.max(0, x)), y: Math.min(height - 1, Math.max(0, y)) } };
}
