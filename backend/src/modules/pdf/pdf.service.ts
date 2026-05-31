import { Injectable, Logger } from '@nestjs/common';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require('pdfkit') as typeof import('pdfkit');
import { PassThrough } from 'stream';

export interface ReceiptLineItem {
  description: string;
  sku?: string;
  quantity: number;
  unitPriceMinor: number;
  totalMinor: number;
}

export interface ReceiptData {
  orderNumber: string;
  placedAt: string;
  paidAt?: string;
  customerName: string;
  customerEmail: string;
  billingAddress?: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    countryCode: string;
  };
  shippingAddress?: {
    firstName: string;
    lastName: string;
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    countryCode: string;
  };
  items: ReceiptLineItem[];
  subtotalMinor: number;
  deliveryFeeMinor: number;
  deliveryDistanceKm?: number;
  discountMinor: number;
  taxMinor: number;
  totalMinor: number;
  promoCode?: string;
  paymentMethod?: string;
  stripeChargeId?: string;
  stripePaymentIntentId?: string;
  last4?: string;
  storeName?: string;
  storeAddress?: string;
  storeEmail?: string;
  storePhone?: string;
  storeWebsite?: string;
}

function pence(minor: number): string {
  return `£${(minor / 100).toFixed(2)}`;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', {
    day: '2-digit', month: 'long', year: 'numeric',
  });
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit', hour12: false,
  });
}

