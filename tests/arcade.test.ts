import { describe, expect, it } from "vitest";
import { ScratchCoverage, wheelLanding } from "@/lib/arcade";
import { pickWeightedIndex } from "@/lib/pointsArcadeConfig";

describe("wheel landing", () => {
  it("lands on the server prize for every supported sector count and any accumulated rotation", () => {
    for (let count = 4; count <= 10; count++) for (let index = 0; index < count; index++) for (const current of [0, 352, 785.25, 14210.6]) {
      const landing = wheelLanding(current, index, count, 1);
      const pointerAngle = ((360 - landing % 360) + 360) % 360;
      expect(Math.floor(pointerAngle / (360 / count))).toBe(index);
      expect(landing).toBeGreaterThanOrEqual(current + 360);
      expect(landing).toBeLessThan(current + 720);
    }
  });
});

describe("continuous scratch mask", () => {
  it("erases the line between sparse pointer events without counting overlap twice", () => {
    const mask = new ScratchCoverage();
    const once = mask.stroke(.05, .5, .95, .5, .12, 2.3);
    expect(once).toBeGreaterThan(.18);
    expect(once).toBeLessThan(.3);
    expect(mask.stroke(.05, .5, .95, .5, .12, 2.3)).toBe(once);
  });
  it("gives equal coverage for a fast line and many small segments", () => {
    const fast = new ScratchCoverage(), slow = new ScratchCoverage();
    const expected = fast.stroke(.05, .2, .95, .8, .12, 2);
    let actual = 0;
    for (let i = 0; i < 30; i++) actual = slow.stroke(.05 + .9 * i / 30, .2 + .6 * i / 30, .05 + .9 * (i + 1) / 30, .2 + .6 * (i + 1) / 30, .12, 2);
    expect(actual).toBe(expected);
  });
  it("can reach full coverage while strokes outside the ticket do not clear it", () => {
    const mask = new ScratchCoverage();
    expect(mask.stroke(-1, -1, -1, -1, .12, 2)).toBe(0);
    let covered = 0;
    for (let y = 0; y <= 1; y += .1) covered = mask.stroke(0, y, 1, y, .12, 2);
    expect(covered).toBe(1);
  });
});

describe("server weighted draw", () => {
  it("preserves configured odds with a caller-supplied secure random value", () => {
    const pool = [{ weight: 2 }, { weight: 3 }, { weight: 5 }];
    expect(pickWeightedIndex(pool, 0)).toBe(0);
    expect(pickWeightedIndex(pool, .199)).toBe(0);
    expect(pickWeightedIndex(pool, .201)).toBe(1);
    expect(pickWeightedIndex(pool, .501)).toBe(2);
    expect(pickWeightedIndex(pool, .999999)).toBe(2);
  });
});
