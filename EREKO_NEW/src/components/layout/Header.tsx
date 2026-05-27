'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ShoppingCart, Search, User, Menu, X, LogOut, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useAuthStore } from '@/store/auth';
import { useCartStore } from '@/store/cart';
import { useLogout } from '@/services/auth';

export function Header() {
  const params = useParams();
  const router = useRouter();
  const locale = (params?.locale as string) ?? 'en-gb';

  const [mobileOpen, setMobileOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const { user, isAuthenticated } = useAuthStore();
  const cartItems = useCartStore((s) => s.items);
  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  const logoutMutation = useLogout();

  async function handleLogout() {
    await logoutMutation.mutateAsync();
    router.push(`/${locale}`);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between gap-4">

        {/* Logo */}
        <Link href={`/${locale}`} className="flex items-center gap-2 flex-shrink-0">
          <img src="/logo.jpeg" alt="Ereko Logo" className="h-10 w-10 rounded-full border-2 border-primary object-cover" />
          <span className="hidden sm:inline-block font-black text-xl tracking-tighter text-primary">EREKO</span>
        </Link>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium">
          <Link href={`/${locale}/shop`} className="hover:text-primary transition-colors">Shop</Link>
          <Link href={`/${locale}/recipes`} className="hover:text-primary transition-colors">Recipes</Link>
          <Link href={`/${locale}/cargo`} className="hover:text-primary transition-colors">Cargo</Link>
        </nav>

        {/* Search Bar */}
        <div className="flex-1 max-w-md hidden lg:block">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              className="w-full bg-muted/50 pl-9 border-0 h-9 rounded-full focus-visible:ring-1"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  router.push(`/${locale}/shop?q=${encodeURIComponent(e.currentTarget.value)}`);
                }
              }}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSearchOpen(!searchOpen)}>
            <Search className="h-5 w-5" />
          </Button>

          {/* Auth Button */}
          {isAuthenticated ? (
            <div className="relative group hidden sm:block">
              <Button variant="ghost" size="icon">
                <User className="h-5 w-5" />
              </Button>
              <div className="absolute right-0 top-full mt-1 w-48 bg-background border border-border rounded-xl shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                <div className="p-3 border-b border-border">
                  <p className="text-sm font-semibold truncate">{user?.firstName} {user?.lastName}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <div className="p-1">
                  <Link href={`/${locale}/account`} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors">
                    <Settings className="h-4 w-4" /> My Account
                  </Link>
                  {user?.isAdmin && (
                    <Link href={`/${locale}/admin`} className="flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-primary font-medium">
                      <Settings className="h-4 w-4" /> Admin Panel
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2 px-3 py-2 text-sm rounded-lg hover:bg-muted transition-colors text-destructive"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <Link href={`/${locale}/login`} className="hidden sm:flex">
              <Button variant="ghost" size="sm" className="font-semibold">
                Sign in
              </Button>
            </Link>
          )}

          {/* Cart */}
          <Link href={`/${locale}/cart`}>
            <Button variant="ghost" size="icon" className="relative">
              <ShoppingCart className="h-5 w-5" />
              {cartCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 h-4 w-4 rounded-full bg-primary text-primary-foreground text-[10px] font-bold flex items-center justify-center">
                  {cartCount > 9 ? '9+' : cartCount}
                </span>
              )}
            </Button>
          </Link>

          {/* Mobile Menu Toggle */}
          <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(!mobileOpen)}>
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Search */}
      {searchOpen && (
        <div className="lg:hidden px-4 pb-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search products..."
              autoFocus
              className="w-full bg-muted/50 pl-9 border-0 h-9 rounded-full"
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.currentTarget.value) {
                  router.push(`/${locale}/shop?q=${encodeURIComponent(e.currentTarget.value)}`);
                  setSearchOpen(false);
                }
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile Navigation */}
      {mobileOpen && (
        <div className="md:hidden border-b border-border bg-background">
          <nav className="flex flex-col p-4 space-y-1">
            <Link href={`/${locale}/shop`} className="px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>Shop</Link>
            <Link href={`/${locale}/recipes`} className="px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>Recipes</Link>
            <Link href={`/${locale}/cargo`} className="px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>Cargo</Link>
            <div className="border-t border-border pt-2 mt-2">
              {isAuthenticated ? (
                <>
                  <Link href={`/${locale}/account`} className="px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium flex items-center gap-2" onClick={() => setMobileOpen(false)}>
                    <User className="h-4 w-4" /> My Account
                  </Link>
                  <button onClick={handleLogout} className="w-full text-left px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium text-destructive flex items-center gap-2">
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </>
              ) : (
                <>
                  <Link href={`/${locale}/login`} className="px-4 py-3 rounded-lg hover:bg-muted text-sm font-medium" onClick={() => setMobileOpen(false)}>Sign in</Link>
                  <Link href={`/${locale}/signup`} className="px-4 py-3 rounded-lg bg-primary text-primary-foreground text-sm font-medium text-center" onClick={() => setMobileOpen(false)}>Create account</Link>
                </>
              )}
            </div>
          </nav>
        </div>
      )}
    </header>
  );
}
