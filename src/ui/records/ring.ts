/**
 * Shortest signed distance from `center` to `index` around a ring of `count`
 * items: the procession wraps, so the record after the last is the first.
 */
export function ringOffset(index: number, center: number, count: number): number {
  let d = (index - center) % count;
  if (d > count / 2) d -= count;
  if (d < -count / 2) d += count;
  return d;
}
