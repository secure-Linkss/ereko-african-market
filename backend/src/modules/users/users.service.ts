import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateProfileDto, CreateAddressDto, UpdateAddressDto } from './users.dto';
import { LoyaltyTier } from '@prisma/client';

const MAX_ADDRESSES = 10;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  // ─── Loyalty Tier ─────────────────────────────────────────────────────────

  private computeTier(totalEarned: number): LoyaltyTier {
    if (totalEarned >= 5000) return LoyaltyTier.Royalty;
    if (totalEarned >= 2000) return LoyaltyTier.Elder;
    if (totalEarned >= 500) return LoyaltyTier.Family;
    return LoyaltyTier.Member;
  }

  // ─── Profile ──────────────────────────────────────────────────────────────

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { loyalty: true },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    return this.formatUserProfile(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user || user.deletedAt) {
      throw new NotFoundException('User not found');
    }

    const updated = await this.prisma.user.update({
      where: { id: userId },
      data: {
        ...(dto.firstName !== undefined && { firstName: dto.firstName }),
        ...(dto.lastName !== undefined && { lastName: dto.lastName }),
        ...(dto.phone !== undefined && { phone: dto.phone }),
        ...(dto.preferredLocale !== undefined && { preferredLocale: dto.preferredLocale }),
        ...(dto.marketingEmailOptIn !== undefined && {
          marketingEmailOptIn: dto.marketingEmailOptIn,
        }),
        ...(dto.marketingSmsOptIn !== undefined && {
          marketingSmsOptIn: dto.marketingSmsOptIn,
        }),
      },
      include: { loyalty: true },
    });

    return this.formatUserProfile(updated);
  }

  private formatUserProfile(user: any) {
    return {
      id: user.id,
      email: user.email,
      phone: user.phone ?? undefined,
      firstName: user.firstName ?? undefined,
      lastName: user.lastName ?? undefined,
      preferredLocale: user.preferredLocale,
      marketingEmailOptIn: user.marketingEmailOptIn,
      marketingSmsOptIn: user.marketingSmsOptIn,
      loyaltyTier: (user.loyalty?.tier ?? 'Member') as LoyaltyTier,
      loyaltyPointsBalance: user.loyalty?.pointsBalance ?? 0,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }

  // ─── Addresses ────────────────────────────────────────────────────────────

  async getAddresses(userId: string) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
    });
  }

  async createAddress(userId: string, dto: CreateAddressDto) {
    const count = await this.prisma.address.count({ where: { userId } });
    if (count >= MAX_ADDRESSES) {
      throw new ForbiddenException(
        `You can save a maximum of ${MAX_ADDRESSES} addresses. Please delete one before adding a new one.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // If setting this as default, clear existing defaults of same type
      if (dto.isDefault) {
        await this.clearDefaultsForType(tx, userId, dto.type);
      }

      return tx.address.create({
        data: {
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
        },
      });
    });
  }

  async updateAddress(userId: string, addressId: string, dto: UpdateAddressDto) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.$transaction(async (tx) => {
      const newType = dto.type ?? address.type;

      if (dto.isDefault === true) {
        await this.clearDefaultsForType(tx, userId, newType);
      }

      return tx.address.update({
        where: { id: addressId },
        data: {
          ...(dto.type !== undefined && { type: dto.type }),
          ...(dto.firstName !== undefined && { firstName: dto.firstName }),
          ...(dto.lastName !== undefined && { lastName: dto.lastName }),
          ...(dto.line1 !== undefined && { line1: dto.line1 }),
          ...(dto.line2 !== undefined && { line2: dto.line2 }),
          ...(dto.city !== undefined && { city: dto.city }),
          ...(dto.region !== undefined && { region: dto.region }),
          ...(dto.postcode !== undefined && { postcode: dto.postcode }),
          ...(dto.countryCode !== undefined && { countryCode: dto.countryCode }),
          ...(dto.phone !== undefined && { phone: dto.phone }),
          ...(dto.isDefault !== undefined && { isDefault: dto.isDefault }),
          // Mark as unvalidated if address fields change
          ...(dto.line1 || dto.city || dto.postcode ? { validated: false } : {}),
        },
      });
    });
  }

  async deleteAddress(userId: string, addressId: string): Promise<void> {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    await this.prisma.address.delete({ where: { id: addressId } });

    // If deleted address was default, promote the next most recent one
    if (address.isDefault) {
      const next = await this.prisma.address.findFirst({
        where: { userId, type: address.type },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.address.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  }

  async setDefaultAddress(userId: string, addressId: string) {
    const address = await this.prisma.address.findUnique({ where: { id: addressId } });

    if (!address || address.userId !== userId) {
      throw new NotFoundException('Address not found');
    }

    return this.prisma.$transaction(async (tx) => {
      await this.clearDefaultsForType(tx, userId, address.type);
      return tx.address.update({
        where: { id: addressId },
        data: { isDefault: true },
      });
    });
  }

  private async clearDefaultsForType(
    tx: any,
    userId: string,
    type: string,
  ): Promise<void> {
    // 'both' type addresses should clear all overlapping types
    const typesToClear =
      type === 'both'
        ? ['shipping', 'billing', 'both']
        : [type, 'both'];

    await tx.address.updateMany({
      where: {
        userId,
        isDefault: true,
        type: { in: typesToClear },
      },
      data: { isDefault: false },
    });
  }

  // ─── Saved Cards ──────────────────────────────────────────────────────────

  async getSavedCards(userId: string) {
    return this.prisma.savedCard.findMany({
      where: { userId },
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        brand: true,
        last4: true,
        expMonth: true,
        expYear: true,
        isDefault: true,
        createdAt: true,
        // Never expose stripePaymentMethodId to the client directly
      },
    });
  }

  async deleteSavedCard(userId: string, cardId: string): Promise<void> {
    const card = await this.prisma.savedCard.findUnique({ where: { id: cardId } });

    if (!card || card.userId !== userId) {
      throw new NotFoundException('Card not found');
    }

    await this.prisma.savedCard.delete({ where: { id: cardId } });

    // Promote next card to default if needed
    if (card.isDefault) {
      const next = await this.prisma.savedCard.findFirst({
        where: { userId },
        orderBy: { createdAt: 'desc' },
      });
      if (next) {
        await this.prisma.savedCard.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
      }
    }
  }

  // ─── Loyalty ──────────────────────────────────────────────────────────────

  async getLoyaltyAccount(userId: string) {
    const loyalty = await this.prisma.loyaltyAccount.findUnique({
      where: { userId },
      include: {
        transactions: {
          orderBy: { createdAt: 'desc' },
          take: 20,
        },
      },
    });

    if (!loyalty) {
      throw new NotFoundException('Loyalty account not found');
    }

    return {
      id: loyalty.id,
      userId: loyalty.userId,
      pointsBalance: loyalty.pointsBalance,
      tier: loyalty.tier,
      totalEarned: loyalty.totalEarned,
      totalRedeemed: loyalty.totalRedeemed,
      recentTransactions: loyalty.transactions.map((t) => ({
        id: t.id,
        points: t.points,
        type: t.type,
        description: t.description,
        createdAt: t.createdAt.toISOString(),
      })),
      createdAt: loyalty.createdAt.toISOString(),
      updatedAt: loyalty.updatedAt.toISOString(),
    };
  }

  async recalculateLoyaltyTier(userId: string): Promise<void> {
    const loyalty = await this.prisma.loyaltyAccount.findUnique({ where: { userId } });
    if (!loyalty) return;

    const newTier = this.computeTier(loyalty.totalEarned);
    if (newTier !== loyalty.tier) {
      await this.prisma.loyaltyAccount.update({
        where: { userId },
        data: { tier: newTier },
      });
    }
  }
}
