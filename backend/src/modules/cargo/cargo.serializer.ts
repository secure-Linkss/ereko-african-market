import { CargoInquiry, CargoStatusHistory } from '@prisma/client';

type RawCargoInquiry = CargoInquiry & {
  statusHistory: CargoStatusHistory[];
};

export function serializeCargoInquiry(cargo: RawCargoInquiry) {
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
    bookingDate: cargo.bookingDate?.toISOString() ?? undefined,
    shipmentDate: cargo.shipmentDate?.toISOString() ?? undefined,
    estimatedDeliveryDate: cargo.estimatedDeliveryDate?.toISOString() ?? undefined,
    statusHistory: cargo.statusHistory.map((h) => ({
      status: h.status,
      note: h.note ?? undefined,
      updatedAt: h.updatedAt.toISOString(),
    })),
    createdAt: cargo.createdAt.toISOString(),
  };
}

/**
 * Maps DB enum (super_express) back to the frontend-facing string (super-express).
 */
function serializeUrgency(urgency: string): string {
  if (urgency === 'super_express') return 'super-express';
  return urgency;
}
