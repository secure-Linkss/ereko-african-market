# EREKO African Market — Gemini Image Editing Prompt

## YOUR ROLE
You are an e-commerce image editor for EREKO African Market. Edit product images only. Do not touch code files.

**Only work in:** `product-images/raw/` (input) → `product-images/edited/` (output)

---

## BRAND IDENTITY
- Primary: #2D6A2D (forest green)
- Accent: #E85D04 (vibrant orange)
- Logo: `EREKO_NEW/public/logo.jpeg` — circular badge, "EREKO AFRICAN MARKET" text with African market illustration

---

## IMAGE EDITING — 4 STEPS PER IMAGE

### Step 1 — Remove background
- Remove ALL background: no Amazon UI, no watermarks, no price stickers, no shelves
- Keep ONLY the product packaging (bottle, bag, tin, can, box)
- Preserve all brand colours, logos, and text on the packaging

### Step 2 — White background
- Pure white (#FFFFFF) background, 800×800px square
- Product centred, occupying 70–80% of frame
- Subtle drop shadow: 20px blur, 8px Y offset, 12% opacity, black
- Slight vignette around edges for premium feel

### Step 3 — Luxury polish
- Increase contrast and vibrancy slightly (approx +10%) so packaging colours pop
- Add a very soft inner glow on the product edges against the white background
- Do NOT alter product text, logos, or brand colours — only enhance clarity

### Step 4 — EREKO watermark
- Place the circular EREKO logo (from `EREKO_NEW/public/logo.jpeg`) at bottom-right corner
- Size: 52×52px, circular crop, 2px white border
- Opacity: 70%
- 12px margin from bottom and right edges

---

## OUTPUT SPECS
- Format: JPEG, quality 92%
- Size: 800×800px
- Save to: `product-images/edited/` — same filename as input
- Update `product-images/edited/metadata.json` with alt text for each image

---

## FILES TO PROCESS

| Filename | Product | Brand | Notes |
|----------|---------|-------|-------|
| `nigerian_coca_cola.jpg` | Coca-Cola 35cl Glass Bottle | Coca-Cola | Classic glass bottle, Nigerian variant |
| `golden_penny_semolina.jpg` | Semolina Fine 1kg | Golden Penny | White/yellow packaging |
| `fresh_plantain.jpg` | Fresh Unripe Plantain | N/A | Green plantain, natural product |
| `indomie_onion_chicken.jpg` | Instant Noodles Onion Chicken | Indomie | Different variant to indomie_chicken.jpg |
| `caprice_rice_10kg.jpg` | Long Grain Parboiled Rice 10kg | Caprice | Large rice bag |
| `honeywell_pounded_yam.jpg` | Pounded Yam Flour 1.5kg | Honeywell | Blue/green Honeywell packaging — NOT Olu Olu |
| `poundo_yam_generic.jpg` | Poundo Yam Flour 1kg | Generic/Trocadero | Plain packaging |
| `dried_ponmo.jpg` | Dried Ponmo (Cow Skin) | N/A | Hard yellowish-brown pieces |
| `canned_snail.jpg` | Giant African Snail (Canned) | Fortune/Ocean Deep | Tin can |
| `guinness_nigerian_33cl.jpg` | Nigerian Guinness Stout 33cl | Guinness Nigeria | Small brown glass bottle, black label |
| `guinness_nigerian_60cl.jpg` | Nigerian Guinness Stout 60cl | Guinness Nigeria | Large brown glass bottle |
| `bitter_cola.jpg` | Bitter Cola (Garcinia Kola) | N/A | Brown oval seeds/nuts in pack |
| `mortar_pestle.jpg` | Wooden Mortar & Pestle | N/A | African-style wooden set |
| `nkulenu_palm_wine.jpg` | Nkulenu's Palm Wine | Nkulenu's | Glass bottle, white/green label |

**Already processed in previous batch — re-process if quality can be improved:**

| Filename | Product |
|----------|---------|
| `oluolu_pounded_yam.jpg` | Olu Olu Pounded Yam 2kg |
| `indomie_chicken.jpg` | Indomie Chicken Noodles |
| `malta_guinness.jpg` | Malta Guinness 33cl |
| `palm_oil_red.jpg` | Red Palm Oil 1L |
| `ground_egusi.jpg` | Ground Egusi 500g |
| `dried_stockfish.jpg` | Dried Stockfish Fillet 500g |
| `basmati_rice_5kg.jpg` | Basmati Rice 5kg |
| `milo_tin.jpg` | Milo 400g Tin |
| `frozen_plantain.jpg` | Frozen Ripe Plantain 500g |
| `fufu_cassava.jpg` | Cassava Fufu 1kg |
| `amala_yam_flour.jpg` | Amala Yam Flour 1kg |
| `titus_sardines.jpg` | Titus Sardines 125g |
| `maggi_naija.jpg` | Maggi Naija Pot Seasoning |
| `cameroon_pepper.jpg` | Cameroon Pepper 100g |
| `nigerian_fanta.jpg` | Nigerian Fanta Orange 35cl |
| `golden_penny_semovita.jpg` | Golden Penny Semovita 1kg |

---

## IMPORTANT RULES
1. Edit images ONLY — do not create, modify, or delete any code files
2. Honeywell pounded yam must show Honeywell brand packaging (blue/green), never Olu Olu orange
3. If source image quality is too low to remove background cleanly, note it and do best effort
4. Natural products (plantain, ponmo) — use best-quality food photography background removal

---

## metadata.json FORMAT

After all edits, update `product-images/edited/metadata.json`:

```json
{
  "generated": "ISO-date-here",
  "watermark_version": "ereko-logo-v2",
  "images": [
    {
      "filename": "example.jpg",
      "product_name": "Product Name",
      "brand": "Brand Name",
      "alt_text": "SEO-friendly descriptive alt text",
      "category": "Category name",
      "watermark_position": "bottom-right",
      "dimensions": "800x800"
    }
  ]
}
```