const BRAND_GOLD = '#c17f42';
const TEXT_DARK = '#1a1a1a';
const TEXT_GREY = '#666666';
const BG_LIGHT = '#faf7f4';
const DIVIDER = '#ece8e3';

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async generateReceiptBuffer(data: ReceiptData): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({
        size: 'A4',
        margins: { top: 50, bottom: 60, left: 50, right: 50 },
        info: {
          Title: `Receipt - Order #${data.orderNumber}`,
          Author: data.storeName ?? 'EREKO Market',
          Subject: `Payment Receipt for Order ${data.orderNumber}`,
        },
      });

      const buffers: Buffer[] = [];
      doc.on('data', (chunk: Buffer) => buffers.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(buffers)));
      doc.on('error', reject);

      const pageWidth = doc.page.width - 100; // accounting for margins
      const leftX = 50;
      const rightX = doc.page.width - 50;

      // ─── Header strip ────────────────────────────────────────────────────────
      doc.rect(0, 0, doc.page.width, 110).fill(BRAND_GOLD);

      doc
        .fillColor('#ffffff')
        .fontSize(28)
        .font('Helvetica-Bold')
        .text(data.storeName ?? 'EREKO Market', leftX, 30);

      doc
        .fillColor('rgba(255,255,255,0.8)')
        .fontSize(10)
        .font('Helvetica')
        .text(data.storeAddress ?? '5 Broadway, Barking, London', leftX, 62)
        .text(data.storeEmail ?? 'hello@ereko.market', leftX, 76)
        .text(data.storePhone ?? '', leftX, 90);

      doc
        .fillColor('#ffffff')
        .fontSize(11)
        .font('Helvetica-Bold')
        .text('PAYMENT RECEIPT', { align: 'right' });

      // ─── Order info ───────────────────────────────────────────────────────────
      let y = 130;

      doc
        .fillColor(TEXT_DARK)
        .fontSize(18)
        .font('Helvetica-Bold')
        .text(`Order #${data.orderNumber}`, leftX, y);

      y += 24;
      doc
        .fillColor(TEXT_GREY)
        .fontSize(10)
        .font('Helvetica')
        .text(`Order Date: ${formatDate(data.placedAt)}`, leftX, y)
        .text(`Payment Date: ${data.paidAt ? formatDateTime(data.paidAt) : 'N/A'}`, leftX, y + 14);

      y += 48;

      // ─── Customer / Address section ───────────────────────────────────────────
      this.drawSectionTitle(doc, 'CUSTOMER DETAILS', leftX, y);
      y += 20;

      const colW = pageWidth / 2 - 10;
      const col2X = leftX + colW + 20;

      doc.fillColor(TEXT_GREY).fontSize(9).font('Helvetica-Bold').text('BILL TO', leftX, y).text('SHIP TO', col2X, y);
      y += 14;

      const billing = data.billingAddress;
      const shipping = data.shippingAddress;

      doc.fillColor(TEXT_DARK).fontSize(10).font('Helvetica-Bold').text(data.customerName, leftX, y);
      if (shipping) doc.text(`${shipping.firstName} ${shipping.lastName}`, col2X, y);
      y += 14;

      doc.font('Helvetica').fontSize(10).fillColor(TEXT_GREY);
      if (billing) {
        doc.text(billing.line1, leftX, y);
        if (billing.line2) { doc.text(billing.line2, leftX, y + 13); y += 13; }
        doc.text(`${billing.city}, ${billing.postcode}`, leftX, y + 13);
        doc.text(billing.countryCode, leftX, y + 26);
      }

      if (shipping) {
        doc.text(shipping.line1, col2X, y);
        if (shipping.line2) { doc.text(shipping.line2, col2X, y + 13); }
        doc.text(`${shipping.city}, ${shipping.postcode}`, col2X, y + 13);
        doc.text(shipping.countryCode, col2X, y + 26);
      }

      y += 50;

      // ─── Order items table ────────────────────────────────────────────────────
      this.drawSectionTitle(doc, 'ORDER ITEMS', leftX, y);
      y += 20;

      // Table header
      doc.rect(leftX, y, pageWidth, 22).fill(BRAND_GOLD);
      doc.fillColor('#ffffff').fontSize(9).font('Helvetica-Bold');
      doc.text('ITEM', leftX + 4, y + 7);
      doc.text('SKU', leftX + 240, y + 7);
      doc.text('QTY', leftX + 320, y + 7);
      doc.text('UNIT', leftX + 360, y + 7);
      doc.text('TOTAL', leftX + 420, y + 7, { width: 70, align: 'right' });
      y += 22;

      let rowBg = false;
      for (const item of data.items) {
        if (rowBg) doc.rect(leftX, y, pageWidth, 20).fill('#fdfaf7');
        rowBg = !rowBg;

        doc.fillColor(TEXT_DARK).fontSize(9).font('Helvetica');
        const itemText = item.description.length > 34 ? item.description.slice(0, 31) + '…' : item.description;
        doc.text(itemText, leftX + 4, y + 5);
        doc.text(item.sku ?? '', leftX + 240, y + 5);
        doc.text(String(item.quantity), leftX + 320, y + 5);
        doc.text(pence(item.unitPriceMinor), leftX + 360, y + 5);
        doc.text(pence(item.totalMinor), leftX + 420, y + 5, { width: 70, align: 'right' });

        y += 20;
      }

      // Divider
      doc.moveTo(leftX, y).lineTo(rightX, y).strokeColor(DIVIDER).lineWidth(1).stroke();
      y += 12;

      // Totals
      const totals: Array<[string, number, boolean?]> = [
        ['Subtotal', data.subtotalMinor],
        ...(data.deliveryFeeMinor > 0
          ? [[`Delivery${data.deliveryDistanceKm ? ` (${data.deliveryDistanceKm.toFixed(1)} km)` : ''}`, data.deliveryFeeMinor] as [string, number]]
          : []),
        ...(data.discountMinor > 0
          ? [[`Discount${data.promoCode ? ` (${data.promoCode})` : ''}`, -data.discountMinor] as [string, number]]
          : []),
        ...(data.taxMinor > 0 ? [['Tax', data.taxMinor] as [string, number]] : []),
      ];

      const totalsStartX = leftX + 280;
      for (const [label, amount] of totals) {
        doc.fillColor(TEXT_GREY).fontSize(10).font('Helvetica').text(label, totalsStartX, y);
        doc.fillColor(TEXT_DARK).text(pence(amount as number), totalsStartX + 120, y, { width: 90, align: 'right' });
        y += 18;
      }

      y += 4;
      doc.rect(totalsStartX - 4, y, pageWidth - 280 + 8, 28).fill(BRAND_GOLD);
      doc.fillColor('#ffffff').fontSize(12).font('Helvetica-Bold')
        .text('GRAND TOTAL', totalsStartX, y + 8)
        .text(pence(data.totalMinor), totalsStartX + 120, y + 8, { width: 90, align: 'right' });
      y += 40;

      // ─── Payment details ──────────────────────────────────────────────────────
      if (y > doc.page.height - 180) {
        doc.addPage();
        y = 50;
      }

      this.drawSectionTitle(doc, 'PAYMENT DETAILS', leftX, y);
      y += 22;

      const payDetails = [
        ['Method', data.paymentMethod ?? 'Card'],
        ...(data.last4 ? [['Card', `•••• ${data.last4}`]] : []),
        ...(data.stripePaymentIntentId ? [['Transaction ID', data.stripePaymentIntentId]] : []),
        ...(data.paidAt ? [['Paid', formatDateTime(data.paidAt)]] : []),
      ];

      doc.rect(leftX, y, pageWidth, payDetails.length * 20 + 16).fill(BG_LIGHT);
      for (const [label, value] of payDetails) {
        doc.fillColor(TEXT_GREY).fontSize(10).font('Helvetica').text(label as string, leftX + 8, y + 8);
        doc.fillColor(TEXT_DARK).text(value as string, leftX + 120, y + 8);
        y += 20;
      }
      y += 20;

      // ─── Footer ───────────────────────────────────────────────────────────────
      doc.rect(0, doc.page.height - 60, doc.page.width, 60).fill(BG_LIGHT);
      doc
        .fillColor(TEXT_GREY)
        .fontSize(9)
        .font('Helvetica')
        .text(
          `Thank you for your order! | ${data.storeWebsite ?? 'ereko-african-market.vercel.app'} | ${data.storeEmail ?? 'hello@ereko.market'}`,
          leftX,
          doc.page.height - 40,
          { align: 'center', width: pageWidth },
        );

      doc.end();
    });
  }

  private drawSectionTitle(doc: PDFKit.PDFDocument, title: string, x: number, y: number): void {
    doc.fillColor(BRAND_GOLD).fontSize(9).font('Helvetica-Bold').text(title, x, y);
    doc.moveTo(x, y + 12).lineTo(doc.page.width - 50, y + 12).strokeColor(BRAND_GOLD).lineWidth(1).stroke();
  }
}
