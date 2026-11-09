/** Planning estimates only. Replace with a supplier invoice or quote in Product Management. */
export const COST_REFERENCE_FOOD = "https://www.alibaba.com/product-detail/Wholesale-Direct-Sale-Private-Label-High_1601023199909.html";
export const COST_REFERENCE_FREEZE = "https://www.alibaba.com/product-introduction/Wholesale-Bulk-Freeze-Dried-Dog-Treats_1601288478391.html";
export const COST_REFERENCE_SUPPLIES = "https://www.kaojing-pet.com/products/index.php?group_id=7206";

const categoryRatios: Record<string, number> = {
  主食乾糧: 0.36, 主食罐頭: 0.45, 鮮食餐包: 0.48, 凍乾主食: 0.50,
  風乾主食: 0.46, 機能配方: 0.42, 小動物主食: 0.38, 零食點心: 0.43,
  玩具互動: 0.40, 居家用品: 0.45, 清潔照護: 0.42, 外出用品: 0.47,
  飲水餐具: 0.44, 舒壓嗅聞: 0.43, 戶外安全: 0.47, 日常保養: 0.44,
};

export function estimateUnitCostNt(priceNt: number, category: string) {
  return Math.max(1, Math.round(priceNt * (categoryRatios[category] ?? 0.43)));
}

export function estimateReference(category: string) {
  if (category.includes("凍乾") || category.includes("風乾")) return COST_REFERENCE_FREEZE;
  if (category.includes("主食") || category.includes("零食") || category.includes("機能") || category.includes("鮮食")) return COST_REFERENCE_FOOD;
  return COST_REFERENCE_SUPPLIES;
}
