import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './users.dto';
import { v4 as uuidv4 } from 'uuid';

const MAX_ADDRESSES = 10;

@Injectable()
export class UsersService {
  private readonly logger = new Logger(UsersService.name);

  constructor(private readonly supabase: SupabaseService) {}

  private computeTier(totalEarned: number): string {
    if (totalEarned >= 5000) return 'Royalty';
    if (totalEarned >= 2000) return 'Elder';
    if (totalEarned >= 500) return 'Family';
    return 'Member';
  }

  private formatUserProfile(user: any, loyalty?: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      preferredLocale: user.preferredLocale,
      marketingEmailOptIn: user.marketingEmailOptIn,
      marketingSmsOptIn: user.marketingSmsOptIn,
      loyaltyTier: loyalty?.tier ?? 'Member',
      loyaltyPointsBalance: loyalty?.pointsBalance ?? 0,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  // ─── Profile ───────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, email, phone, firstName, lastName, preferredLocale, marketingEmailOptIn, marketingSmsOptIn, deletedAt, createdAt, updatedAt')
      .eq('id', userId)
      .limit(1);

    const user = users?.[0];
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    const { data: loyaltyRows } = await this.supabase.db
      .from('LoyaltyAccount')
      .select('tier, pointsBalance')
      .eq('userId', userId)
      .limit(1);

    return this.formatUserProfile(user, loyaltyRows?.[0]);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const { data: users } = await this.supabase.db
      .from('User')
      .select('id, deletedAt')
      .eq('id', userId)
      .limit(1);

    const user = users?.[0];
    if (!user || user.deletedAt) throw new NotFoundException('User not found');

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.preferredLocale !== undefined) updates.preferredLocale = dto.preferredLocale;
    if (dto.marketingEmailOptIn !== undefined) updates.marketingEmailOptIn = dto.marketingEmailOptIn;
    if (dto.marketingSmsOptIn !== undefined) updates.marketingSmsOptIn = dto.marketingSmsOptIn;

    const { data: updated } = await this.supabase.db
      .from('User')
      .update(updates)
      .eq('id', userId)
      .select('id, email, phone, firstName, lastName, preferredLocale, marketingEmailOptIn, marketingSmsOptIn, createdAt, updatedAt')
      .single();

    const { data: loyaltyRows } = await this.supabase.db
      .from('LoyaltyAccount')
      .select('tier, pointsBalance')
      .eq('userId', userId)
      .limit(1);

