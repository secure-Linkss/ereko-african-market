import { create } from "zustand";

export interface SearchFilters {
  query: string;
  categorySlug?: string;
  origins: string[];      // e.g. ["Nigeria", "Ghana"]
  storageTypes: string[]; // e.g. ["ambient", "chilled", "frozen"]
  brands: string[];
  priceRange: [number, number]; // [min, max] in pence
  onlyInStock: boolean;
  sortBy: "relevance" | "popularity" | "bestsellers" | "newest" | "price_asc" | "price_desc" | "discount";
}

interface SearchState {
  filters: SearchFilters;
  pageCursor: string | null;
  limit: number;
  
  // Actions
  setQuery: (query: string) => void;
  setCategory: (slug?: string) => void;
  toggleOrigin: (origin: string) => void;
  toggleStorageType: (storageType: string) => void;
  toggleBrand: (brand: string) => void;
  setPriceRange: (range: [number, number]) => void;
  setOnlyInStock: (onlyInStock: boolean) => void;
  setSortBy: (sortBy: SearchFilters["sortBy"]) => void;
  resetFilters: () => void;
  setPageCursor: (cursor: string | null) => void;
}

const DEFAULT_FILTERS: SearchFilters = {
  query: "",
  categorySlug: undefined,
  origins: [],
  storageTypes: [],
  brands: [],
  priceRange: [0, 10000], // £0 to £100
  onlyInStock: false,
  sortBy: "relevance",
};

export const useSearchStore = create<SearchState>((set) => ({
  filters: DEFAULT_FILTERS,
  pageCursor: null,
  limit: 20,

  setQuery: (query) =>
    set((state) => ({
      filters: { ...state.filters, query },
      pageCursor: null, // Reset pagination on query change
    })),

  setCategory: (slug) =>
    set((state) => ({
      filters: { ...state.filters, categorySlug: slug },
      pageCursor: null,
    })),

  toggleOrigin: (origin) =>
    set((state) => {
      const active = state.filters.origins.includes(origin);
      const origins = active
        ? state.filters.origins.filter((o) => o !== origin)
        : [...state.filters.origins, origin];
      return { filters: { ...state.filters, origins }, pageCursor: null };
    }),

  toggleStorageType: (storageType) =>
    set((state) => {
      const active = state.filters.storageTypes.includes(storageType);
      const storageTypes = active
        ? state.filters.storageTypes.filter((t) => t !== storageType)
        : [...state.filters.storageTypes, storageType];
      return { filters: { ...state.filters, storageTypes }, pageCursor: null };
    }),

  toggleBrand: (brand) =>
    set((state) => {
      const active = state.filters.brands.includes(brand);
      const brands = active
        ? state.filters.brands.filter((b) => b !== brand)
        : [...state.filters.brands, brand];
      return { filters: { ...state.filters, brands }, pageCursor: null };
    }),

  setPriceRange: (priceRange) =>
    set((state) => ({
      filters: { ...state.filters, priceRange },
      pageCursor: null,
    })),

  setOnlyInStock: (onlyInStock) =>
    set((state) => ({
      filters: { ...state.filters, onlyInStock },
      pageCursor: null,
    })),

  setSortBy: (sortBy) =>
    set((state) => ({
      filters: { ...state.filters, sortBy },
      pageCursor: null,
    })),

  resetFilters: () =>
    set({
      filters: DEFAULT_FILTERS,
      pageCursor: null,
    }),

  setPageCursor: (pageCursor) => set({ pageCursor }),
}));
