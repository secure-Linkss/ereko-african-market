import React from 'react';
import { notFound } from 'next/navigation';

// ─── Real Content Map ─────────────────────────────────────────────────────────

const PAGES: Record<string, { title: string; updated: string; sections: { heading: string; body: string }[] }> = {

  terms: {
    title: 'Terms of Service',
    updated: '1 June 2025',
    sections: [
      {
        heading: '1. About Us',
        body: `Ereko African Market is a trading name of Ereko Ltd, a company incorporated in England and Wales. We have been serving the African and Caribbean community in East London and across the United Kingdom since 2010.

Registered address: 5 Broadway, Barking, London, IG11 7LS, United Kingdom
Email: hello@ereko.co.uk
Telephone: 020 3633 7503

By placing an order on our website or visiting our store, you agree to these Terms of Service in full. Please read them carefully before purchasing.`,
      },
      {
        heading: '2. Eligibility',
        body: `You must be at least 18 years of age to place an order on our website. By completing a purchase, you confirm that you are 18 or over and that all information you provide is accurate, current, and complete.`,
      },
      {
        heading: '3. Products and Pricing',
        body: `We take every care to ensure product descriptions, images, and prices are accurate. All prices are displayed in pounds sterling (GBP) and include VAT where applicable, in accordance with UK law.

We reserve the right to amend prices without prior notice. In the unlikely event of a pricing error, we will contact you before processing your order. You are under no obligation to proceed at the corrected price.

Due to the nature of fresh, frozen, and ambient food products, weight and appearance may vary slightly from the images shown. This does not constitute a defect.`,
      },
      {
        heading: '4. Orders and Contract',
        body: `Placing an order constitutes an offer to purchase. A binding contract is formed when we send you an order confirmation email. We reserve the right to refuse or cancel any order, for example where a product is out of stock, a payment has not been authorised, or we suspect fraudulent activity.

For click-and-collect orders, your order will be held at 5 Broadway, Barking, IG11 7LS for up to 5 business days. After this period, uncollected orders may be returned to stock.`,
      },
      {
        heading: '5. Delivery',
        body: `We deliver to UK mainland addresses. Delivery timescales are estimates only and cannot be guaranteed, though we endeavour to meet them.

Standard delivery: 3–5 business days, £3.99 (free on orders over £55)
Express delivery: 1–2 business days (selected areas)
Same-day delivery: Available in selected London postcodes

Cold-chain items (chilled and frozen) are despatched in insulated packaging with ice packs and should be refrigerated or frozen upon receipt. We cannot be held liable for goods spoiled due to your failure to refrigerate them promptly after delivery.

Risk of loss passes to you when goods are delivered to the address you provide.`,
      },
      {
        heading: '6. Returns and Refunds',
        body: `Under the Consumer Contracts Regulations 2013, you have the right to cancel non-perishable orders within 14 days of receipt without giving a reason, and a further 14 days to return the goods.

Perishable goods (fresh produce, chilled, and frozen items) are exempt from the 14-day cancellation right unless they are faulty, damaged, or incorrectly supplied.

To request a return: email hello@ereko.co.uk within 14 days of delivery with your order number and reason for return. We will arrange collection or advise on the returns process.

Refunds are issued to your original payment method within 14 days of receiving the returned goods, or within 14 days of you providing proof of return. We will refund the full product price including the original standard delivery charge for faulty or incorrect items.`,
      },
      {
        heading: '7. Intellectual Property',
        body: `All content on this website — including text, images, logos, product descriptions, and recipes — is the property of Ereko Ltd or used under licence. You may not reproduce, distribute, or commercially exploit any content without our prior written consent.`,
      },
      {
        heading: '8. Limitation of Liability',
        body: `To the maximum extent permitted by law, Ereko Ltd's total liability to you in respect of any claim arising out of or in connection with these terms shall not exceed the total amount paid by you for the relevant order.

Nothing in these terms excludes or limits our liability for death or personal injury caused by negligence, fraud or fraudulent misrepresentation, or any other liability that cannot be excluded by English law.`,
      },
      {
        heading: '9. Governing Law',
        body: `These Terms are governed by the laws of England and Wales. Any disputes shall be subject to the exclusive jurisdiction of the English courts. If you are a consumer in Scotland or Northern Ireland, you retain any rights you have under the applicable law of your territory.`,
      },
      {
        heading: '10. Contact',
        body: `For any questions about these Terms, contact us at:
Email: hello@ereko.co.uk
Phone: 020 3633 7503
Post: Ereko African Market, 5 Broadway, Barking, London, IG11 7LS`,
      },
    ],
  },

  privacy: {
    title: 'Privacy Policy',
    updated: '1 June 2025',
    sections: [
      {
        heading: '1. Who We Are',
        body: `Ereko Ltd (trading as Ereko African Market) is the data controller for personal data collected through our website and in our store at 5 Broadway, Barking, London, IG11 7LS.

We are registered with the Information Commissioner's Office (ICO) as a data controller.

Contact: hello@ereko.co.uk | 020 3633 7503`,
      },
      {
        heading: '2. Data We Collect',
        body: `We collect and process the following categories of personal data:

Identity data: first name, last name
Contact data: email address, telephone number, delivery address, billing address
Transaction data: details of orders placed, products purchased, payment references
Account data: login credentials (passwords are stored in hashed form and never visible to us), order history, loyalty points balance
Technical data: IP address, browser type, device type, pages visited, session duration (collected via cookies)
Marketing data: your preferences for receiving marketing from us`,
      },
      {
        heading: '3. How We Use Your Data',
        body: `We use your personal data to:

Process and fulfil your orders (legal basis: contract performance)
Send order confirmations, dispatch notifications, and delivery updates (contract)
Manage returns, refunds, and complaints (contract / legal obligation)
Prevent fraud and maintain security (legitimate interests)
Send you marketing emails where you have consented or purchased from us and not opted out (legitimate interests / consent)
Comply with our legal obligations including tax and accounting records (legal obligation)
Improve our website and services (legitimate interests)

We do not use your data for automated decision-making that has legal or significant effects.`,
      },
      {
        heading: '4. Who We Share Data With',
        body: `We share your data only where necessary:

Payment processors: Stripe Inc. (card payments) — processes payment data under PCI-DSS compliance
Delivery partners: Royal Mail, DPD, and other couriers — name, address, contact number for delivery
Email service providers: transactional email platforms for order notifications
Analytics: Google Analytics (anonymised, aggregated usage data)
Legal authorities: where required by law or court order

We do not sell your personal data to third parties.`,
      },
      {
        heading: '5. International Transfers',
        body: `Some of our service providers (such as Stripe and Google) may process data outside the UK. Where this occurs, we ensure adequate safeguards are in place (such as UK adequacy decisions or standard contractual clauses) in accordance with UK GDPR Article 46.`,
      },
      {
        heading: '6. Data Retention',
        body: `We retain your personal data for as long as necessary to fulfil the purposes described:

Order records: 7 years (required by HMRC for VAT and tax purposes)
Account data: Duration of account plus 2 years after last activity
Marketing preferences: Until you withdraw consent
Technical/analytics data: 26 months`,
      },
      {
        heading: '7. Your Rights Under UK GDPR',
        body: `You have the right to:
Access your personal data (Subject Access Request)
Correct inaccurate data
Request erasure (the "right to be forgotten") where we have no legal basis to retain it
Restrict or object to processing
Data portability
Withdraw marketing consent at any time

To exercise any of these rights, email hello@ereko.co.uk. We will respond within one calendar month. If you are unsatisfied with our response, you may lodge a complaint with the ICO at ico.org.uk.`,
      },
      {
        heading: '8. Security',
        body: `We implement appropriate technical and organisational measures to protect your data, including SSL/TLS encryption, hashed password storage, access controls, and regular security reviews.`,
      },
      {
        heading: '9. Contact',
        body: `Privacy queries: hello@ereko.co.uk
Ereko African Market, 5 Broadway, Barking, London, IG11 7LS`,
      },
    ],
  },

  cookies: {
    title: 'Cookie Policy',
    updated: '1 June 2025',
    sections: [
      {
        heading: '1. What Are Cookies',
        body: `Cookies are small text files placed on your device when you visit a website. They are widely used to make websites work, improve performance, and provide information to the site owner.

Our website (ereko.market) uses cookies to enable core functionality, remember your preferences, and help us understand how visitors use our site so we can keep improving it.`,
      },
      {
        heading: '2. Cookies We Use',
        body: `Strictly necessary cookies (always active)
These are essential for the website to function. They include session cookies that keep you logged in, cart session cookies, and security tokens. You cannot opt out of these.

Functional cookies
These remember your preferences such as your preferred locale, delivery region, or recently viewed items. Disabling them may affect your experience.

Analytics cookies
We use Google Analytics to understand how visitors interact with our site — which pages are most visited, how long sessions last, and where users drop off. This data is anonymised and aggregated. You can opt out via Google Analytics Opt-out Add-on or by declining analytics cookies in our cookie banner.

Marketing cookies
Where you have consented, we may use cookies to show you relevant adverts on third-party platforms. You can withdraw consent at any time through our cookie settings.`,
      },
      {
        heading: '3. Cookie Durations',
        body: `Session cookies: deleted when you close your browser
Persistent cookies: remain on your device for a fixed period (typically 30 days to 2 years depending on purpose)
Third-party cookies: duration set by the relevant provider (e.g. Google Analytics uses a 2-year cookie)`,
      },
      {
        heading: '4. Managing Cookies',
        body: `You can control cookies through:

Our cookie banner: shown on first visit — accept, reject, or customise preferences
Browser settings: most browsers allow you to view, delete, and block cookies. See your browser's help guide for instructions (Chrome, Firefox, Safari, Edge all support this)
Third-party opt-outs: Google Analytics — tools.google.com/dlpage/gaoptout

Please note: disabling all cookies may break certain features, including checkout and account login.`,
      },
      {
        heading: '5. Contact',
        body: `Questions about our use of cookies: hello@ereko.co.uk`,
      },
    ],
  },

  'food-safety': {
    title: 'Food Safety',
    updated: '1 June 2025',
    sections: [
      {
        heading: '1. Our Commitment',
        body: `Ereko African Market has been handling and supplying authentic African and Caribbean food products since 2010. Food safety is fundamental to everything we do. We comply fully with UK food safety legislation, including the Food Safety Act 1990, Food Hygiene Regulations 2006, and the Food Information Regulations 2014 (FIR).

Our in-store operations are registered with and inspected by the London Borough of Barking and Dagenham Environmental Health department.`,
      },
      {
        heading: '2. Allergen Information',
        body: `Under UK law (FIR 2014), we are required to provide information on the 14 major allergens. These are:

Cereals containing gluten (wheat, rye, barley, oats), Crustaceans, Eggs, Fish, Peanuts, Soybeans, Milk, Nuts (almonds, hazelnuts, walnuts, cashews, pecan, Brazil nuts, pistachio, macadamia), Celery, Mustard, Sesame, Sulphur dioxide and sulphites, Lupin, Molluscs.

Allergen information for products sold online is listed on each product page where available. For pre-packaged products, allergen information is printed on the label by the manufacturer.

Important: many African food products are produced in facilities that also handle common allergens such as peanuts, nuts, sesame, and cereals. If you have a severe allergy, please contact us before purchasing: hello@ereko.co.uk or 020 3633 7503.`,
      },
      {
        heading: '3. Cold Chain and Temperature Control',
        body: `Chilled products are stored at 0–5°C and frozen products at -18°C or below throughout their time at our warehouse. We use insulated packaging with gel ice packs for all chilled and frozen online deliveries, designed to maintain safe temperatures for up to 24 hours in typical UK conditions.

Upon receiving your delivery:
Chilled items: refrigerate immediately at 0–5°C
Frozen items: place in the freezer immediately
Do not refreeze items that have been fully thawed`,
      },
      {
        heading: '4. Dates and Storage',
        body: `We never sell products past their use-by dates. We check best-before and use-by dates as part of our picking and packing process.

Use-by date: must not be consumed after this date — this is a food safety requirement.
Best-before date: indicates peak quality; the product may still be safe to eat after this date but quality may have declined.

Always follow the storage and preparation instructions on the product label.`,
      },
      {
        heading: '5. Importing and Sourcing',
        body: `All food products we import and sell comply with UK and EU food safety standards and have been cleared through the appropriate UK Border Force and Food Standards Agency (FSA) channels. We source directly from trusted suppliers across West Africa, East Africa, and the Caribbean diaspora supply chain in the UK.

We do not import any products subject to UK import bans or restrictions.`,
      },
      {
        heading: '6. Reporting a Food Safety Concern',
        body: `If you have any concerns about a product you have received — including incorrect labelling, signs of spoilage, foreign objects, or any food safety issue — please contact us immediately:

Email: hello@ereko.co.uk
Phone: 020 3633 7503
Do not consume the product. We take all food safety concerns extremely seriously and will respond within 24 hours on business days.

You can also report concerns directly to the Food Standards Agency: food.gov.uk`,
      },
    ],
  },

  accessibility: {
    title: 'Accessibility Statement',
    updated: '1 June 2025',
    sections: [
      {
        heading: '1. Our Commitment',
        body: `Ereko African Market is committed to making our website accessible to all users, including people with disabilities. We aim to meet the Web Content Accessibility Guidelines (WCAG) 2.1 Level AA standard.

We believe everyone deserves equal access to authentic African and Caribbean groceries and the services we offer, regardless of ability or the assistive technologies they use.`,
      },
      {
        heading: '2. Measures We Have Taken',
        body: `We have implemented the following accessibility measures:

Keyboard navigation: all interactive elements (buttons, links, forms, menus) can be accessed and operated using a keyboard alone.
Screen reader support: we use semantic HTML, ARIA labels, and descriptive alt text on images to support screen readers such as NVDA, JAWS, and VoiceOver.
Colour contrast: text and interactive elements meet WCAG 2.1 AA contrast ratios.
Responsive design: the website is fully usable across desktop, tablet, and mobile devices.
Font scaling: the site respects browser font size preferences and supports zooming up to 200% without loss of content or function.
Focus indicators: visible focus rings are present on all interactive elements.
Skip navigation: a skip-to-main-content link is available for keyboard users.`,
      },
      {
        heading: '3. Known Limitations',
        body: `We are continuously working to improve. Known areas we are addressing:

Some older embedded third-party content (such as maps or payment widgets) may not fully meet WCAG 2.1 AA. We work with our providers to resolve these where possible.
PDF documents linked from the site (such as product data sheets) may not be fully accessible. We are reviewing these.`,
      },
      {
        heading: '4. Assistive Technology Compatibility',
        body: `Our website is designed to be compatible with the following assistive technologies:

Screen readers: NVDA, JAWS, VoiceOver (iOS/macOS), TalkBack (Android)
Browsers: Chrome, Firefox, Safari, Edge (latest two versions)
Voice input: Dragon NaturallySpeaking and native browser voice control
Zoom tools: browser zoom and Windows Magnifier`,
      },
      {
        heading: '5. Feedback and Contact',
        body: `If you encounter any accessibility barrier on our website, or if you need content in an alternative format (such as large print, audio, or BSL), please contact us:

Email: hello@ereko.co.uk
Phone: 020 3633 7503
In person: 5 Broadway, Barking, London, IG11 7LS

We aim to respond to all accessibility queries within 5 working days.

If you are not satisfied with our response, you can contact the Equality and Human Rights Commission (EHRC) via equalityhumanrights.com or the Equality Advisory Support Service on 0808 800 0082.`,
      },
    ],
  },

};

