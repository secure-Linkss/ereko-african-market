import { Injectable, Logger, BadRequestException, InternalServerErrorException } from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';
import { v4 as uuidv4 } from 'uuid';
import { UpdateDeliverySettingsDto } from './delivery.dto';

export interface GeoCoords {
  lat: number;
  lng: number;
}

export interface DeliveryFeeResult {
  distanceKm: number;
  feeMinor: number;
  feeLabel: string;
  withinRadius: boolean;
  blocked: boolean;
  blockReason?: string;
  freeDeliveryThresholdMinor?: number;
  nextDayPremiumMinor?: number;
}

function haversineKm(a: GeoCoords, b: GeoCoords): number {
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const sinLat = Math.sin(dLat / 2);
  const sinLng = Math.sin(dLng / 2);
  const c =
    sinLat * sinLat +
    Math.cos((a.lat * Math.PI) / 180) *
      Math.cos((b.lat * Math.PI) / 180) *
      sinLng * sinLng;
  return R * 2 * Math.atan2(Math.sqrt(c), Math.sqrt(1 - c));
}

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  // Use IG11 7LS (actual store address: 5 Broadway, Barking) as default, not E1 6RF
  private readonly DEFAULT_STORE_POSTCODE = 'IG11 7LS';

  private readonly coordCache = new Map<string, GeoCoords>();

  constructor(
    private readonly supabase: SupabaseService,
    private readonly config: ConfigService,
  ) {}

  // ─── Settings ────────────────────────────────────────────────────────────────

  async getSettings() {
    const { data } = await this.supabase.db
      .from('DeliverySettings')
      .select('*')
      .eq('storeId', 'default')
      .limit(1);
    return data?.[0] ?? null;
  }

  async getTiers() {
    const { data } = await this.supabase.db
      .from('DeliveryTier')
      .select('*')
      .eq('isActive', true)
      .order('fromKm', { ascending: true });
    return data ?? [];
  }

  async getFullSettings() {
    const [settings, tiers] = await Promise.all([this.getSettings(), this.getTiers()]);
    return { settings, tiers };
  }

  async updateSettings(dto: UpdateDeliverySettingsDto, actorId: string) {
    const now = new Date().toISOString();

    const existing = await this.getSettings();

    const settingsData: Record<string, any> = {
      storeId: 'default',
      updatedAt: now,
      updatedBy: actorId,
    };
    if (dto.storePostcode !== undefined) settingsData.storePostcode = dto.storePostcode.trim().toUpperCase();
    if (dto.maxRadiusKm !== undefined) settingsData.maxRadiusKm = dto.maxRadiusKm;
    if (dto.pricingMode !== undefined) settingsData.pricingMode = dto.pricingMode;
    if (dto.perKmPriceMinor !== undefined) settingsData.perKmPriceMinor = dto.perKmPriceMinor;
    if (dto.baseFeePriceMinor !== undefined) settingsData.baseFeePriceMinor = dto.baseFeePriceMinor;
    if (dto.nextDayPremiumMinor !== undefined) settingsData.nextDayPremiumMinor = dto.nextDayPremiumMinor;
    if (dto.freeDeliveryThresholdMinor !== undefined) settingsData.freeDeliveryThresholdMinor = dto.freeDeliveryThresholdMinor;

    if (existing) {
      await this.supabase.db.from('DeliverySettings').update(settingsData).eq('storeId', 'default');
    } else {
      await this.supabase.db.from('DeliverySettings').insert({ id: uuidv4(), ...settingsData, createdAt: now });
    }

    if (dto.tiers && dto.tiers.length > 0) {
      // Replace all tiers
      await this.supabase.db.from('DeliveryTier').update({ isActive: false, updatedAt: now }).eq('isActive', true);

      const tierInserts = dto.tiers.map((t, idx) => ({
        id: t.id ?? uuidv4(),
        label: t.label ?? null,
        fromKm: t.fromKm,
        toKm: t.toKm,
        priceMinor: t.priceMinor,
        isActive: true,
        position: t.position ?? idx,
        createdAt: now,
        updatedAt: now,
      }));
      await this.supabase.db.from('DeliveryTier').upsert(tierInserts, { onConflict: 'id' });
    }

    // Clear coords cache so new store postcode is geocoded fresh
    this.coordCache.clear();

    return this.getFullSettings();
  }

  async seedDefaultTiers() {
    const existing = await this.getTiers();
    if (existing.length > 0) return;

    const now = new Date().toISOString();
    const defaults = [
      { id: uuidv4(), label: 'Local', fromKm: 0, toKm: 1, priceMinor: 99, position: 0, isActive: true, createdAt: now, updatedAt: now },
      { id: uuidv4(), label: 'Nearby', fromKm: 1, toKm: 3, priceMinor: 199, position: 1, isActive: true, createdAt: now, updatedAt: now },
      { id: uuidv4(), label: 'Standard', fromKm: 3, toKm: 6, priceMinor: 299, position: 2, isActive: true, createdAt: now, updatedAt: now },
      { id: uuidv4(), label: 'Extended', fromKm: 6, toKm: 10, priceMinor: 399, position: 3, isActive: true, createdAt: now, updatedAt: now },
    ];
    await this.supabase.db.from('DeliveryTier').insert(defaults);

    const settingsExist = await this.getSettings();
    if (!settingsExist) {
      await this.supabase.db.from('DeliverySettings').insert({
        id: uuidv4(),
        storeId: 'default',
        storePostcode: 'IG11 7LS',
        maxRadiusKm: 15,
        pricingMode: 'tiers',
        nextDayPremiumMinor: 200,
        freeDeliveryThresholdMinor: 5500,
        isActive: true,
        updatedAt: now,
      });
    } else {
      // Backfill new columns on existing row if not set
      const updates: Record<string, any> = {};
      if ((settingsExist as any).nextDayPremiumMinor === null || (settingsExist as any).nextDayPremiumMinor === undefined) {
        updates.nextDayPremiumMinor = 200;
      }
      if ((settingsExist as any).freeDeliveryThresholdMinor === null || (settingsExist as any).freeDeliveryThresholdMinor === undefined) {
        updates.freeDeliveryThresholdMinor = 5500;
      }
      if (Object.keys(updates).length > 0) {
        await this.supabase.db.from('DeliverySettings').update({ ...updates, updatedAt: now }).eq('storeId', 'default');
      }
    }
  }

  // ─── Geocoding via postcodes.io ───────────────────────────────────────────────

  async geocodePostcode(postcode: string): Promise<GeoCoords | null> {
    const clean = postcode.trim().toUpperCase().replace(/\s+/g, '');
    if (this.coordCache.has(clean)) return this.coordCache.get(clean)!;

    try {
      const response = await axios.get(`https://api.postcodes.io/postcodes/${encodeURIComponent(clean)}`, {
        timeout: 5000,
      });
      if (response.data?.status === 200 && response.data?.result) {
        const { latitude, longitude } = response.data.result;
        const coords: GeoCoords = { lat: latitude, lng: longitude };
        this.coordCache.set(clean, coords);
        return coords;
      }
    } catch (err) {
      this.logger.warn(`postcodes.io lookup failed for ${postcode}: ${err.message}`);
    }
    return null;
  }

  // ─── Calculate Fee ────────────────────────────────────────────────────────────

  async calculateDeliveryFee(
    customerPostcode: string,
    deliverySpeed: 'standard' | 'nextday' = 'standard',
  ): Promise<DeliveryFeeResult> {
    const [settings, tiers] = await Promise.all([this.getSettings(), this.getTiers()]);

    const freeThreshold = settings?.freeDeliveryThresholdMinor ?? 5500;
    const nextDayPremium = settings?.nextDayPremiumMinor ?? 200;

    if (!settings) {
      this.logger.warn('No delivery settings found, using free delivery');
      return {
        distanceKm: 0, feeMinor: 0, feeLabel: 'Standard delivery',
        withinRadius: true, blocked: false,
        freeDeliveryThresholdMinor: freeThreshold,
        nextDayPremiumMinor: nextDayPremium,
      };
    }

    const storeCoords = await this.geocodePostcode(settings.storePostcode);
    const customerCoords = await this.geocodePostcode(customerPostcode);

    if (!storeCoords || !customerCoords) {
      this.logger.warn(`Could not geocode postcodes: store=${settings.storePostcode} customer=${customerPostcode}`);
      const fallbackFee = (tiers[0]?.priceMinor ?? 399) + (deliverySpeed === 'nextday' ? nextDayPremium : 0);
      return {
        distanceKm: 0,
        feeMinor: fallbackFee,
        feeLabel: deliverySpeed === 'nextday' ? 'Next Day Delivery' : 'Delivery',
        withinRadius: true,
        blocked: false,
        freeDeliveryThresholdMinor: freeThreshold,
        nextDayPremiumMinor: nextDayPremium,
      };
    }

    const distanceKm = Math.round(haversineKm(storeCoords, customerCoords) * 100) / 100;

    if (distanceKm > settings.maxRadiusKm) {
      return {
        distanceKm,
        feeMinor: 0,
        feeLabel: '',
        withinRadius: false,
        blocked: true,
        blockReason: `Sorry, we don't deliver to your area. Our current delivery radius is ${settings.maxRadiusKm} km.`,
        freeDeliveryThresholdMinor: freeThreshold,
        nextDayPremiumMinor: nextDayPremium,
      };
    }

    let baseFeeMinor = 0;
    let baseLabel = 'Delivery';

    if (settings.pricingMode === 'per_km') {
      const baseMinor = settings.baseFeePriceMinor ?? 0;
      const perKm = settings.perKmPriceMinor ?? 30;
      baseFeeMinor = baseMinor + Math.round(distanceKm * perKm);
      baseLabel = `Delivery (${distanceKm.toFixed(1)} km × £${(perKm / 100).toFixed(2)}/km)`;
    } else {
      const matchedTier = tiers.find(
        (t: any) => distanceKm >= t.fromKm && distanceKm <= t.toKm,
      ) ?? tiers[tiers.length - 1];

      if (matchedTier) {
        baseFeeMinor = matchedTier.priceMinor;
        baseLabel = `Delivery (${distanceKm.toFixed(1)} km)${matchedTier.label ? ` — ${matchedTier.label}` : ''}`;
      } else {
        baseFeeMinor = 399;
        baseLabel = `Delivery (${distanceKm.toFixed(1)} km)`;
      }
    }

    const premium = deliverySpeed === 'nextday' ? nextDayPremium : 0;
    const feeMinor = baseFeeMinor + premium;
    const feeLabel = deliverySpeed === 'nextday'
      ? `Next Day Delivery (${distanceKm.toFixed(1)} km)`
      : baseLabel;

    return {
      distanceKm, feeMinor, feeLabel, withinRadius: true, blocked: false,
      freeDeliveryThresholdMinor: freeThreshold,
      nextDayPremiumMinor: nextDayPremium,
    };
  }
}
