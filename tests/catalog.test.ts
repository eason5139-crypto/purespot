import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { products } from "../src/lib/catalog";
import { shopCategories } from "../src/lib/productCategories";

describe("展示商品目錄", () => {
  it("六個分類各有至少五款，商品網址與圖片完整", () => {
    expect(shopCategories).toHaveLength(6);
    expect(new Set(products.map((product) => product.slug)).size).toBe(products.length);
    for (const { name } of shopCategories) {
      expect(products.filter((product) => product.category === name).length).toBeGreaterThanOrEqual(5);
    }
    for (const product of products) {
      expect(existsSync(join(process.cwd(), "public", product.image.slice(1)))).toBe(true);
    }
  });
});
