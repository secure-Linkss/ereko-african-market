function serializeAddress(addr: any | null) {
  if (!addr) return null;
  return {
    firstName: addr.firstName,
    lastName: addr.lastName,
    line1: addr.line1,
    line2: addr.line2 ?? undefined,
    city: addr.city,
    region: addr.region ?? undefined,
    postcode: addr.postcode,
    countryCode: addr.countryCode,
    phone: addr.phone ?? undefined,
  };
}

function serializeItem(item: any) {
  return {
    id: item.id,
    orderId: item.orderId,
    variantId: item.variantId,
    sku: item.sku,
    title: item.title,
    variantName: item.variantName,
    quantity: item.quantity,
    priceAmountMinor: item.priceAmountMinor,
    productSlug: item.productSlug,
    productImage: item.productImage,
    substitutionStatus: item.substitutionStatus,
    substitutedWithSku: item.substitutedWithSku ?? undefined,
  };
}

function serializeEvent(event: any) {
  return {
    id: event.id,
    orderId: event.orderId,
    eventType: event.eventType,
    payload: event.payload,
    actorId: event.actorId ?? undefined,
    createdAt: event.createdAt,
  };
}

export function serializeOrder(order: any) {
  const addresses: any[] = order.addresses ?? [];
  const deliverySlot = order.deliverySlotBooking
    ? {
        date: order.deliverySlotBooking.date,
        slotStart: order.deliverySlotBooking.slotStart,
        slotEnd: order.deliverySlotBooking.slotEnd,
        priceMinor: order.deliverySlotBooking.priceMinor,
      }
    : undefined;

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    userId: order.userId ?? undefined,
    email: order.email,
    phone: order.phone ?? undefined,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    discountMinor: order.discountMinor,
    shippingMinor: order.shippingMinor,
    taxMinor: order.taxMinor,
    totalMinor: order.totalMinor,
    shippingAddress: serializeAddress(addresses.find((a) => a.type === 'shipping') ?? null),
    billingAddress: serializeAddress(addresses.find((a) => a.type === 'billing') ?? null),
    deliverySlot,
    deliveryMethod: order.deliveryMethod,
    notesCustomer: order.notesCustomer ?? undefined,
    loyaltyPointsEarned: order.loyaltyPointsEarned,
    loyaltyPointsRedeemed: order.loyaltyPointsRedeemed,
    placedAt: order.placedAt,
    paidAt: order.paidAt ?? undefined,
    shippedAt: order.shippedAt ?? undefined,
    deliveredAt: order.deliveredAt ?? undefined,
    trackingNumber: order.trackingNumber ?? undefined,
    carrierName: order.carrierName ?? undefined,
    events: (order.events ?? []).map(serializeEvent),
    items: (order.items ?? []).map(serializeItem),
  };
}
