import React from 'react';
import { getTranslations } from 'next-intl/server';
import { notFound } from 'next/navigation';

export default async function LegalPage({
  params
}: {
  params: Promise<{ slug: string; locale: string }>
}) {
  const { slug } = await params;
  
  // List of valid legal/corporate pages
  const validPages = [
      'about', 'careers', 'press', 'community', 'sustainability', 'blog',
      'help', 'track', 'returns', 'shipping', 'loyalty', 'vendors',
      'terms', 'privacy', 'cookies', 'food-safety', 'accessibility', 'modern-slavery'
  ];

  if (!validPages.includes(slug)) {
      notFound();
  }

  // Formatting title nicely for the placeholder
  const title = slug.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');

  return (
    <main className="flex-1 max-w-4xl mx-auto w-full p-4 md:p-8 md:py-16">
      <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="border-b border-border pb-6">
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight mb-4">{title}</h1>
              <p className="text-muted-foreground text-lg">Last updated: October 2023</p>
          </div>

          <div className="prose prose-lg dark:prose-invert max-w-none">
              <p className="lead">
                  Welcome to the {title} page for Ereko African Market.
              </p>
              
              <h2>1. Introduction</h2>
              <p>
                  This is a placeholder for the {title} content. In a production environment, this content will be dynamically loaded from a Headless CMS (like Sanity, Contentful, or Strapi) to allow for easy updates by the legal and marketing teams.
              </p>

              <h2>2. Information and Usage</h2>
              <p>
                  Ereko is committed to providing authentic African groceries and exceptional service. Please review this information carefully. 
                  If you have any questions regarding our policies or corporate information, please contact our support team.
              </p>

               <h2>3. Contact Us</h2>
              <p>
                  If you have any questions about this {title}, please contact us at:
              </p>
              <ul>
                  <li>Email: legal@ereko.co.uk</li>
                  <li>Phone: +44 (0) 20 1234 5678</li>
                  <li>Address: 123 African Market Street, London, SE1 4AA, United Kingdom</li>
              </ul>
          </div>
      </div>
    </main>
  );
}
