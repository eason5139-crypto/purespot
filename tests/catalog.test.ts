import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { products } from "../src/lib/catalog";
import { shopCategories } from "../src/lib/productCategories";

describe("展示商品目錄", () => {
  it("十六個分類各有五款，涵蓋食物用品及四種動物，且每款有獨立圖片", () => {
    expect(shopCategories).toHaveLength(16);
    expect(products).toHaveLength(80);
    expect(new Set(products.map((product) => product.type))).toEqual(new Set(["CAT", "DOG", "HAMSTER", "RABBIT"]));
    expect(new Set(products.map((product) => product.kind ?? "FOOD"))).toEqual(new Set(["FOOD", "SUPPLIES"]));
    expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
    expect(new Set(products.map((product) => product.image)).size).toBe(products.length);
    for (const { name } of shopCategories) {
      expect(products.filter((product) => product.category === name).length).toBeGreaterThanOrEqual(5);
    }
    for (const product of products) {
      expect(existsSync(join(process.cwd(), "public", product.image.slice(1)))).toBe(true);
    }
  });
});
