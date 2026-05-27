import React from 'react';
import Link from 'next/link';
import { ShoppingCart, Search, User, Menu } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">
        
        {/* Logo */}
        <Link href="/en-gb" className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.jpeg" alt="Ereko Logo" className="h-10 w-10 rounded-full border-2 border-primary object-cover" />
          <span className="hidden sm:inline-block font-black text-xl tracking-tighter text-primary">EREKO</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href="/en-gb/shop" className="hover:text-primary transition-colors">Shop</Link>
          <Link href="/en-gb/recipes" className="hover:text-primary transition-colors">Recipes</Link>
          <Link href="/en-gb/cargo" className="hover:text-primary transition-colors">Cargo</Link>
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search products..." 
              className="w-full bg-muted/50 pl-9 border-0 h-9 rounded-full focus-visible:ring-1"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="lg:hidden">
            <Search className="h-5 w-5" />
          </Button>
          <Link href="/en-gb/account">
            <Button variant="ghost" size="icon" className="hidden sm:flex">
              <User className="h-5 w-5" />
            </Button>
          </Link>
          <Link href="/en-gb/cart">
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
