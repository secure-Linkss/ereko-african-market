import { useQuery } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/lib/api/client";
import { Product, Category } from "@/types";
import { SearchFilters } from "@/store/search";

// --- Request/Response Interfaces ---
export interface ProductListRequest {
  filter?: {
    categorySlug?: string;
    origins?: string[];
    storageTypes?: string[];
    brands?: string[];
    priceMin?: number;
    priceMax?: number;
    onlyInStock?: boolean;
  };
  cursor?: string | null;
  limit?: number;
  sortBy?: SearchFilters["sortBy"];
}

export interface ProductListResponse {
  products: Product[];
  nextCursor: string | null;
  totalCount: number;
}

export interface SearchRequest {
  query: string;
  categorySlug?: string;
  type?: "all" | "products" | "recipes";
  limit?: number;
}

export interface SearchResponse {
  products: Product[];
  recipes: unknown[]; // Recipe CMS objects
}

// --- Service Implementation ---
export const productService = {
  getProducts: async (params: ProductListRequest): Promise<ProductListResponse> => {
    // Construct query parameters matching backend convention: ?filter[origins]=Nigeria&filter[price_min]=0...
    const queryParams: Record<string, string | number | boolean> = {
      limit: params.limit || 20,
      sortBy: params.sortBy || "relevance",
    };

    if (params.cursor) {
      queryParams.cursor = params.cursor;
    }

    if (params.filter) {
      const { filter } = params;
      if (filter.categorySlug) queryParams["filter[category]"] = filter.categorySlug;
      if (filter.origins?.length) queryParams["filter[origins]"] = filter.origins.join(",");
      if (filter.storageTypes?.length) queryParams["filter[storage_types]"] = filter.storageTypes.join(",");
      if (filter.brands?.length) queryParams["filter[brands]"] = filter.brands.join(",");
      if (filter.priceMin !== undefined) queryParams["filter[price_min]"] = filter.priceMin;
      if (filter.priceMax !== undefined) queryParams["filter[price_max]"] = filter.priceMax;
      if (filter.onlyInStock) queryParams["filter[in_stock]"] = "true";
    }

    const response = await apiClient.get<ProductListResponse>(
      API_ENDPOINTS.PRODUCTS.LIST,
      { params: queryParams }
    );
    return response.data;
  },

  getProductBySlug: async (slug: string): Promise<Product> => {
    const response = await apiClient.get<Product>(
      API_ENDPOINTS.PRODUCTS.DETAILS(slug)
    );
    return response.data;
  },

  getCategories: async (): Promise<Category[]> => {
    const response = await apiClient.get<Category[]>(
      API_ENDPOINTS.PRODUCTS.CATEGORIES
    );
    return response.data;
  },

  search: async (params: SearchRequest): Promise<SearchResponse> => {
    const response = await apiClient.get<SearchResponse>(
      API_ENDPOINTS.PRODUCTS.SEARCH,
      {
        params: {
          q: params.query,
          category: params.categorySlug,
          type: params.type || "all",
          limit: params.limit || 10,
        },
      }
    );
    return response.data;
  },
};

// --- TanStack Query Hooks ---

export function useProducts(params: ProductListRequest) {
  return useQuery({
    queryKey: ["products", params],
    queryFn: () => productService.getProducts(params),
    staleTime: 1000 * 60 * 3, // Caches list for 3 minutes
  });
}

export function useProductDetails(slug: string) {
  return useQuery({
    queryKey: ["product", slug],
    queryFn: () => productService.getProductBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 5, // Detail stable for 5 minutes
  });
}

export function useCategories() {
  return useQuery({
    queryKey: ["categories"],
    queryFn: productService.getCategories,
    staleTime: 1000 * 60 * 60, // Categories list stable for 1 hour
  });
}

export function useCatalogSearch(params: SearchRequest) {
  return useQuery({
    queryKey: ["catalog-search", params],
    queryFn: () => productService.search(params),
    enabled: params.query.length >= 2, // Search triggers on 2+ characters
    staleTime: 1000 * 60 * 2,
  });
}
