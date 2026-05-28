import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productId: string;
  title: string;
  variantName: string;
  slug: string;
  image: string;
  unitPriceMinor: number;
  quantity: number;
  availableStock: number;
  storageType: string;
}

interface CartState {
  items: CartItem[];
  savedForLater: CartItem[];
  promoCode: string | null;
  discountMinor: number;
  shippingMinor: number;
  deliverySlotPriceMinor: number;
  loyaltyPointsRedeemed: number;
  loyaltyDiscountMinor: number;

  // Actions
  addItem: (item: CartItem) => void;
  removeItem: (variantId: string) => void;
  updateQuantity: (variantId: string, quantity: number) => void;
  clearCart: () => void;
  saveForLater: (variantId: string) => void;
  moveToCart: (variantId: string) => void;
  removeSavedItem: (variantId: string) => void;
  applyPromo: (code: string, discountMinor: number) => void;
  removePromo: () => void;
  setShipping: (amountMinor: number) => void;
  setDeliverySlotPrice: (amountMinor: number) => void;
  applyLoyaltyRedemption: (points: number, discountMinor: number) => void;
  removeLoyaltyRedemption: () => void;

  // Getters
  getSubtotalMinor: () => number;
  getTaxMinor: () => number; // Est. UK VAT (zero-rated vs standard-rated food estimation)
  getTotalMinor: () => number;
  getFreeShippingProgress: () => { progress: number; remainingMinor: number }; // £55 limit
}

const FREE_SHIPPING_LIMIT_MINOR = 5500; // £55.00 in pence
const DEFAULT_SHIPPING_MINOR = 399; // £3.99 in pence

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      savedForLater: [],
      promoCode: null,
      discountMinor: 0,
      shippingMinor: DEFAULT_SHIPPING_MINOR,
      deliverySlotPriceMinor: 0,
      loyaltyPointsRedeemed: 0,
      loyaltyDiscountMinor: 0,

      addItem: (newItem) => {
        set((state) => {
          const existingIndex = state.items.findIndex(
            (item) => item.variantId === newItem.variantId
          );

          const updatedItems = [...state.items];
          if (existingIndex >= 0) {
            const currentItem = state.items[existingIndex]!;
            const updatedQty = currentItem.quantity + newItem.quantity;
            updatedItems[existingIndex] = {
              ...currentItem,
              quantity: Math.min(updatedQty, newItem.availableStock),
            };
          } else {
            updatedItems.push(newItem);
          }

          return { items: updatedItems };
        });
      },

      removeItem: (variantId) => {
        set((state) => ({
          items: state.items.filter((item) => item.variantId !== variantId),
        }));
      },

      updateQuantity: (variantId, quantity) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.variantId === variantId
              ? { ...item, quantity: Math.min(quantity, item.availableStock) }
              : item
          ),
        }));
      },

      clearCart: () => {
        set({
          items: [],
          promoCode: null,
          discountMinor: 0,
          loyaltyPointsRedeemed: 0,
          loyaltyDiscountMinor: 0,
          deliverySlotPriceMinor: 0,
          shippingMinor: DEFAULT_SHIPPING_MINOR,
        });
      },

      saveForLater: (variantId) => {
        set((state) => {
          const itemToSave = state.items.find((item) => item.variantId === variantId);
          if (!itemToSave) return {};

          return {
            items: state.items.filter((item) => item.variantId !== variantId),
            savedForLater: [...state.savedForLater.filter((item) => item.variantId !== variantId), itemToSave],
          };
        });
      },

      moveToCart: (variantId) => {
        set((state) => {
          const itemToMove = state.savedForLater.find((item) => item.variantId === variantId);
          if (!itemToMove) return {};

          return {
            savedForLater: state.savedForLater.filter((item) => item.variantId !== variantId),
            items: [...state.items.filter((item) => item.variantId !== variantId), itemToMove],
          };
        });
      },

      removeSavedItem: (variantId) => {
        set((state) => ({
          savedForLater: state.savedForLater.filter((item) => item.variantId !== variantId),
        }));
      },

      applyPromo: (code, discountMinor) => {
        set({ promoCode: code, discountMinor });
      },

      removePromo: () => {
        set({ promoCode: null, discountMinor: 0 });
      },

      setShipping: (shippingMinor) => set({ shippingMinor }),

      setDeliverySlotPrice: (deliverySlotPriceMinor) => set({ deliverySlotPriceMinor }),

      applyLoyaltyRedemption: (points, discountMinor) => {
        set({ loyaltyPointsRedeemed: points, loyaltyDiscountMinor: discountMinor });
      },

      removeLoyaltyRedemption: () => {
        set({ loyaltyPointsRedeemed: 0, loyaltyDiscountMinor: 0 });
      },

      getSubtotalMinor: () => {
        return get().items.reduce(
          (sum, item) => sum + item.unitPriceMinor * item.quantity,
          0
        );
      },

      getTaxMinor: () => {
        // Simple estimation: 20% standard rate on non-essential foods (confectionery/soda e.g. ambient)
        // Groceries zero-rated in UK. We simulate this by checking storageType
        const taxableSubtotal = get().items.reduce((sum, item) => {
          if (item.storageType === "ambient" && (item.title.toLowerCase().includes("snack") || item.title.toLowerCase().includes("beverage") || item.title.toLowerCase().includes("chocolate"))) {
            return sum + item.unitPriceMinor * item.quantity;
          }
          return sum;
        }, 0);
        return Math.round(taxableSubtotal * 0.2); // 20% VAT in the UK
      },

      getTotalMinor: () => {
        const subtotal = get().getSubtotalMinor();
        const discount = get().discountMinor + get().loyaltyDiscountMinor;
        const subtotalAfterDiscount = Math.max(0, subtotal - discount);
        
        // Shipping is free if subtotal exceeds limit
        const activeShipping = subtotal >= FREE_SHIPPING_LIMIT_MINOR ? 0 : get().shippingMinor;
        
        return subtotalAfterDiscount + activeShipping + get().deliverySlotPriceMinor;
      },

      getFreeShippingProgress: () => {
        const subtotal = get().getSubtotalMinor();
        if (subtotal >= FREE_SHIPPING_LIMIT_MINOR) {
          return { progress: 100, remainingMinor: 0 };
        }
        const progress = (subtotal / FREE_SHIPPING_LIMIT_MINOR) * 100;
        return {
          progress,
          remainingMinor: FREE_SHIPPING_LIMIT_MINOR - subtotal,
        };
      },
    }),
    {
      name: "ereko-cart-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);
