export interface PasswordResetContext {
  firstName: string;
  resetUrl: string;
  expiresInMinutes?: number;
}

export interface OrderConfirmationContext {
  firstName: string;
  orderNumber: string;
  orderTotal: string;
  orderItems: Array<{
    title: string;
    variantName: string;
    quantity: number;
    price: string;
  }>;
  shippingAddress: {
    line1: string;
    line2?: string;
    city: string;
    postcode: string;
    countryCode: string;
  };
  orderUrl: string;
}

export interface MagicLinkContext {
  firstName: string;
  magicLinkUrl: string;
  expiresInMinutes?: number;
}

export interface WelcomeContext {
  firstName: string;
  loginUrl: string;
}

// ─── Base Layout ─────────────────────────────────────────────────────────────

function baseLayout(title: string, content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(title)}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      background-color: #f5f0eb;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      color: #1a1a1a;
    }
    .wrapper {
      max-width: 600px;
      margin: 40px auto;
      background: #ffffff;
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 4px 24px rgba(0,0,0,0.08);
    }
    .header {
      background: linear-gradient(135deg, #c17f42 0%, #8b5e2e 100%);
      padding: 32px 40px;
      text-align: center;
    }
    .header-logo {
      font-size: 28px;
      font-weight: 800;
      color: #ffffff;
      letter-spacing: 2px;
      text-decoration: none;
    }
    .header-tagline {
      color: rgba(255,255,255,0.8);
      font-size: 13px;
      margin-top: 4px;
    }
    .body {
      padding: 40px;
    }
    .greeting {
      font-size: 22px;
      font-weight: 700;
      color: #1a1a1a;
      margin: 0 0 16px;
    }
    .text {
      font-size: 15px;
      line-height: 1.7;
      color: #444444;
      margin: 0 0 20px;
    }
    .btn {
      display: inline-block;
      background: #c17f42;
      color: #ffffff !important;
      font-size: 16px;
      font-weight: 700;
      padding: 14px 32px;
      border-radius: 8px;
      text-decoration: none;
      margin: 8px 0 24px;
      letter-spacing: 0.3px;
    }
    .btn:hover { background: #a66c34; }
    .divider {
      border: none;
      border-top: 1px solid #ece8e3;
      margin: 28px 0;
    }
    .small-text {
      font-size: 13px;
      color: #888888;
      line-height: 1.6;
    }
    .url-fallback {
      font-size: 13px;
      color: #888888;
      word-break: break-all;
    }
    .footer {
      background: #faf7f4;
      padding: 24px 40px;
      text-align: center;
      border-top: 1px solid #ece8e3;
    }
    .footer-text {
      font-size: 12px;
      color: #aaaaaa;
      line-height: 1.6;
      margin: 0;
    }
    .footer a {
      color: #c17f42;
      text-decoration: none;
    }
    .order-table {
      width: 100%;
      border-collapse: collapse;
      margin: 16px 0 24px;
    }
    .order-table th {
      text-align: left;
      font-size: 12px;
      font-weight: 700;
      color: #888888;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      padding: 8px 0;
      border-bottom: 2px solid #ece8e3;
    }
    .order-table td {
      font-size: 14px;
      color: #444444;
      padding: 12px 0;
      border-bottom: 1px solid #f0ece8;
      vertical-align: top;
    }
    .order-table td.price {
      text-align: right;
      font-weight: 600;
      white-space: nowrap;
    }
    .address-box {
      background: #faf7f4;
      border: 1px solid #ece8e3;
      border-radius: 8px;
      padding: 16px 20px;
      font-size: 14px;
      color: #444444;
      line-height: 1.7;
      margin: 16px 0 24px;
    }
    .highlight-box {
      background: #fff8f0;
      border-left: 4px solid #c17f42;
      padding: 16px 20px;
      border-radius: 0 8px 8px 0;
      margin: 20px 0;
      font-size: 14px;
      color: #444444;
      line-height: 1.6;
    }
    @media (max-width: 600px) {
      .wrapper { margin: 0; border-radius: 0; }
      .body, .footer { padding: 28px 24px; }
      .header { padding: 24px; }
    }
  </style>
</head>
<body>
  <div class="wrapper">
    <div class="header">
      <div class="header-logo">EREKO</div>
      <div class="header-tagline">Taste of Africa, Delivered</div>
    </div>
    <div class="body">
      ${content}
    </div>
    <div class="footer">
      <p class="footer-text">
        &copy; ${new Date().getFullYear()} EREKO Market Ltd. All rights reserved.<br />
        EREKO Market, London, United Kingdom<br />
        <a href="https://ereko.market/unsubscribe">Unsubscribe</a> &middot;
        <a href="https://ereko.market/privacy">Privacy Policy</a> &middot;
        <a href="https://ereko.market/terms">Terms</a>
      </p>
    </div>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ─── Password Reset ───────────────────────────────────────────────────────────

export function passwordResetTemplate(ctx: PasswordResetContext): {
  subject: string;
  html: string;
  text: string;
} {
  const expiresIn = ctx.expiresInMinutes ?? 60;
  const firstName = escapeHtml(ctx.firstName);

  const html = baseLayout(
    'Reset Your EREKO Password',
    `<p class="greeting">Password Reset Request</p>
    <p class="text">Hi ${firstName},</p>
    <p class="text">
      We received a request to reset the password for your EREKO account.
      Click the button below to set a new password. This link will expire in <strong>${expiresIn} minutes</strong>.
    </p>
    <div style="text-align:center; margin: 28px 0;">
      <a href="${escapeHtml(ctx.resetUrl)}" class="btn">Reset My Password</a>
    </div>
    <div class="highlight-box">
      <strong>Didn't request this?</strong><br />
      If you didn't request a password reset, you can safely ignore this email.
      Your password will remain unchanged and no action is required.
    </div>
    <hr class="divider" />
    <p class="small-text">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p class="url-fallback">${escapeHtml(ctx.resetUrl)}</p>`,
  );

  const text = `Reset Your EREKO Password

Hi ${ctx.firstName},

We received a request to reset your EREKO password. Visit the link below to set a new password. This link expires in ${expiresIn} minutes.

${ctx.resetUrl}

If you didn't request this, please ignore this email.

EREKO Market
`;

  return {
    subject: 'Reset your EREKO password',
    html,
    text,
  };
}

// ─── Order Confirmation ───────────────────────────────────────────────────────

export function orderConfirmationTemplate(ctx: OrderConfirmationContext): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = escapeHtml(ctx.firstName);
  const orderNumber = escapeHtml(ctx.orderNumber);
  const addr = ctx.shippingAddress;

  const itemRows = ctx.orderItems
    .map(
      (item) => `
    <tr>
      <td>
        <strong>${escapeHtml(item.title)}</strong><br />
        <span style="color:#888;font-size:13px;">${escapeHtml(item.variantName)}</span>
      </td>
      <td style="text-align:center; padding:12px 8px;">${item.quantity}</td>
      <td class="price">${escapeHtml(item.price)}</td>
    </tr>`,
    )
    .join('');

  const addressLines = [
    addr.line1,
    addr.line2,
    addr.city,
    addr.postcode,
    addr.countryCode,
  ]
    .filter(Boolean)
    .map(escapeHtml)
    .join('<br />');

  const html = baseLayout(
    `Order Confirmed – ${ctx.orderNumber}`,
    `<p class="greeting">Order Confirmed!</p>
    <p class="text">Hi ${firstName},</p>
    <p class="text">
      Thank you for shopping with EREKO! Your order <strong>#${orderNumber}</strong> has been confirmed
      and is being prepared with care.
    </p>
    <div class="highlight-box">
      Order total: <strong>${escapeHtml(ctx.orderTotal)}</strong>
    </div>
    <h3 style="font-size:16px; font-weight:700; color:#1a1a1a; margin:24px 0 8px;">Order Summary</h3>
    <table class="order-table">
      <thead>
        <tr>
          <th>Item</th>
          <th style="text-align:center;">Qty</th>
          <th style="text-align:right;">Price</th>
        </tr>
      </thead>
      <tbody>
        ${itemRows}
      </tbody>
    </table>
    <h3 style="font-size:16px; font-weight:700; color:#1a1a1a; margin:24px 0 8px;">Delivery Address</h3>
    <div class="address-box">${addressLines}</div>
    <div style="text-align:center; margin:28px 0;">
      <a href="${escapeHtml(ctx.orderUrl)}" class="btn">View Order Status</a>
    </div>
    <p class="small-text">
      We'll send you another email when your order is on its way.
      If you have any questions, reply to this email or visit our
      <a href="https://ereko.market/help" style="color:#c17f42;">Help Centre</a>.
    </p>`,
  );

  const itemLines = ctx.orderItems
    .map((item) => `  - ${item.title} (${item.variantName}) x${item.quantity} — ${item.price}`)
    .join('\n');

  const text = `Order Confirmed – #${ctx.orderNumber}

Hi ${ctx.firstName},

Your EREKO order #${ctx.orderNumber} has been confirmed!

ORDER SUMMARY
${itemLines}

Total: ${ctx.orderTotal}

Delivery to:
${[addr.line1, addr.line2, addr.city, addr.postcode, addr.countryCode].filter(Boolean).join(', ')}

Track your order: ${ctx.orderUrl}

EREKO Market
`;

  return {
    subject: `Your EREKO order #${ctx.orderNumber} is confirmed!`,
    html,
    text,
  };
}

// ─── Magic Link ───────────────────────────────────────────────────────────────

export function magicLinkTemplate(ctx: MagicLinkContext): {
  subject: string;
  html: string;
  text: string;
} {
  const expiresIn = ctx.expiresInMinutes ?? 15;
  const firstName = escapeHtml(ctx.firstName);

  const html = baseLayout(
    'Your EREKO Login Link',
    `<p class="greeting">Your Magic Login Link</p>
    <p class="text">Hi ${firstName},</p>
    <p class="text">
      Click the button below to sign in to your EREKO account.
      This link is valid for <strong>${expiresIn} minutes</strong> and can only be used once.
    </p>
    <div style="text-align:center; margin: 28px 0;">
      <a href="${escapeHtml(ctx.magicLinkUrl)}" class="btn">Sign In to EREKO</a>
    </div>
    <div class="highlight-box">
      <strong>Security reminder:</strong> Never share this link with anyone.
      EREKO will never ask you to forward this email.
    </div>
    <hr class="divider" />
    <p class="small-text">If the button above doesn't work, copy and paste this link into your browser:</p>
    <p class="url-fallback">${escapeHtml(ctx.magicLinkUrl)}</p>
    <p class="small-text">
      If you didn't request this login link, you can safely ignore this email.
    </p>`,
  );

  const text = `Your EREKO Login Link

Hi ${ctx.firstName},

Use the link below to sign in to your EREKO account. This link expires in ${expiresIn} minutes and can only be used once.

${ctx.magicLinkUrl}

Never share this link with anyone. If you didn't request this, ignore this email.

EREKO Market
`;

  return {
    subject: 'Your EREKO login link',
    html,
    text,
  };
}

// ─── Welcome ──────────────────────────────────────────────────────────────────

export function welcomeTemplate(ctx: WelcomeContext): {
  subject: string;
  html: string;
  text: string;
} {
  const firstName = escapeHtml(ctx.firstName);

  const html = baseLayout(
    'Welcome to EREKO Market',
    `<p class="greeting">Welcome to EREKO! 🌍</p>
    <p class="text">Hi ${firstName},</p>
    <p class="text">
      We're thrilled to have you join the EREKO family!
      Your one-stop destination for authentic African groceries, spices, and pantry staples —
      delivered straight to your door across the UK.
    </p>
    <div class="highlight-box">
      <strong>You've joined as a Member</strong> — earn points on every order
      and unlock Family, Elder, and Royalty tiers for exclusive rewards.
    </div>
    <div style="text-align:center; margin:28px 0;">
      <a href="${escapeHtml(ctx.loginUrl)}" class="btn">Start Shopping</a>
    </div>
    <p class="text">Here's what makes EREKO special:</p>
    <ul style="font-size:15px; color:#444; line-height:1.8; padding-left:20px;">
      <li>Fresh and authentic African produce sourced from trusted suppliers</li>
      <li>Same-day and next-day delivery options across London</li>
      <li>Loyalty rewards — earn points on every purchase</li>
      <li>Curated recipes from chefs across West, East, and Southern Africa</li>
    </ul>
    <p class="small-text">
      Questions? We're always here to help at
      <a href="mailto:hello@ereko.market" style="color:#c17f42;">hello@ereko.market</a>
    </p>`,
  );

  const text = `Welcome to EREKO Market!

Hi ${ctx.firstName},

Welcome to EREKO – your one-stop destination for authentic African groceries, delivered across the UK.

Start shopping: ${ctx.loginUrl}

You're now a Member in our loyalty programme — earn points on every order and unlock exciting rewards.

Questions? Email us: hello@ereko.market

EREKO Market
`;

  return {
    subject: 'Welcome to EREKO Market!',
    html,
    text,
  };
}

// ─── Order Status Update ──────────────────────────────────────────────────────

export interface OrderStatusUpdateContext {
  firstName: string;
  orderNumber: string;
  status: string;
  trackingNumber?: string;
  carrierName?: string;
  notes?: string;
  orderUrl: string;
  frontendUrl: string;
}

const STATUS_COPY: Record<string, { headline: string; body: string; emoji: string }> = {
  SHIPPED: {
    emoji: '🚚',
    headline: 'Your order is on its way!',
    body: 'Great news — your order has been dispatched and is heading to you.',
  },
  OUT_FOR_DELIVERY: {
    emoji: '📦',
    headline: 'Out for delivery today!',
    body: 'Your order is out for delivery and should arrive today. Make sure someone is home to receive it.',
  },
  DELIVERED: {
    emoji: '✅',
    headline: 'Your order has been delivered!',
    body: 'Your order has been successfully delivered. We hope you enjoy your authentic African groceries!',
  },
  READY_FOR_PICKUP: {
    emoji: '🏪',
    headline: 'Ready for collection!',
    body: 'Your order is ready for collection at our store. Please bring your order confirmation.',
  },
  PICKED_UP: {
    emoji: '🎉',
    headline: 'Order collected — enjoy!',
    body: 'Your order has been collected. Thank you for shopping with EREKO!',
  },
  CANCELLED: {
    emoji: '❌',
    headline: 'Your order has been cancelled',
    body: 'Your order has been cancelled. If you paid online, a full refund will be processed within 3–5 business days.',
  },
  REFUNDED: {
    emoji: '💳',
    headline: 'Refund processed',
    body: 'Your refund has been processed and should appear in your account within 3–5 business days.',
  },
  ON_HOLD: {
    emoji: '⏸️',
    headline: 'Your order is on hold',
    body: 'Your order has been temporarily placed on hold. Our team will be in touch shortly with more information.',
  },
  RETURN_REQUESTED: {
    emoji: '🔄',
    headline: 'Return request received',
    body: 'We have received your return request and our team is reviewing it. We will be in touch within 24 hours.',
  },
  RETURNED: {
    emoji: '📬',
    headline: 'Return confirmed',
    body: 'Your return has been confirmed. A refund will be processed within 3–5 business days.',
  },
  DISPUTED: {
    emoji: '⚠️',
    headline: 'Dispute opened on your order',
    body: 'A dispute has been opened on your order. Our team will review and contact you within 24 hours.',
  },
};

export function orderStatusUpdateTemplate(ctx: OrderStatusUpdateContext): {
  subject: string; html: string; text: string;
} {
  const copy = STATUS_COPY[ctx.status] ?? {
    emoji: '📋', headline: `Order update: ${ctx.status.replace(/_/g, ' ')}`, body: 'There has been an update to your order.',
  };
  const firstName = escapeHtml(ctx.firstName);
  const orderNumber = escapeHtml(ctx.orderNumber);

  let trackingHtml = '';
  let trackingText = '';
  if (ctx.trackingNumber && ctx.carrierName) {
    trackingHtml = `<div class="highlight-box"><strong>Tracking details</strong><br/>Carrier: ${escapeHtml(ctx.carrierName)}<br/>Tracking number: <strong>${escapeHtml(ctx.trackingNumber)}</strong></div>`;
    trackingText = `\nTracking details:\nCarrier: ${ctx.carrierName}\nTracking #: ${ctx.trackingNumber}\n`;
  }
  if (ctx.notes) {
    trackingHtml += `<p class="text"><strong>Note from our team:</strong> ${escapeHtml(ctx.notes)}</p>`;
    trackingText += `\nNote: ${ctx.notes}\n`;
  }

  const html = baseLayout(
    `Order ${orderNumber} — ${copy.headline}`,
    `<p class="greeting">${copy.emoji} ${copy.headline}</p>
    <p class="text">Hi ${firstName},</p>
    <p class="text">${copy.body}</p>
    <div class="highlight-box"><strong>Order</strong>: ${orderNumber}</div>
    ${trackingHtml}
    <div style="text-align:center; margin:28px 0;">
      <a href="${escapeHtml(ctx.orderUrl)}" class="btn">View Order</a>
    </div>
    <p class="small-text">Questions? Email us at <a href="mailto:hello@ereko.market" style="color:#c17f42;">hello@ereko.market</a></p>`,
  );

  const text = `${copy.headline}

Hi ${firstName},

${copy.body}

Order: ${orderNumber}${trackingText}

View your order: ${ctx.orderUrl}

---
EREKO Market | hello@ereko.market
`;

  return { subject: `${copy.emoji} ${copy.headline} — Order ${orderNumber}`, html, text };
}

// ─── Admin New Order Alert ────────────────────────────────────────────────────

export interface AdminNewOrderAlertContext {
  orderNumber: string;
  customerEmail: string;
  customerName: string;
  totalFormatted: string;
  itemCount: number;
  adminOrderUrl: string;
  paymentMethod: string;
}

export function adminNewOrderAlertTemplate(ctx: AdminNewOrderAlertContext): {
  subject: string; html: string; text: string;
} {
  const html = baseLayout(
    `New Order — ${ctx.orderNumber}`,
    `<p class="greeting">🛒 New Order Received!</p>
    <p class="text">A new order has been placed and requires processing.</p>
    <div class="highlight-box">
      <strong>Order:</strong> ${escapeHtml(ctx.orderNumber)}<br/>
      <strong>Customer:</strong> ${escapeHtml(ctx.customerName)} (${escapeHtml(ctx.customerEmail)})<br/>
      <strong>Total:</strong> ${escapeHtml(ctx.totalFormatted)}<br/>
      <strong>Items:</strong> ${ctx.itemCount}<br/>
      <strong>Payment:</strong> ${escapeHtml(ctx.paymentMethod)}
    </div>
    <div style="text-align:center; margin:28px 0;">
      <a href="${escapeHtml(ctx.adminOrderUrl)}" class="btn">View in Admin Panel</a>
    </div>`,
  );

  const text = `New Order Received!

Order: ${ctx.orderNumber}
Customer: ${ctx.customerName} (${ctx.customerEmail})
Total: ${ctx.totalFormatted}
Items: ${ctx.itemCount}
Payment: ${ctx.paymentMethod}

View in admin: ${ctx.adminOrderUrl}

EREKO Admin Notifications
`;

  return { subject: `🛒 New Order: ${ctx.orderNumber} — ${ctx.totalFormatted}`, html, text };
}

// ─── Admin Return/RMA Alert ───────────────────────────────────────────────────

export interface AdminReturnAlertContext {
  orderNumber: string;
  customerEmail: string;
  reason: string;
  refundAmount: string;
  adminOrderUrl: string;
}

export function adminReturnAlertTemplate(ctx: AdminReturnAlertContext): {
  subject: string; html: string; text: string;
} {
  const html = baseLayout(
    `Return Request — ${ctx.orderNumber}`,
    `<p class="greeting">🔄 Return Request Received</p>
    <p class="text">A customer has submitted a return request for order <strong>${escapeHtml(ctx.orderNumber)}</strong>.</p>
    <div class="highlight-box">
      <strong>Order:</strong> ${escapeHtml(ctx.orderNumber)}<br/>
      <strong>Customer:</strong> ${escapeHtml(ctx.customerEmail)}<br/>
      <strong>Reason:</strong> ${escapeHtml(ctx.reason.replace(/_/g, ' '))}<br/>
      <strong>Refund requested:</strong> ${escapeHtml(ctx.refundAmount)}
    </div>
    <div style="text-align:center; margin:28px 0;">
      <a href="${escapeHtml(ctx.adminOrderUrl)}" class="btn">Review Return</a>
    </div>`,
  );

  const text = `Return Request Received

Order: ${ctx.orderNumber}
Customer: ${ctx.customerEmail}
Reason: ${ctx.reason}
Refund: ${ctx.refundAmount}

Review: ${ctx.adminOrderUrl}

EREKO Admin Notifications
`;

  return { subject: `🔄 Return Request: ${ctx.orderNumber}`, html, text };
}
