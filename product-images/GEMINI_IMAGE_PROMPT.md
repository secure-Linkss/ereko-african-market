# EREKO Market — Gemini Product Image Editing Prompt

## YOUR ROLE
You are an e-commerce image editor working for EREKO Market, an African food store.
You ONLY edit images. You do NOT touch any code files, config files, or any file outside the `product-images/` folder.

## WHAT YOU MUST NOT DO
- Do NOT edit, create, or delete any `.tsx`, `.ts`, `.json`, `.css`, `.md` files
- Do NOT modify anything in `EREKO_NEW/src/`, `backend/`, or any code directory
- Do NOT change any page layouts, components, or styles
- ONLY work inside: `product-images/raw/` (input) and `product-images/edited/` (output)
- ONLY output edited image files to `product-images/edited/`

---

## EREKO BRAND IDENTITY
- Primary colour: #2D6A2D (forest green)
- Accent colour: #E85D04 (vibrant orange)  
- Gold accent: #FFD166
- Logo file: `EREKO_NEW/public/logo.jpeg` — this is a circular badge with "EREKO AFRICAN MARKET" text and an African market scene illustration
- Website: https://ereko-african-market.vercel.app

---

## WATERMARK SPECIFICATION
Every edited image must have the EREKO logo watermark applied:
- **Position**: Bottom-right corner, 15px margin from each edge
- **Size**: Logo badge should be exactly 60×60px (circular crop)
- **Opacity**: 75% (slightly transparent, professional look)
- **Border**: 2px white border around the circular badge
- **Optional text**: Small "EREKO" text in white (#FFFFFF), bold, 10px, placed 4px below the badge
- The watermark must be SMALL — never obscure the product packaging itself

---

## IMAGE EDITING TASK

For each file in `product-images/raw/`:

### STEP 1: Extract the product
- Remove the existing background completely (use AI background removal or magic eraser)
- Keep ONLY the product packaging (bag, bottle, tin, can, etc.)
- Remove any Amazon listing UI, watermarks, text boxes, price tags
- Keep all original brand text, colours, logos visible on the packaging

### STEP 2: Apply white background
- Place the extracted product on a pure white (#FFFFFF) background
- Image dimensions: 800×800px square (1:1 ratio)
- Product should occupy 70–80% of the frame
- Centre the product horizontally and vertically
- Add a very subtle drop shadow (20px blur, 10px offset Y, 10% opacity, #000000) for depth

### STEP 3: Add EREKO watermark
- Apply the circular EREKO logo badge (from `EREKO_NEW/public/logo.jpeg`) to the bottom-right corner
- Specs as described in watermark specification above

### STEP 4: Save output
- Save each edited image to `product-images/edited/` with the SAME filename as the input
- Format: JPEG, quality 90%
- Use descriptive alt text in a companion `product-images/edited/metadata.json` file

---

## FILES TO PROCESS

| Input File | Product Name | Brand | Notes |
|-----------|-------------|-------|-------|
| `oluolu_pounded_yam.jpg` | Pounded Yam Flour 4kg | Olu Olu | Orange packaging, circular badge logo |
| `oluolu_poundo_iyan.jpg` | Poundo Iyan 1.2kg | Olu Olu | Same brand, smaller pack |
| `oluolu_poundo_4kg.jpg` | Poundo Iyan 4kg | Olu Olu | Same brand, larger pack |
| `indomie_chicken.jpg` | Instant Noodles Chicken Flavour | Indomie | Yellow/red pack with noodle bowl imagery |
| `malta_guinness.jpg` | Malta Guinness Malt Drink | Guinness | Dark can with gold lettering |
| `palm_oil_red.jpg` | Red Palm Oil 1L | Various | Amber/orange bottle |
| `ground_egusi.jpg` | Ground Egusi Melon Seeds | Various | Sealed bag, cream-coloured seeds |
| `dried_stockfish.jpg` | Dried Stockfish Fillet | Various | Vacuum-sealed pack |
| `basmati_rice_5kg.jpg` | Basmati Rice 5kg | Various | Large bag with rice grain imagery |
| `milo_tin.jpg` | Milo Chocolate Malt 400g | Nestlé | Iconic green tin |
| `frozen_plantain.jpg` | Frozen Ripe Plantain Slices | Various | Frozen bag with golden plantain visible |
| `fufu_cassava.jpg` | Cassava Fufu Flour 1kg | Olu Olu | Packaging visible |
| `amala_yam_flour.jpg` | Amala Yam Flour 1kg | Various | Dark packaging |
| `titus_sardines.jpg` | Sardines in Oil 125g | Titus | Classic tin, blue/silver |
| `maggi_naija.jpg` | Naija Pot Seasoning | Maggi | Nigerian variant packaging |
| `cameroon_pepper.jpg` | Cameroon Pepper Ground | Various | Spice pack, deep red |
| `nigerian_fanta.jpg` | Fanta Orange 35cl | Fanta | Glass bottle with Nigerian label |
| `golden_penny_semovita.jpg` | Semovita 1kg | Golden Penny | Blue/white/yellow packaging |

---

## QUALITY CHECKLIST (verify for each image before saving)
- [ ] Background is pure white (#FFFFFF)
- [ ] Product packaging clearly visible with original brand colours
- [ ] No Amazon watermarks, price tags, or UI elements remain
- [ ] Product is centred with 70–80% frame coverage
- [ ] Subtle drop shadow applied
- [ ] EREKO logo badge visible in bottom-right at 75% opacity
- [ ] Image is 800×800px
- [ ] Saved as JPEG quality 90% to `product-images/edited/`
- [ ] Filename unchanged from input

---

## OUTPUT: metadata.json
After editing all images, create `product-images/edited/metadata.json`:

```json
{
  "images": [
    {
      "filename": "oluolu_pounded_yam.jpg",
      "alt": "Olu Olu Pound'Ol Iyan Pounded Yam Flour 4kg — premium Nigerian yam flour for authentic pounded yam",
      "product_slug": "oluolu-pounded-yam-flour-2kg"
    }
    // ... one entry per image
  ]
}
```

The `alt` text should be descriptive for SEO and accessibility.

---

## IMPORTANT REMINDERS
1. You are ONLY an image editor in this task
2. Do NOT suggest code changes, API changes, or frontend modifications
3. If you cannot process an image (e.g., too low quality), say so and move to the next
4. Preserve all original brand packaging details — do not alter product colours or text
5. The EREKO watermark should be tasteful and professional, never distracting
