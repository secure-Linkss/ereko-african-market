import {
  Injectable, Logger, BadRequestException, NotFoundException,
  ConflictException, UnauthorizedException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import {
  CreateDiscountCodeDto, UpdateDiscountCodeDto, ValidateDiscountDto, DiscountType,
} from './discount.dto';

export interface DiscountValidationResult {
  valid: boolean;
  code: string;
  type: DiscountType;
  value: number;
  discountAmountMinor: number;
  finalTotalMinor: number;
  message: string;
  codeId: string;
}

@Injectable()
export class DiscountService {
  private readonly logger = new Logger(DiscountService.name);

  constructor(private readonly supabase: SupabaseService) {}

  // ─── Admin: List all discount codes ────────────────────────────────────────

  async listCodes(includeInactive = false) {
    let q = this.supabase.db.from('DiscountCode').select('*').order('createdAt', { ascending: false });
    if (!includeInactive) q = q.eq('isActive', true);
    const { data, error } = await q;
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ─── Admin: Get single code ─────────────────────────────────────────────────

  async getCode(id: string) {
    const { data, error } = await this.supabase.db
      .from('DiscountCode').select('*').eq('id', id).single();
    if (error || !data) throw new NotFoundException('Discount code not found');
    return data;
  }

  // ─── Admin: Create code ─────────────────────────────────────────────────────

  async createCode(dto: CreateDiscountCodeDto) {
    // Validate percentage value
    if (dto.type === DiscountType.PERCENTAGE && dto.value >= 100) {
      throw new BadRequestException('Percentage discount must be less than 100%');
    }

    // Check duplicate
    const { data: existing } = await this.supabase.db
      .from('DiscountCode').select('id').eq('code', dto.code).single();
    if (existing) throw new ConflictException(`Code "${dto.code}" already exists`);

    const { data, error } = await this.supabase.db.from('DiscountCode').insert({
      code: dto.code,
      type: dto.type,
      value: dto.value,
      minOrderValueMinor: dto.minOrderValueMinor ?? 0,
      maxUses: dto.maxUses ?? null,
      usesCount: 0,
      expiresAt: dto.expiresAt ?? null,
      isActive: dto.isActive ?? true,
      customerEmail: dto.customerEmail ?? null,
      description: dto.description ?? null,
    }).select().single();

    if (error) {
      this.logger.error('Create discount code error', error);
      throw new BadRequestException(error.message);
    }
    return data;
  }

  // ─── Admin: Update code ─────────────────────────────────────────────────────

  async updateCode(id: string, dto: UpdateDiscountCodeDto) {
    await this.getCode(id);
    const { data, error } = await this.supabase.db
      .from('DiscountCode')
      .update({ ...dto, updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();
    if (error) throw new BadRequestException(error.message);
    return data;
  }

  // ─── Admin: Delete code ─────────────────────────────────────────────────────

  async deleteCode(id: string) {
    await this.getCode(id);
    const { error } = await this.supabase.db.from('DiscountCode').delete().eq('id', id);
    if (error) throw new BadRequestException(error.message);
    return { success: true };
  }

  // ─── Admin: Get usage history for a code ───────────────────────────────────

  async getCodeUsages(codeId: string) {
    const { data, error } = await this.supabase.db
      .from('DiscountUsage')
      .select('*')
      .eq('codeId', codeId)
      .order('usedAt', { ascending: false });
    if (error) throw new BadRequestException(error.message);
    return data ?? [];
  }

  // ─── Public: Validate discount code ────────────────────────────────────────

  async validate(dto: ValidateDiscountDto): Promise<DiscountValidationResult> {
    const { data: code } = await this.supabase.db
      .from('DiscountCode')
      .select('*')
      .eq('code', dto.code)
      .single();

    if (!code) {
      return this._invalid('Code not found or invalid');
    }

    if (!code.isActive) {
      return this._invalid('This discount code is no longer active');
    }

    // Expiry check
    if (code.expiresAt && new Date(code.expiresAt) < new Date()) {
      return this._invalid('This discount code has expired');
    }

    // Max uses check
    if (code.maxUses !== null && code.usesCount >= code.maxUses) {
      return this._invalid('This discount code has reached its maximum uses');
    }

    // Minimum order check
    if (code.minOrderValueMinor > 0 && dto.cartTotalMinor < code.minOrderValueMinor) {
      const minStr = `£${(code.minOrderValueMinor / 100).toFixed(2)}`;
      return this._invalid(`Minimum order of ${minStr} required for this code`);
    }

    // Customer-specific check
    if (code.customerEmail) {
      if (!dto.email) {
        return this._invalid('This code is customer-specific. Please sign in or provide your email');
      }
      if (dto.email.toLowerCase() !== code.customerEmail.toLowerCase()) {
        return this._invalid('This code is not valid for your account');
      }
    }

    // Calculate discount amount
    let discountAmountMinor: number;
    if (code.type === DiscountType.PERCENTAGE) {
      discountAmountMinor = Math.round(dto.cartTotalMinor * (code.value / 100));
    } else {
      // FIXED_AMOUNT
      discountAmountMinor = Math.min(code.value, dto.cartTotalMinor);
    }

    const finalTotalMinor = Math.max(0, dto.cartTotalMinor - discountAmountMinor);
    const saving = code.type === DiscountType.PERCENTAGE
      ? `${code.value}% off`
      : `£${(discountAmountMinor / 100).toFixed(2)} off`;

    return {
      valid: true,
      code: code.code,
      type: code.type,
      value: code.value,
      discountAmountMinor,
      finalTotalMinor,
      message: `Code applied — ${saving}`,
      codeId: code.id,
    };
  }

  // ─── Internal: Record usage when order completes ────────────────────────────

  async recordUsage(codeId: string, orderId: string, userId?: string, email?: string) {
    // Idempotency guard: check if usage already recorded for this order
    const { data: existing } = await this.supabase.db
      .from('DiscountUsage')
      .select('id')
      .eq('codeId', codeId)
      .eq('orderId', orderId)
      .limit(1)
      .single();
    if (existing) {
      this.logger.warn(`Discount usage already recorded for code=${codeId} order=${orderId} — skipping duplicate`);
      return;
    }

    // Insert usage record first (unique constraint on codeId+orderId prevents duplicates under race)
    const { error: insertErr } = await this.supabase.db.from('DiscountUsage').insert({
      codeId,
      orderId,
      userId: userId ?? null,
      email: email ?? null,
    });
    if (insertErr) {
      // Duplicate insert on concurrent retry — safe to ignore
      this.logger.warn(`Discount usage insert conflict (likely retry) for code=${codeId}: ${insertErr.message}`);
      return;
    }

    // Atomic increment: only increment if usesCount < maxUses (or maxUses is null)
    const { data: code } = await this.supabase.db
      .from('DiscountCode').select('usesCount, maxUses').eq('id', codeId).single();
    if (!code) return;

    const newCount = (code.usesCount ?? 0) + 1;
    await this.supabase.db
      .from('DiscountCode')
      .update({ usesCount: newCount, updatedAt: new Date().toISOString() })
      .eq('id', codeId)
      .eq('usesCount', code.usesCount); // optimistic concurrency — only update if count hasn't changed
  }

  // ─── Admin: Set product discount ─────────────────────────────────────────────

  async setProductDiscount(productId: string, discountEnabled: boolean, discountPercent?: number, discountBadge?: string) {
    const updates: any = {
      discountEnabled,
      updatedAt: new Date().toISOString(),
    };

    if (discountEnabled) {
      if (!discountPercent || discountPercent <= 0 || discountPercent > 90) {
        throw new BadRequestException('discountPercent must be between 1 and 90 when enabling discount');
      }
      updates.discountPercent = discountPercent;
      updates.discountBadge = discountBadge ?? 'SALE';
    } else {
      // Clear discount data when disabling
      updates.discountPercent = null;
      updates.discountBadge = null;
    }

    const { data, error } = await this.supabase.db
      .from('Product')
      .update(updates)
      .eq('id', productId)
      .select('id, title, discountEnabled, discountPercent, discountBadge')
      .single();

    if (error) throw new BadRequestException(error.message);
    if (!data) throw new NotFoundException('Product not found');
    return data;
  }

  // ─── Helper ──────────────────────────────────────────────────────────────────

  private _invalid(message: string): DiscountValidationResult {
    return {
      valid: false,
      code: '',
      type: DiscountType.PERCENTAGE,
      value: 0,
      discountAmountMinor: 0,
      finalTotalMinor: 0,
      message,
      codeId: '',
    };
  }
}