    return this.formatUserProfile(updated, loyaltyRows?.[0]);
  }

  // ─── Addresses ─────────────────────────────────────────────────────────────

  async getAddresses(userId: string) {
    const { data } = await this.supabase.db
      .from('Address')
      .select('*')
      .eq('userId', userId)
      .order('isDefault', { ascending: false })
      .order('createdAt', { ascending: false });

    return data ?? [];
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const { count } = await this.supabase.db
      .from('Address')
      .select('id', { count: 'exact', head: true })
      .eq('userId', userId);

    if ((count ?? 0) >= MAX_ADDRESSES) {
      throw new ForbiddenException(`You can save a maximum of ${MAX_ADDRESSES} addresses.`);
    }

    const now = new Date().toISOString();

    if (dto.isDefault) {
      await this.clearDefaultsForType(userId, dto.type);
    }

    const { data, error } = await this.supabase.db
      .from('Address')
      .insert({
        id: uuidv4(),
        userId,
        type: dto.type,
        firstName: dto.firstName ?? null,
        lastName: dto.lastName ?? null,
        line1: dto.line1,
        line2: dto.line2 ?? null,
        city: dto.city,
        region: dto.region ?? null,
        postcode: dto.postcode,
        countryCode: dto.countryCode,
        phone: dto.phone ?? null,
        isDefault: dto.isDefault ?? false,
        validated: false,
        createdAt: now,
        updatedAt: now,
      })
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const { data: rows } = await this.supabase.db
      .from('Address')
      .select('*')
      .eq('id', addressId)
      .limit(1);

    const address = rows?.[0];
    if (!address || address.userId !== userId) throw new NotFoundException('Address not found');

    const newType = dto.type ?? address.type;
    if (dto.isDefault === true) {
      await this.clearDefaultsForType(userId, newType);
    }

    const updates: Record<string, any> = { updatedAt: new Date().toISOString() };
    if (dto.type !== undefined) updates.type = dto.type;
    if (dto.firstName !== undefined) updates.firstName = dto.firstName;
    if (dto.lastName !== undefined) updates.lastName = dto.lastName;
    if (dto.line1 !== undefined) updates.line1 = dto.line1;
    if (dto.line2 !== undefined) updates.line2 = dto.line2;
    if (dto.city !== undefined) updates.city = dto.city;
    if (dto.region !== undefined) updates.region = dto.region;
    if (dto.postcode !== undefined) updates.postcode = dto.postcode;
    if (dto.countryCode !== undefined) updates.countryCode = dto.countryCode;
    if (dto.phone !== undefined) updates.phone = dto.phone;
    if (dto.isDefault !== undefined) updates.isDefault = dto.isDefault;
    if (dto.line1 || dto.city || dto.postcode) updates.validated = false;

    const { data, error } = await this.supabase.db
      .from('Address')
      .update(updates)
      .eq('id', addressId)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const { data: rows } = await this.supabase.db
      .from('Address')
      .select('*')
      .eq('id', addressId)
      .limit(1);

    const address = rows?.[0];
    if (!address || address.userId !== userId) throw new NotFoundException('Address not found');

    await this.supabase.db.from('Address').delete().eq('id', addressId);

    if (address.isDefault) {
      const { data: next } = await this.supabase.db
        .from('Address')
        .select('id')
        .eq('userId', userId)
        .eq('type', address.type)
        .order('createdAt', { ascending: false })
        .limit(1);

      if (next?.[0]) {
        await this.supabase.db
          .from('Address')
          .update({ isDefault: true })
          .eq('id', next[0].id);
      }
    }
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const { data: rows } = await this.supabase.db
      .from('Address')
      .select('*')
      .eq('id', addressId)
      .limit(1);

    const address = rows?.[0];
    if (!address || address.userId !== userId) throw new NotFoundException('Address not found');

    await this.clearDefaultsForType(userId, address.type);

    const { data, error } = await this.supabase.db
      .from('Address')
      .update({ isDefault: true })
      .eq('id', addressId)
      .select('*')
      .single();

    if (error) throw new BadRequestException(error.message);
    return data;
  }

  private async clearDefaultsForType(userId: string, type: string): Promise<void> {
    const typesToClear = type === 'both' ? ['shipping', 'billing', 'both'] : [type, 'both'];
    await this.supabase.db
      .from('Address')
      .update({ isDefault: false })
      .eq('userId', userId)
      .eq('isDefault', true)
      .in('type', typesToClear);
  }

  // ─── Saved Cards ───────────────────────────────────────────────────────────

  async getSavedCards(userId: string) {
    const { data } = await this.supabase.db
      .from('SavedCard')
      .select('id, brand, last4, expMonth, expYear, isDefault, createdAt')
      .eq('userId', userId)
      .order('isDefault', { ascending: false })
      .order('createdAt', { ascending: false });

    return data ?? [];
  }

  async deleteSavedCard(userId: string, cardId: string): Promise<void> {
    const { data: rows } = await this.supabase.db
      .from('SavedCard')
      .select('*')
      .eq('id', cardId)
      .limit(1);

    const card = rows?.[0];
    if (!card || card.userId !== userId) throw new NotFoundException('Card not found');

    await this.supabase.db.from('SavedCard').delete().eq('id', cardId);

    if (card.isDefault) {
      const { data: next } = await this.supabase.db
        .from('SavedCard')
        .select('id')
        .eq('userId', userId)
        .order('createdAt', { ascending: false })
        .limit(1);

      if (next?.[0]) {
        await this.supabase.db
          .from('SavedCard')
          .update({ isDefault: true })
          .eq('id', next[0].id);
      }
    }
  }

  // ─── Loyalty ───────────────────────────────────────────────────────────────

  async getLoyaltyAccount(userId: string) {
    const { data: loyaltyRows } = await this.supabase.db
      .from('LoyaltyAccount')
      .select('id, userId, pointsBalance, tier, totalEarned, totalRedeemed, createdAt, updatedAt')
      .eq('userId', userId)
      .limit(1);

    const loyalty = loyaltyRows?.[0];
    if (!loyalty) throw new NotFoundException('Loyalty account not found');

    const { data: txRows } = await this.supabase.db
      .from('LoyaltyTransaction')
      .select('id, points, type, description, createdAt')
      .eq('loyaltyAccountId', loyalty.id)
      .order('createdAt', { ascending: false })
      .limit(20);

    return {
      id: loyalty.id,
      userId: loyalty.userId,
      pointsBalance: loyalty.pointsBalance,
      tier: loyalty.tier,
      totalEarned: loyalty.totalEarned,
      totalRedeemed: loyalty.totalRedeemed,
      recentTransactions: (txRows ?? []).map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt,
      })),
      createdAt: loyalty.createdAt,
      updatedAt: loyalty.updatedAt,
    };
  }

  async recalculateLoyaltyTier(userId: string): Promise<void> {
    const { data: rows } = await this.supabase.db
      .from('LoyaltyAccount')
      .select('userId, totalEarned, tier')
      .eq('userId', userId)
      .limit(1);

    const loyalty = rows?.[0];
    if (!loyalty) return;

    const newTier = this.computeTier(loyalty.totalEarned);
    if (newTier !== loyalty.tier) {
      await this.supabase.db
        .from('LoyaltyAccount')
        .update({ tier: newTier, updatedAt: new Date().toISOString() })
        .eq('userId', userId);
    }
  }
}
