export type Shift = { startTime: number; value: number; hadRecentInput: boolean };
export type Interaction = { interactionId: number; duration: number };

export function largestLayoutShiftWindow(shifts: Shift[]): number {
  let best = 0, sum = 0, first = -Infinity, last = -Infinity;
  for (const shift of shifts.filter(x => !x.hadRecentInput).sort((a, b) => a.startTime - b.startTime)) {
    if (shift.startTime - last >= 1000 || shift.startTime - first >= 5000) {
      sum = 0;
      first = shift.startTime;
    }
    sum += shift.value;
    last = shift.startTime;
    best = Math.max(best, sum);
  }
  return best;
}

export function interactionDurations(entries: Interaction[]) {
  const groups = new Map<number, number>();
  for (const { interactionId, duration } of entries) {
    if (interactionId > 0) groups.set(interactionId, Math.max(groups.get(interactionId) ?? 0, duration));
  }
  return [...groups.values()];
}

export function median(numbers: (number | null)[]): number | null {
  const valid = numbers.filter((x): x is number => x !== null && Number.isFinite(x)).sort((a, b) => a - b);
  if (!valid.length) return null;
  const middle = Math.floor(valid.length / 2);
  return valid.length % 2 ? valid[middle] : (valid[middle - 1] + valid[middle]) / 2;
}
