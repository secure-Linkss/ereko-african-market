import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { CargoInquireDto, CargoEstimateDto, CargoUrgencyDto } from './cargo.dto';
import { serializeCargoInquiry } from './cargo.serializer';
import { v4 as uuidv4 } from 'uuid';

export enum CargoStatus {
  INQUIRY = 'INQUIRY',
  QUOTED = 'QUOTED',
  BOOKED = 'BOOKED',
  IN_TRANSIT = 'IN_TRANSIT',
  DELIVERED = 'DELIVERED',
  CLOSED = 'CLOSED',
}

export enum CargoUrgency {
  standard = 'standard',
  express = 'express',
  super_express = 'super_express',
}

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
const VOLUME_SURCHARGE_FACTOR = 1.2;

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

function generateTrackingNumber(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let suffix = '';
  for (let i = 0; i < 8; i++) {
    suffix += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `ERK-CRG-${suffix}`;
}

@Injectable()
export class CargoService {
  constructor(private readonly supabase: SupabaseService) {}

  async inquire(dto: CargoInquireDto, userId?: string) {
    const dbUrgency = mapUrgencyToDb(dto.urgency);
    const quoteAmountMinor = calculateQuoteMinor(
      dto.weightEstKg,
      dto.volumeEstCbm,
      dto.recipientCountry,
      dbUrgency,
    );
    const trackingNumber = generateTrackingNumber();
    const cargoId = uuidv4();
    const now = new Date().toISOString();

    await this.supabase.db.from('CargoInquiry').insert({
      id: cargoId,
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
      createdAt: now,
      updatedAt: now,
    });

    // CargoStatusHistory.updatedAt has @default(now()) — DB sets it automatically
    await this.supabase.db.from('CargoStatusHistory').insert({
      id: uuidv4(),
      cargoId,
      status: CargoStatus.INQUIRY,
      note: 'Inquiry received and quote generated',
    });

    const { data: cargo } = await this.supabase.db
      .from('CargoInquiry')
      .select('*')
      .eq('id', cargoId)
      .single();

    const { data: statusHistory } = await this.supabase.db
      .from('CargoStatusHistory')
      .select('*')
      .eq('cargoId', cargoId)
      .order('updatedAt', { ascending: true });

    return serializeCargoInquiry({ ...cargo, statusHistory: statusHistory ?? [] });
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
    const { data: cargo } = await this.supabase.db
      .from('CargoInquiry')
      .select('*')
      .eq('trackingNumber', trackingNumber)
      .single();

    if (!cargo) {
      throw new NotFoundException(`No shipment found with tracking number ${trackingNumber}`);
    }

    const { data: statusHistory } = await this.supabase.db
      .from('CargoStatusHistory')
      .select('*')
      .eq('cargoId', cargo.id)
      .order('updatedAt', { ascending: true });

    return serializeCargoInquiry({ ...cargo, statusHistory: statusHistory ?? [] });
  }
}
