"use client";

import { create } from "zustand";
import type { Product } from "@/lib/types";
import { products as defaults, setRuntimeProducts } from "@/lib/catalog";

interface CatalogState {
  products: Product[];
  setProducts: (products: Product[]) => void;
}

export const useCatalogStore = create<CatalogState>((set) => ({
  products: defaults,
  setProducts: (products) => {
    setRuntimeProducts(products);
    set({ products });
  },
}));
