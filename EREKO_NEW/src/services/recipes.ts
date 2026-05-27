import { useQuery } from "@tanstack/react-query";
import { apiClient, API_ENDPOINTS } from "@/lib/api/client";
import { Recipe } from "@/types";

// --- Service Implementation ---
export const recipeService = {
  getRecipes: async (limit: number = 10): Promise<Recipe[]> => {
    const response = await apiClient.get<Recipe[]>(
      API_ENDPOINTS.RECIPES.LIST,
      { params: { limit } }
    );
    return response.data;
  },

  getRecipeBySlug: async (slug: string): Promise<Recipe> => {
    const response = await apiClient.get<Recipe>(
      API_ENDPOINTS.RECIPES.DETAILS(slug)
    );
    return response.data;
  },
};

// --- TanStack Query Hooks ---

export function useRecipes(limit: number = 10) {
  return useQuery({
    queryKey: ["recipes", { limit }],
    queryFn: () => recipeService.getRecipes(limit),
    staleTime: 1000 * 60 * 30, // Recipes lists stable for 30 minutes
  });
}

export function useRecipeDetails(slug: string) {
  return useQuery({
    queryKey: ["recipe", slug],
    queryFn: () => recipeService.getRecipeBySlug(slug),
    enabled: !!slug,
    staleTime: 1000 * 60 * 30,
  });
}
