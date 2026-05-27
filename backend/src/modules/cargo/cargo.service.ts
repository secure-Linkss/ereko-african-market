import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CargoInquireDto, CargoEstimateDto, CargoUrgencyDto } from './cargo.dto';
import { serializeCargoInquiry } from './cargo.serializer';
import { CargoStatus, CargoUrgency } from '@prisma/client';

// ─── Pricing constants (all amounts in pence/integer) ────────────────────────

const TIER_NIGERIA_GHANA = new Set(['nigeria', 'ghana']);

interface UrgencyRates {
  pencePerKg: number;
  deliveryDaysMin: number;
  deliveryDaysMax: number;
}

interface CountryTierRates {
  standard: UrgencyRates;
  express: UrgencyRates;
  super_express: UrgencyRates;
}

const RATES: Record<'nigeria_ghana' | 'other_africa', CountryTierRates> = {
  nigeria_ghana: {
    standard: { pencePerKg: 800, deliveryDaysMin: 10, deliveryDaysMax: 14 },
    express: { pencePerKg: 1500, deliveryDaysMin: 5, deliveryDaysMax: 7 },
    super_express: { pencePerKg: 2500, deliveryDaysMin: 2, deliveryDaysMax: 3 },
  },
  other_africa: {
    standard: { pencePerKg: 1000, deliveryDaysMin: 14, deliveryDaysMax: 21 },
    express: { pencePerKg: 1800, deliveryDaysMin: 7, deliveryDaysMax: 10 },
    super_express: { pencePerKg: 3000, deliveryDaysMin: 3, deliveryDaysMax: 5 },
  },
};

const VOLUME_SURCHARGE_THRESHOLD_CBM = 0.1;
const VOLUME_SURCHARGE_FACTOR = 1.2; // +20%

// ─── Utility helpers ─────────────────────────────────────────────────────────

/**
 * Maps frontend urgency string (super-express) to Prisma enum (super_express).
 */
function mapUrgencyToDb(urgency: CargoUrgencyDto): CargoUrgency {
  switch (urgency) {
    case CargoUrgencyDto.super_express:
      return CargoUrgency.super_express;
    case CargoUrgencyDto.express:
      return CargoUrgency.express;
    default:
      return CargoUrgency.standard;
  }
}

/**
 * Maps Prisma CargoUrgency enum to pricing key.
 */
function urgencyToRateKey(urgency: CargoUrgency): keyof CountryTierRates {
  switch (urgency) {
    case CargoUrgency.super_express:
      return 'super_express';
    case CargoUrgency.express:
      return 'express';
    default:
      return 'standard';
  }
}

function getTierRates(country: string, urgency: CargoUrgency): UrgencyRates {
  const normalised = country.trim().toLowerCase();
  const tier = TIER_NIGERIA_GHANA.has(normalised) ? 'nigeria_ghana' : 'other_africa';
  const key = urgencyToRateKey(urgency);
  return RATES[tier][key];
}

function calculateQuoteMinor(
  weightKg: number,
  volumeCbm: number | undefined | null,
  country: string,
  urgency: CargoUrgency,
): number {
  const rates = getTierRates(country, urgency);
  let baseAmount = Math.ceil(weightKg * rates.pencePerKg);

  if (volumeCbm && volumeCbm > VOLUME_SURCHARGE_THRESHOLD_CBM) {
    baseAmount = Math.ceil(baseAmount * VOLUME_SURCHARGE_FACTOR);
  }

  return baseAmount;
}

/**
 * Generates a tracking number in the format ERK-CRG-{8 random uppercase alphanumeric}.
 */
function generateTrackingNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ERK-CRG-${suffix}`;
}

const CARGO_INCLUDE = {
  statusHistory: {
    orderBy: { updatedAt: 'asc' as const },
  },
} as const;

// ─── Service ─────────────────────────────────────────────────────────────────

@Injectable()
export class CargoService {
  constructor(private readonly prisma: PrismaService) {}

  async inquire(dto: CargoInquireDto, userId?: string) {
    const dbUrgency = mapUrgencyToDb(dto.urgency);
    const quoteAmountMinor = calculateQuoteMinor(
      dto.weightEstKg,
      dto.volumeEstCbm,
      dto.recipientCountry,
      dbUrgency,
    );
    const trackingNumber = generateTrackingNumber();

    const cargo = await this.prisma.cargoInquiry.create({
      data: {
        trackingNumber,
        userId: userId ?? null,
        senderName: dto.senderName,
        senderEmail: dto.senderEmail,
        senderPhone: dto.senderPhone,
        recipientName: dto.recipientName,
        recipientPhone: dto.recipientPhone,
        recipientAddress: dto.recipientAddress,
        recipientCity: dto.recipientCity,
        recipientCountry: dto.recipientCountry,
        weightEstKg: dto.weightEstKg,
        volumeEstCbm: dto.volumeEstCbm ?? null,
        itemDescription: dto.itemDescription,
        urgency: dbUrgency,
        status: CargoStatus.INQUIRY,
        quoteAmountMinor,
        statusHistory: {
          create: [
            {
              status: CargoStatus.INQUIRY,
              note: 'Inquiry received and quote generated',
            },
          ],
        },
      },
      include: CARGO_INCLUDE,
    });

    return serializeCargoInquiry(cargo);
  }

  async estimate(dto: CargoEstimateDto) {
    const dbUrgency = mapUrgencyToDb(dto.urgency);
    const rates = getTierRates(dto.destinationCountry, dbUrgency);
    const estimatedQuoteMinor = calculateQuoteMinor(
      dto.weightKg,
      dto.volumeCbm,
      dto.destinationCountry,
      dbUrgency,
    );

    return {
      estimatedQuoteMinor,
      estimatedDeliveryDays: {
        min: rates.deliveryDaysMin,
        max: rates.deliveryDaysMax,
        label: `${rates.deliveryDaysMin}-${rates.deliveryDaysMax} business days`,
      },
    };
  }

  async track(trackingNumber: string) {
    const cargo = await this.prisma.cargoInquiry.findUnique({
      where: { trackingNumber },
      include: CARGO_INCLUDE,
    });

    if (!cargo) {
      throw new NotFoundException(
        `No shipment found with tracking number ${trackingNumber}`,
      );
    }

    return serializeCargoInquiry(cargo);
  }
}
