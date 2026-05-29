import React from 'react';
import Link from 'next/link';
import { Globe, MessageCircle, Camera, Video, Mail, Phone, MapPin } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-foreground text-background mt-auto">
      <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-12 lg:gap-8">
          
          {/* Brand & Contact */}
          <div className="lg:col-span-2 space-y-6">
            <div>
              <img src="/logo.jpeg" alt="Ereko Logo" className="h-12 mb-2 rounded-full border-2 border-primary" />
              <p className="text-muted text-sm max-w-sm">
                The premium destination for authentic African groceries, fresh produce, and culturally rich culinary experiences in the UK.
              </p>
            </div>
            
            <div className="space-y-3 text-sm text-muted">
              <div className="flex items-start gap-3">
                <MapPin className="w-5 h-5 flex-shrink-0 text-primary" />
                <p>5 Broadway, Barking,<br />London, IG11 7LS, United Kingdom</p>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 flex-shrink-0 text-primary" />
                <a href="tel:02036337503" className="hover:text-primary transition-colors">020 3633 7503</a>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 flex-shrink-0 text-primary" />
                <a href="mailto:hello@ereko.co.uk" className="hover:text-primary transition-colors">hello@ereko.co.uk</a>
              </div>
            </div>

            <div className="flex gap-4 pt-2">
              <a href="https://www.instagram.com/erekoafricanmarket/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Camera className="w-5 h-5" />
              </a>
              <a href="https://www.facebook.com/erekoafricanmarket/" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Globe className="w-5 h-5" />
              </a>
              <a href="https://twitter.com/erekomarket" target="_blank" rel="noopener noreferrer" aria-label="Twitter / X" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <MessageCircle className="w-5 h-5" />
              </a>
              <a href="https://www.tiktok.com/@erekoafricanmarket" target="_blank" rel="noopener noreferrer" aria-label="TikTok" className="w-10 h-10 rounded-full bg-background/10 flex items-center justify-center hover:bg-primary hover:text-primary-foreground transition-colors">
                <Video className="w-5 h-5" />
              </a>
            </div>
          </div>

          {/* Corporate Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 border-b border-background/20 pb-2 inline-block">Company</h3>
            <ul className="space-y-3 text-sm text-muted">
              <li><Link href="/about" className="hover:text-primary transition-colors">About Us</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Us</Link></li>
              <li><Link href="/cargo" className="hover:text-primary transition-colors">Cargo Service</Link></li>
              <li><Link href="/recipes" className="hover:text-primary transition-colors">Recipes</Link></li>
              <li><Link href="/help" className="hover:text-primary transition-colors">Help Centre</Link></li>
            </ul>
          </div>

          {/* Support Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 border-b border-background/20 pb-2 inline-block">Support</h3>
            <ul className="space-y-3 text-sm text-muted">
              <li><Link href="/help" className="hover:text-primary transition-colors">Help Centre & FAQs</Link></li>
              <li><Link href="/en-gb/track" className="hover:text-primary transition-colors">Track My Order</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">Returns & Refunds</Link></li>
              <li><Link href="/help" className="hover:text-primary transition-colors">Shipping Info</Link></li>
              <li><Link href="/account" className="hover:text-primary transition-colors">Loyalty Programme</Link></li>
              <li><Link href="/contact" className="hover:text-primary transition-colors">Contact Support</Link></li>
            </ul>
          </div>

          {/* Legal Links */}
          <div>
            <h3 className="font-bold text-lg mb-6 border-b border-background/20 pb-2 inline-block">Legal</h3>
            <ul className="space-y-3 text-sm text-muted">
              <li><Link href="/terms" className="hover:text-primary transition-colors">Terms of Service</Link></li>
              <li><Link href="/privacy" className="hover:text-primary transition-colors">Privacy Policy</Link></li>
              <li><Link href="/cookies" className="hover:text-primary transition-colors">Cookie Policy</Link></li>
              <li><Link href="/food-safety" className="hover:text-primary transition-colors">Food Safety</Link></li>
              <li><Link href="/accessibility" className="hover:text-primary transition-colors">Accessibility</Link></li>
            </ul>
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-background/20 flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted">
          <p>&copy; {currentYear} Ereko Ltd. All rights reserved.</p>
          <div className="flex gap-4">
             {/* Payment Icons Placeholder */}
             <div className="flex gap-2 opacity-50 grayscale hover:grayscale-0 transition-all">
                <div className="w-10 h-6 bg-background rounded"></div>
                <div className="w-10 h-6 bg-background rounded"></div>
                <div className="w-10 h-6 bg-background rounded"></div>
                <div className="w-10 h-6 bg-background rounded"></div>
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
