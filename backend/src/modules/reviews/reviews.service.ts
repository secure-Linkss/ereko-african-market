import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateReviewDto, ReviewStatus } from './reviews.dto';
import { v4 as uuidv4 } from 'uuid';

const GOOGLE_REVIEWS = [
  { author_name: 'Ogunmoroti Olusola', rating: 5, comment: 'Your one stop shop for all African food stuffs and groceries in Barking. Nice and friendly staff welcomes you on entering the store.', source: 'google' },
  { author_name: 'Julieta Jalo', rating: 5, comment: 'Products with good quality', source: 'google' },
  { author_name: 'Olamide Adekoya', rating: 5, comment: 'Lovely store, great customer service. Everything you looking for you will get.', source: 'google' },
  { author_name: 'Olowookere Adeola', rating: 5, comment: 'I visited this African shop and they have good everything I been looking for in London… will be coming often', source: 'google' },
  { author_name: 'Shittu Olumide', rating: 5, comment: 'Nice staff and quality products and services.', source: 'google' },
  { author_name: 'Francis Anyacho', rating: 5, comment: "Truly African! There's hardly anything I've needed and not found it there. Highly recommend!", source: 'google' },
  { author_name: 'Adegoke Salau', rating: 5, comment: 'Good value for money and very good customer services', source: 'google' },
  { author_name: 'Yanju Otubu', rating: 5, comment: 'Ereko!!!!! A place to get all African food with affordable prices and good customer service.', source: 'google' },
  { author_name: 'Dondigidi', rating: 5, comment: 'Good service and correct products.', source: 'google' },
  { author_name: 'BADA ABDULL', rating: 5, comment: 'Very lovely service 👍🏾', source: 'google' },
  { author_name: 'Ade Oguns', rating: 5, comment: 'The best African shop in East London', source: 'google' },
  { author_name: 'Engineer Happy', rating: 5, comment: 'Adorable and good services', source: 'google' },
  { author_name: 'Nadiia Hurtovenko', rating: 5, comment: 'Perfect service!', source: 'google' },
  { author_name: 'Kolawo Odunlami', rating: 5, comment: 'Fantastic reception', source: 'google' },
];

@Injectable()
export class ReviewsService implements OnModuleInit {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly supabase: SupabaseService,
  ) {}

  async onModuleInit() {
    try {
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS "StoreReview" (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          author_name TEXT NOT NULL,
          author_email TEXT,
          rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
          comment TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
          source TEXT NOT NULL DEFAULT 'site' CHECK (source IN ('site', 'google')),
          created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
          moderated_at TIMESTAMPTZ,
          moderated_by TEXT
        )
      `);

      const { count } = await this.supabase.db
        .from('StoreReview')
        .select('id', { count: 'exact', head: true })
        .eq('source', 'google');

      if (!count || count === 0) {
        await this.supabase.db.from('StoreReview').insert(
          GOOGLE_REVIEWS.map((r) => ({
            id: uuidv4(),
            author_name: r.author_name,
            author_email: null,
            rating: r.rating,
            comment: r.comment,
            status: 'approved',
            source: r.source,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          })),
        );
        this.logger.log('Seeded 14 Google reviews');
      }
    } catch (err) {
      this.logger.warn(`Reviews table setup: ${err.message}`);
    }
  }

  async getApprovedReviews(limit = 20) {
    const { data, error } = await this.supabase.db
      .from('StoreReview')
      .select('id, author_name, rating, comment, source, created_at')
      .eq('status', 'approved')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Failed to fetch reviews: ${error.message}`);
    return data ?? [];
  }

  async createReview(dto: CreateReviewDto) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase.db
      .from('StoreReview')
      .insert({
        id: uuidv4(),
        author_name: dto.authorName,
        author_email: dto.authorEmail ?? null,
        rating: dto.rating,
        comment: dto.comment,
        status: 'pending',
        source: 'site',
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();
    if (error) throw new Error(`Failed to create review: ${error.message}`);
    return data;
  }

  async listAllReviews(status?: ReviewStatus, limit = 50) {
    let query = this.supabase.db
      .from('StoreReview')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);
    if (status) query = query.eq('status', status);
    const { data, error } = await query;
    if (error) throw new Error(`Failed to list reviews: ${error.message}`);
    return data ?? [];
  }

  async moderateReview(id: string, action: 'approve' | 'reject', moderatedBy: string) {
    const now = new Date().toISOString();
    const { data, error } = await this.supabase.db
      .from('StoreReview')
      .update({
        status: action === 'approve' ? 'approved' : 'rejected',
        moderated_at: now,
        moderated_by: moderatedBy,
        updated_at: now,
      })
      .eq('id', id)
      .select()
      .single();
    if (error || !data) throw new NotFoundException(`Review ${id} not found`);
    return data;
  }

  async deleteReview(id: string) {
    const { error } = await this.supabase.db
      .from('StoreReview')
      .delete()
      .eq('id', id);
    if (error) throw new NotFoundException(`Review ${id} not found or delete failed`);
    return { ok: true, id };
  }

  async getStats() {
    const { data } = await this.supabase.db
      .from('StoreReview')
      .select('rating, status');
    const all = data ?? [];
    const approved = all.filter((r: any) => r.status === 'approved');
    const avgRating = approved.length
      ? approved.reduce((s: number, r: any) => s + r.rating, 0) / approved.length
      : 0;
    return {
      total: all.length,
      approved: approved.length,
      pending: all.filter((r: any) => r.status === 'pending').length,
      rejected: all.filter((r: any) => r.status === 'rejected').length,
      averageRating: Math.round(avgRating * 10) / 10,
    };
  }
}
