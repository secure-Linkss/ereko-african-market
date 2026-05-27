"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Card, CardContent } from '@/components/ui/Card';
import { Clock, Users, ChefHat, ShoppingCart, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';
import { useParams } from 'next/navigation';

export default function RecipeDetailPage() {
  const params = useParams();
  const locale = params.locale as string;
  const [added, setAdded] = useState(false);

  const handleAddAllToCart = () => {
    // In a real app, this would dispatch to Zustand/API
    setAdded(true);
    setTimeout(() => setAdded(false), 3000);
  };

  return (
    <main className="flex-1 max-w-5xl mx-auto w-full p-4 md:p-8 space-y-12">
      <Link href={`/${locale}/recipes`} className="text-sm text-muted-foreground hover:text-primary mb-4 inline-block">
          ← Back to Recipes
      </Link>

      {/* Hero Section */}
      <div className="space-y-6 text-center max-w-3xl mx-auto">
          <div className="text-primary font-bold uppercase tracking-widest text-sm">Main Course • Nigerian</div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight">Classic Party Jollof Rice</h1>
          <p className="text-xl text-muted-foreground leading-relaxed">
              The ultimate West African party dish. Smoky, spicy, and deeply flavorful rice cooked in a rich tomato and pepper stew.
          </p>
          
          <div className="flex flex-wrap justify-center gap-8 pt-4 pb-8 border-b border-border">
              <div className="flex flex-col items-center gap-1">
                  <Clock className="w-6 h-6 text-muted-foreground" />
                  <span className="font-semibold">Prep: 20 mins</span>
                  <span className="text-sm text-muted-foreground">Cook: 45 mins</span>
              </div>
              <div className="flex flex-col items-center gap-1">
                  <Users className="w-6 h-6 text-muted-foreground" />
                  <span className="font-semibold">Serves 6-8</span>
                  <span className="text-sm text-muted-foreground">Main Portion</span>
              </div>
               <div className="flex flex-col items-center gap-1">
                  <ChefHat className="w-6 h-6 text-muted-foreground" />
                  <span className="font-semibold">Medium</span>
                  <span className="text-sm text-muted-foreground">Difficulty</span>
              </div>
          </div>
      </div>

      <div className="aspect-[21/9] rounded-2xl overflow-hidden bg-muted shadow-lg">
          <img src="/images/img01.jpg" alt="Jollof Rice" className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-col md:flex-row gap-12 pt-8">
          {/* Ingredients */}
          <div className="w-full md:w-1/3 space-y-6">
              <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold">Ingredients</h2>
              </div>
              
              <Card className="bg-primary/5 border-primary/20 sticky top-8">
                  <CardContent className="p-6 space-y-6">
                      <ul className="space-y-3">
                          <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">3 cups Long Grain Parboiled Rice</span>
                          </li>
                          <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">1 can (400g) Plum Tomatoes</span>
                          </li>
                           <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">3 Red Bell Peppers (Tatashe)</span>
                          </li>
                          <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">2 Scotch Bonnet Peppers (Ata Rodo)</span>
                          </li>
                           <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">1 Large Red Onion</span>
                          </li>
                          <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">1/2 cup Vegetable Oil</span>
                          </li>
                          <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">100g Tomato Paste</span>
                          </li>
                          <li className="flex items-start gap-3">
                              <input type="checkbox" className="mt-1 w-4 h-4 rounded text-primary focus:ring-primary" defaultChecked />
                              <span className="leading-tight">2 tbsp Curry Powder & Dried Thyme</span>
                          </li>
                      </ul>

                      <div className="pt-4 border-t border-primary/20">
                          <Button size="lg" className="w-full shadow-lg" onClick={handleAddAllToCart} disabled={added}>
                              {added ? (
                                  <><CheckCircle2 className="w-5 h-5 mr-2" /> Added to Cart</>
                              ) : (
                                  <><ShoppingCart className="w-5 h-5 mr-2" /> Add 8 Items to Cart</>
                              )}
                          </Button>
                          <p className="text-xs text-center text-muted-foreground mt-3">
                              Instantly adds all checked ingredients to your Ereko cart.
                          </p>
                      </div>
                  </CardContent>
              </Card>
          </div>

          {/* Instructions */}
          <div className="w-full md:w-2/3 space-y-8">
               <h2 className="text-2xl font-bold">Instructions</h2>
               
               <div className="space-y-8">
                   <div className="flex gap-6">
                       <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">1</div>
                       <div className="space-y-2">
                           <h3 className="text-lg font-bold">Blend the base</h3>
                           <p className="text-muted-foreground leading-relaxed">
                               Blend the plum tomatoes, red bell peppers, scotch bonnet peppers, and half of the onion until smooth. Boil the mixture in a pot until it reduces to a thick paste and the water dries up (about 15-20 mins).
                           </p>
                       </div>
                   </div>

                   <div className="flex gap-6">
                       <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">2</div>
                       <div className="space-y-2">
                           <h3 className="text-lg font-bold">Fry the stew</h3>
                           <p className="text-muted-foreground leading-relaxed">
                               In a large sturdy pot, heat the vegetable oil. Slice the remaining half onion and fry until translucent. Stir in the tomato paste and fry for 3-5 minutes on medium heat to remove the tanginess. Add the boiled pepper mix, curry powder, thyme, and stock cubes. Cover and fry for 10-15 minutes until the oil floats to the top.
                           </p>
                       </div>
                   </div>

                    <div className="flex gap-6">
                       <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">3</div>
                       <div className="space-y-2">
                           <h3 className="text-lg font-bold">Wash the rice</h3>
                           <p className="text-muted-foreground leading-relaxed">
                               While the stew is frying, thoroughly wash the parboiled rice in warm water multiple times until the water runs completely clear to remove excess starch. Drain well.
                           </p>
                       </div>
                   </div>

                   <div className="flex gap-6">
                       <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">4</div>
                       <div className="space-y-2">
                           <h3 className="text-lg font-bold">Combine and cook</h3>
                           <p className="text-muted-foreground leading-relaxed">
                               Pour the washed rice into the fried stew. Stir thoroughly to ensure every grain is coated. Add meat stock or water—just enough to be at the exact same level as the rice (do not drown it). Add salt to taste. Bring to a boil, then immediately reduce the heat to the absolute minimum.
                           </p>
                       </div>
                   </div>

                   <div className="flex gap-6">
                       <div className="flex-shrink-0 w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-lg">5</div>
                       <div className="space-y-2">
                           <h3 className="text-lg font-bold">Steam it</h3>
                           <p className="text-muted-foreground leading-relaxed">
                               Cover the pot tightly with foil paper before placing the lid on to trap the steam. Let it cook for 30-40 minutes without opening. Jollof cooks with steam, not water. Let the bottom burn slightly for that authentic party smokiness.
                           </p>
                       </div>
                   </div>
               </div>
          </div>
      </div>
    </main>
  );
}
