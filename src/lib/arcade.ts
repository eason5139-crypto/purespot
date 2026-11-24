import type { PointsArcadeConfig, WheelKey } from "./pointsArcadeConfig";

export type ArcadeGame = "wheel" | "capsule" | "scratch";
export type ArcadePlayInput = {
  requestId: string;
  game: ArcadeGame;
  wheelKey?: WheelKey;
  revision?: string;
};
export type ArcadeOutcome = {
  requestId: string;
  game: ArcadeGame;
  title: string;
  label: string;
  kind: "POINTS" | "PRODUCT_VOUCHER" | "CASH_VOUCHER";
  value: number;
  costPoints: number;
  newBalance: number;
  createdAt: string;
  code: string | null;
  wheelKey?: WheelKey;
  prizeIndex: number;
  prizeId: string;
  ball?: "GOLD" | "CLAY" | "JADE" | "WOOD" | "SAND";
  usedToday?: number;
  dailyLimit?: number;
};
export type ArcadeState = {
  config: PointsArcadeConfig;
  revision: string;
  points: number;
  limits: { capsuleUsed: number; scratchUsed: number; date: string };
  history: ArcadeOutcome[];
};

/** Sectors start at twelve o'clock. The pointer must stop at the selected centre. */
export function wheelLanding(current: number, index: number, count: number, turns = 2) {
  const target = ((360 - ((index + 0.5) * 360) / count) % 360 + 360) % 360;
  const normalized = ((current % 360) + 360) % 360;
  return current + turns * 360 + ((target - normalized + 360) % 360);
}

/** A small logical mask avoids synchronous canvas pixel reads during pointer movement. */
export class ScratchCoverage {
  private cells: Uint8Array;
  private erased = 0;
  constructor(readonly columns = 48, readonly rows = 24) {
    this.cells = new Uint8Array(columns * rows);
  }
  stroke(ax: number, ay: number, bx: number, by: number, radius: number, aspect: number) {
    const dx = (bx - ax) * aspect, dy = by - ay, length = dx * dx + dy * dy;
    const minX = Math.max(0, Math.floor((Math.min(ax, bx) - radius / aspect) * this.columns));
    const maxX = Math.min(this.columns - 1, Math.ceil((Math.max(ax, bx) + radius / aspect) * this.columns));
    const minY = Math.max(0, Math.floor((Math.min(ay, by) - radius) * this.rows));
    const maxY = Math.min(this.rows - 1, Math.ceil((Math.max(ay, by) + radius) * this.rows));
    for (let y = minY; y <= maxY; y++) for (let x = minX; x <= maxX; x++) {
      const i = y * this.columns + x;
      if (this.cells[i]) continue;
      const px = ((x + 0.5) / this.columns - ax) * aspect, py = (y + 0.5) / this.rows - ay;
      const t = length ? Math.max(0, Math.min(1, (px * dx + py * dy) / length)) : 0;
      if ((px - t * dx) ** 2 + (py - t * dy) ** 2 <= radius * radius) {
        this.cells[i] = 1;
        this.erased++;
      }
    }
    return this.erased / this.cells.length;
  }
}