// Modern Slavery → 404 (page removed)

// ─── Component ────────────────────────────────────────────────────────────────

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string; locale: string }>;
}) {
  const { slug } = await params;

  const page = PAGES[slug];
  if (!page) notFound();

  return (
    <main className="flex-1 max-w-3xl mx-auto w-full px-4 md:px-8 py-12 md:py-20">
      <div className="space-y-10">
        {/* Header */}
        <div className="border-b border-border pb-8">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-3">
            Legal
          </p>
          <h1 className="text-4xl md:text-5xl font-black tracking-tight text-foreground mb-4">
            {page.title}
          </h1>
          <p className="text-sm text-muted-foreground">
            Last updated: {page.updated}
          </p>
        </div>

        {/* Sections */}
        <div className="space-y-10">
          {page.sections.map((section) => (
            <section key={section.heading} className="space-y-4">
              <h2 className="text-xl font-bold text-foreground">
                {section.heading}
              </h2>
              <div className="text-sm text-muted-foreground leading-relaxed space-y-3">
                {section.body.split('\n\n').map((para, i) => (
                  <p key={i} className="whitespace-pre-line">
                    {para}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Footer CTA */}
        <div className="border-t border-border pt-8 text-sm text-muted-foreground space-y-1">
          <p className="font-semibold text-foreground">Ereko African Market</p>
          <p>5 Broadway, Barking, London, IG11 7LS</p>
          <p>
            <a href="mailto:hello@ereko.co.uk" className="text-primary hover:underline">
              hello@ereko.co.uk
            </a>{' '}
            ·{' '}
            <a href="tel:02036337503" className="text-primary hover:underline">
              020 3633 7503
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}

