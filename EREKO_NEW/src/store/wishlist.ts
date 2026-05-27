import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

interface WishlistState {
  itemIds: string[]; // List of product IDs in wishlist
  
  // Actions
  toggleWishlist: (productId: string) => void;
  addToWishlist: (productId: string) => void;
  removeFromWishlist: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      itemIds: [],

      toggleWishlist: (productId) => {
        set((state) => {
          const exists = state.itemIds.includes(productId);
          const itemIds = exists
            ? state.itemIds.filter((id) => id !== productId)
            : [...state.itemIds, productId];
          return { itemIds };
        });
      },

      addToWishlist: (productId) => {
        set((state) => {
          if (state.itemIds.includes(productId)) return {};
          return { itemIds: [...state.itemIds, productId] };
        });
      },

      removeFromWishlist: (productId) => {
        set((state) => ({
          itemIds: state.itemIds.filter((id) => id !== productId),
        }));
      },

      isInWishlist: (productId) => {
        return get().itemIds.includes(productId);
      },

      clearWishlist: () => set({ itemIds: [] }),
    }),
    {
      name: "ereko-wishlist-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
