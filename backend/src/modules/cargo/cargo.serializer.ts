export function serializeCargoInquiry(cargo: any) {
  return {
    id: cargo.id,
    trackingNumber: cargo.trackingNumber ?? undefined,
    senderName: cargo.senderName,
    senderEmail: cargo.senderEmail,
    senderPhone: cargo.senderPhone,
    recipientName: cargo.recipientName,
    recipientPhone: cargo.recipientPhone,
    recipientAddress: cargo.recipientAddress,
    recipientCity: cargo.recipientCity,
    recipientCountry: cargo.recipientCountry,
    weightEstKg: cargo.weightEstKg,
    volumeEstCbm: cargo.volumeEstCbm ?? undefined,
    itemDescription: cargo.itemDescription,
    urgency: serializeUrgency(cargo.urgency),
    status: cargo.status,
    quoteAmountMinor: cargo.quoteAmountMinor ?? undefined,
    bookingDate: cargo.bookingDate ?? undefined,
    shipmentDate: cargo.shipmentDate ?? undefined,
    estimatedDeliveryDate: cargo.estimatedDeliveryDate ?? undefined,
    statusHistory: (cargo.statusHistory ?? []).map((h: any) => ({
      status: h.status,
      note: h.note ?? undefined,
      updatedAt: h.updatedAt,
    })),
    createdAt: cargo.createdAt,
  };
}

function serializeUrgency(urgency: string): string {
  if (urgency === 'super_express') return 'super-express';
  return urgency;
}
