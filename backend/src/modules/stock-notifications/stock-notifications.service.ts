import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { SupabaseService } from '../../supabase/supabase.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ConfigService } from '@nestjs/config';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class StockNotificationsService {
  private readonly logger = new Logger(StockNotificationsService.name);

  constructor(
    private readonly supabase: SupabaseService,
    private readonly notifications: NotificationsService,
    private readonly config: ConfigService,
  ) {}

  private get frontendUrl(): string {
    return this.config.get<string>('frontend.url') ?? 'https://ereko-african-market.vercel.app/en-gb';
  }

  @OnEvent('stock.restocked')
  async onStockRestocked(payload: { variantId: string; productId: string }): Promise<void> {
    this.logger.log(`stock.restocked event received: productId=${payload.productId} variantId=${payload.variantId}`);
    await this.triggerBackInStockEmails(payload.productId, payload.variantId).catch((err) =>
      this.logger.error(`Back-in-stock trigger failed: ${err.message}`),
    );
  }

  async subscribe(email: string, productId: string, variantId?: string): Promise<{ alreadySubscribed: boolean }> {
    const { data: existing } = await this.supabase.db
      .from('StockNotification')
      .select('id, notifiedAt')
      .eq('email', email.toLowerCase().trim())
      .eq('productId', productId)
      .eq('variantId', variantId ?? null)
      .limit(1);

    if (existing?.[0] && !existing[0].notifiedAt) {
      return { alreadySubscribed: true };
    }

    // If previously notified, allow re-subscribe by clearing notifiedAt
    if (existing?.[0]?.notifiedAt) {
      await this.supabase.db
        .from('StockNotification')
        .update({ notifiedAt: null, createdAt: new Date().toISOString() })
        .eq('id', existing[0].id);
      return { alreadySubscribed: false };
    }

    await this.supabase.db.from('StockNotification').insert({
      id: uuidv4(),
      email: email.toLowerCase().trim(),
      productId,
      variantId: variantId ?? null,
      notifiedAt: null,
      createdAt: new Date().toISOString(),
    });

    return { alreadySubscribed: false };
  }

  // Called by inventory service when stock goes from 0 to positive
  async triggerBackInStockEmails(productId: string, variantId?: string): Promise<void> {
    const query = this.supabase.db
      .from('StockNotification')
      .select('id, email')
      .eq('productId', productId)
      .is('notifiedAt', null);

    if (variantId) {
      query.or(`variantId.eq.${variantId},variantId.is.null`);
    }

    const { data: subscribers } = await query;
    if (!subscribers?.length) return;

    // Fetch product details
    const { data: product } = await this.supabase.db
      .from('Product')
      .select('id, title, descriptionShort, slug')
      .eq('id', productId)
      .single();

    if (!product) return;

    const { data: images } = await this.supabase.db
      .from('ProductImage')
      .select('url')
      .eq('productId', productId)
      .order('position', { ascending: true })
      .limit(1);

    const { data: variants } = await this.supabase.db
      .from('ProductVariant')
      .select('priceAmountMinor')
      .eq('productId', productId)
      .eq('isActive', true)
      .order('priceAmountMinor', { ascending: true })
      .limit(1);

    const priceMinor = variants?.[0]?.priceAmountMinor ?? 0;
    const productUrl = `${this.frontendUrl}/product/${product.slug}`;
    const imageUrl = images?.[0]?.url;

    const notifiedIds: string[] = [];

    for (const sub of subscribers) {
      try {
        await this.notifications.sendBackInStock({
          email: sub.email,
          productName: product.title,
          productDescription: product.descriptionShort,
          productPrice: `£${(priceMinor / 100).toFixed(2)}`,
          productUrl,
          productImageUrl: imageUrl,
          unsubscribeUrl: `${this.frontendUrl}/account?unsubscribe=stock`,
        });
        notifiedIds.push(sub.id);
        this.logger.log(`Back-in-stock email sent to ${sub.email} for product ${product.title}`);
      } catch (err) {
        this.logger.error(`Back-in-stock email failed for ${sub.email}: ${err.message}`);
      }
    }

    // Mark all notified subscribers
    if (notifiedIds.length > 0) {
      await this.supabase.db
        .from('StockNotification')
        .update({ notifiedAt: new Date().toISOString() })
        .in('id', notifiedIds);
    }
  }
}
