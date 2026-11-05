import { useFavoritesStore } from "@/store/useFavoritesStore";
import { accountJson, jsonRequest, type AccountFavorite } from "./accountTypes";

export async function syncCloudFavorites(userId: string) {
  const previous = localStorage.getItem("purespot-last-favorites-member-id");
  if (previous && previous !== userId) useFavoritesStore.getState().clear();
  const localIds = useFavoritesStore.getState().ids;
  if (localIds.length > 0 && !previous) {
    await accountJson("/api/account/favorites", jsonRequest("PUT", { ids: localIds }));
  }
  const data = await accountJson<{ favorites: AccountFavorite[] }>("/api/account/favorites");
  useFavoritesStore.getState().setIds(data.favorites.map((item) => item.productId));
  localStorage.setItem("purespot-last-favorites-member-id", userId);
}
