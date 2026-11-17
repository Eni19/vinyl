import { describe, expect, it } from "vitest";
import { ringOffset } from "./ring";

describe("ringOffset", () => {
  it("is zero at the centre and counts outward on both sides", () => {
    expect(ringOffset(4, 4, 9)).toBe(0);
    expect(ringOffset(5, 4, 9)).toBe(1);
    expect(ringOffset(2, 4, 9)).toBe(-2);
  });

  it("wraps around the ends of the catalogue", () => {
    expect(ringOffset(0, 8, 9)).toBe(1);
    expect(ringOffset(8, 0, 9)).toBe(-1);
    expect(ringOffset(7, 1, 9)).toBe(-3);
  });

  it("never reaches further than half the ring", () => {
    for (let center = 0; center < 9; center++)
      for (let i = 0; i < 9; i++) expect(Math.abs(ringOffset(i, center, 9))).toBeLessThanOrEqual(4.5);
  });
});
