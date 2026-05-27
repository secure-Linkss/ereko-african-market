import { customAlphabet } from 'nanoid';

const nanoid = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ23456789', 5);

export function generateOrderNumber(): string {
  const date = new Date();
  const ymd = `${date.getFullYear()}${String(date.getMonth() + 1).padStart(2, '0')}${String(date.getDate()).padStart(2, '0')}`;
  return `ERK-${ymd}-${nanoid()}`;
}

export function generateRmaNumber(orderId: string): string {
  return `RMA-${orderId.substring(0, 8).toUpperCase()}-${Date.now().toString(36).toUpperCase()}`;
}

export function generateCargoTrackingNumber(): string {
  const alpha = customAlphabet('ABCDEFGHJKLMNPQRSTUVWXYZ0123456789', 8);
  return `ERK-CRG-${alpha()}`;
}
