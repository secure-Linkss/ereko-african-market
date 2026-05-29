import { Injectable, Logger, NotFoundException, OnModuleInit } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CreateReviewDto, ReviewStatus } from './reviews.dto';
import { v4 as uuidv4 } from 'uuid';


@Injectable()
export class ReviewsService implements OnModuleInit {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async onModuleInit() {
    // Table is created via prisma/seed-reviews.ts — this just verifies connectivity
    try {
      const { error } = await this.supabase.db
        .from('StoreReview')
        .select('id', { count: 'exact', head: true })
        .limit(1);
      if (error) {
        this.logger.warn(`StoreReview table not ready: ${error.message}`);
      }
    } catch (err) {
      this.logger.warn(`Reviews init check: ${err.message}`);
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
