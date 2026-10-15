import { beforeEach, describe, it, expect } from "vitest";
import { usePetContextStore } from "../src/store/usePetContextStore";
import { useCartStore } from "../src/store/useCartStore";
import { initialPets, products } from "../src/lib/catalog";
import { matchProduct } from "../src/lib/matching";
import { cartTotals } from "../src/lib/cart";
const line = {
  productId: "salmon-cat",
  petId: "pet-mochi",
  quantity: 1,
  mode: "ONCE" as const,
  intervalDays: null,
};
beforeEach(() => {
  usePetContextStore.setState({
    allPets: structuredClone(initialPets),
    activePetId: "pet-mochi",
  });
  useCartStore.setState({ items: [] });
});
describe("毛孩與購物袋的狀態邊界", () => {
  it("切換不存在的毛孩不污染狀態", () => {
    usePetContextStore.getState().setActivePet("missing");
    expect(usePetContextStore.getState().activePetId).toBe("pet-mochi");
  });
  it("修改毛孩體重同步單一資料來源", () => {
    usePetContextStore.getState().updatePet("pet-mochi", { weightKg: 5.2 });
    expect(usePetContextStore.getState().allPets[0]?.weightKg).toBe(5.2);
  });
  it("拒絕過敏商品及錯誤物種", () => {
    expect(() =>
      useCartStore.getState().addItem({ ...line, productId: "chicken-cat" }),
    ).toThrow("不適配");
    expect(() =>
      useCartStore.getState().addItem({ ...line, productId: "chicken-dog" }),
    ).toThrow("不適配");
  });
  it("同一商品單次與訂閱分開計算，重複單次項目合併", () => {
    const add = useCartStore.getState().addItem;
    add(line);
    add(line);
    add({ ...line, mode: "AUTOSHIP", intervalDays: 28 });
    expect(useCartStore.getState().items).toHaveLength(2);
    expect(useCartStore.getState().items[0]?.quantity).toBe(2);
    expect(cartTotals(useCartStore.getState().items).subtotalNt).toBe(
      980 * 2 + 882,
    );
  });
  it("跨毛孩與方案聚合庫存，禁止以拆行超買", () => {
    const add = useCartStore.getState().addItem;
    add({ ...line, quantity: 35 });
    expect(() =>
      add({ ...line, quantity: 2, mode: "AUTOSHIP", intervalDays: 28 }),
    ).toThrow("庫存");
  });
  it("修改數量也驗證所有行庫存", () => {
    const add = useCartStore.getState().addItem;
    add({ ...line, quantity: 30 });
    add({ ...line, quantity: 5, mode: "AUTOSHIP", intervalDays: 28 });
    expect(() =>
      useCartStore
        .getState()
        .setQuantity(useCartStore.getState().items[0]!.key, 32),
    ).toThrow("庫存");
  });
  it("錯誤訂閱週期組合不能加入", () => {
    expect(() =>
      useCartStore.getState().addItem({ ...line, mode: "AUTOSHIP" }),
    ).toThrow();
  });
  it("空購物袋不計運費，循環與混合購物袋採正確門檻", () => {
    expect(cartTotals([]).totalNt).toBe(0);
    useCartStore
      .getState()
      .addItem({ ...line, mode: "AUTOSHIP", intervalDays: 28 });
    expect(cartTotals(useCartStore.getState().items).thresholdNt).toBe(699);
    expect(cartTotals(useCartStore.getState().items).shippingNt).toBe(0);
    useCartStore.getState().addItem(line);
    expect(cartTotals(useCartStore.getState().items).thresholdNt).toBe(999);
  });
  it("幼年毛孩不標示成齡專用主食適配", () => {
    expect(
      matchProduct(products[0]!, { ...initialPets[0]!, ageMonths: 3 }).safe,
    ).toBe(false);
  });
});
