import os
import json
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFilter, ImageOps, ImageEnhance
import rembg
import io

INPUT_DIR = r"C:\Users\User\Desktop\Projects\EREKO_NEW\product-images\raw"
OUTPUT_DIR = r"C:\Users\User\Desktop\Projects\EREKO_NEW\product-images\edited"
LOGO_PATH = r"C:\Users\User\Desktop\Projects\EREKO_NEW\EREKO_NEW\public\logo.jpeg"
METADATA_PATH = os.path.join(OUTPUT_DIR, "metadata.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

product_info = {
    # 15 from first table
    "nigerian_coca_cola.jpg": {"name": "Coca-Cola 35cl Glass Bottle", "brand": "Coca-Cola", "category": "Drinks & Beverages"},
    "golden_penny_semolina.jpg": {"name": "Semolina Fine 1kg", "brand": "Golden Penny", "category": "Flour & Swallows"},
    "fresh_plantain.jpg": {"name": "Fresh Unripe Plantain", "brand": "N/A", "category": "Fresh Produce"},
    "indomie_onion_chicken.jpg": {"name": "Instant Noodles Onion Chicken", "brand": "Indomie", "category": "Cupboard Staples"},
    "caprice_rice_10kg.jpg": {"name": "Long Grain Parboiled Rice 10kg", "brand": "Caprice", "category": "Grains & Rice"},
    "tastic_rice_5kg.jpg": {"name": "Long Grain Rice 5kg", "brand": "Tastic", "category": "Grains & Rice"},
    "honeywell_pounded_yam.jpg": {"name": "Pounded Yam Flour 1.5kg", "brand": "Honeywell", "category": "Flour & Swallows"},
    "poundo_yam_generic.jpg": {"name": "Poundo Yam Flour 1kg", "brand": "Generic", "category": "Flour & Swallows"},
    "dried_ponmo.jpg": {"name": "Dried Ponmo (Cow Skin)", "brand": "N/A", "category": "Meat & Poultry"},
    "dried_ponmo.webp": {"name": "Dried Ponmo (Cow Skin)", "brand": "N/A", "category": "Meat & Poultry"},
    "canned_snail.jpg": {"name": "Giant African Snail (Canned)", "brand": "Fortune", "category": "Canned Goods"},
    "guinness_nigerian_33cl.jpg": {"name": "Nigerian Guinness Stout 33cl", "brand": "Guinness Nigeria", "category": "Drinks & Beverages"},
    "guinness_nigerian_60cl.jpg": {"name": "Nigerian Guinness Stout 60cl", "brand": "Guinness Nigeria", "category": "Drinks & Beverages"},
    "bitter_cola.jpg": {"name": "Bitter Cola (Garcinia Kola)", "brand": "N/A", "category": "Fresh Produce"},
    "mortar_pestle.jpg": {"name": "Wooden Mortar & Pestle", "brand": "N/A", "category": "Home & Kitchen"},
    "nkulenu_palm_wine.jpg": {"name": "Nkulenu's Palm Wine", "brand": "Nkulenu's", "category": "Drinks & Beverages"},
    # 16 from second table
    "oluolu_pounded_yam.jpg": {"name": "Olu Olu Pounded Yam 2kg", "brand": "Olu Olu", "category": "Flour & Swallows"},
    "oluolu_poundo_iyan.jpg": {"name": "Poundo Iyan 1.2kg", "brand": "Olu Olu", "category": "Flour & Swallows"},
    "oluolu_poundo_4kg.jpg": {"name": "Poundo Iyan 4kg", "brand": "Olu Olu", "category": "Flour & Swallows"},
    "indomie_chicken.jpg": {"name": "Indomie Chicken Noodles", "brand": "Indomie", "category": "Cupboard Staples"},
    "malta_guinness.jpg": {"name": "Malta Guinness 33cl", "brand": "Guinness", "category": "Drinks & Beverages"},
    "palm_oil_red.jpg": {"name": "Red Palm Oil 1L", "brand": "Various", "category": "Palm Oil & Cooking Oils"},
    "ground_egusi.jpg": {"name": "Ground Egusi 500g", "brand": "Various", "category": "Cupboard Staples"},
    "dried_stockfish.jpg": {"name": "Dried Stockfish Fillet 500g", "brand": "Various", "category": "Dried Fish & Seafood"},
    "basmati_rice_5kg.jpg": {"name": "Basmati Rice 5kg", "brand": "Various", "category": "Grains & Rice"},
    "milo_tin.jpg": {"name": "Milo 400g Tin", "brand": "Nestlé", "category": "Drinks & Beverages"},
    "frozen_plantain.jpg": {"name": "Frozen Ripe Plantain 500g", "brand": "Various", "category": "Frozen"},
    "fufu_cassava.jpg": {"name": "Cassava Fufu 1kg", "brand": "Olu Olu", "category": "Flour & Swallows"},
    "amala_yam_flour.jpg": {"name": "Amala Yam Flour 1kg", "brand": "Various", "category": "Flour & Swallows"},
    "titus_sardines.jpg": {"name": "Titus Sardines 125g", "brand": "Titus", "category": "Dried Fish & Seafood"},
    "maggi_naija.jpg": {"name": "Maggi Naija Pot Seasoning", "brand": "Maggi", "category": "Cupboard Staples"},
    "cameroon_pepper.jpg": {"name": "Cameroon Pepper 100g", "brand": "Various", "category": "Spices & Seasonings"},
    "nigerian_fanta.jpg": {"name": "Nigerian Fanta Orange 35cl", "brand": "Fanta", "category": "Drinks & Beverages"},
    "golden_penny_semovita.jpg": {"name": "Golden Penny Semovita 1kg", "brand": "Golden Penny", "category": "Flour & Swallows"}
}

def create_circular_logo(logo_path, size=52, border=2):
    logo = Image.open(logo_path).convert("RGBA")
    logo = logo.resize((size, size), Image.Resampling.LANCZOS)
    
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    circular_logo = Image.new("RGBA", (size, size), (0,0,0,0))
    circular_logo.paste(logo, (0,0), mask=mask)
    
    new_size = size + 2 * border
    bordered_logo = Image.new("RGBA", (new_size, new_size), (0,0,0,0))
    b_draw = ImageDraw.Draw(bordered_logo)
    b_draw.ellipse((0, 0, new_size, new_size), fill=(255, 255, 255, 255))
    bordered_logo.paste(circular_logo, (border, border), mask=circular_logo)
    
    # 70% opacity
    alpha = bordered_logo.split()[3]
    alpha = alpha.point(lambda p: int(p * 0.7))
    bordered_logo.putalpha(alpha)
    
    return bordered_logo, new_size

def create_drop_shadow(product_img):
    width, height = product_img.size
    shadow_canvas = Image.new("RGBA", (width + 100, height + 100), (0,0,0,0))
    
    alpha = product_img.split()[3]
    silhouette = Image.new("RGBA", product_img.size, (0,0,0,255))
    silhouette.putalpha(alpha)
    
    # Shadow: 20px blur, 8px Y offset, 12% opacity
    prim_shadow = Image.new("RGBA", shadow_canvas.size, (0,0,0,0))
    prim_shadow.paste(silhouette, (50 + 0, 50 + 8), mask=silhouette)
    prim_shadow = prim_shadow.filter(ImageFilter.GaussianBlur(radius=20))
    
    p_alpha = prim_shadow.split()[3]
    p_alpha = p_alpha.point(lambda p: int(p * 0.12))
    prim_shadow.putalpha(p_alpha)
    
    return prim_shadow, 50

def apply_luxury_polish(img):
    # +10% contrast/vibrancy
    enhancer_contrast = ImageEnhance.Contrast(img)
    img = enhancer_contrast.enhance(1.10)
    
    enhancer_color = ImageEnhance.Color(img)
    img = enhancer_color.enhance(1.10)
    
    # Soft inner glow (white edge)
    alpha = img.split()[3]
    blurred_alpha = alpha.filter(ImageFilter.GaussianBlur(radius=4))
    
    # The glow mask is where alpha is strong but blurred alpha is weak (inside edge)
    glow_mask = Image.new("L", img.size)
    for y in range(img.size[1]):
        for x in range(img.size[0]):
            a = alpha.getpixel((x, y))
            ba = blurred_alpha.getpixel((x, y))
            glow_intensity = max(0, a - ba)
            glow_mask.putpixel((x, y), int(glow_intensity * 0.5)) # soft glow
            
    glow = Image.new("RGBA", img.size, (255, 255, 255, 0))
    glow.putalpha(glow_mask)
    
    img = Image.alpha_composite(img, glow)
    return img

def process_image(filename):
    print(f"Processing {filename}...")
    img_path = os.path.join(INPUT_DIR, filename)
    
    with open(img_path, 'rb') as f:
        input_data = f.read()
    
    output_data = rembg.remove(input_data, alpha_matting=True)
    product_img = Image.open(io.BytesIO(output_data)).convert("RGBA")
    
    bbox = product_img.getbbox()
    if bbox:
        product_img = product_img.crop(bbox)
        
    # Luxury polish
    product_img = apply_luxury_polish(product_img)
        
    canvas = Image.new("RGB", (800, 800), (255, 255, 255))
    
    # Slight vignette around edges for premium feel
    vignette = Image.new('L', (800, 800), 245)
    v_draw = ImageDraw.Draw(vignette)
    v_draw.ellipse((50, 50, 750, 750), fill=255)
    vignette = vignette.filter(ImageFilter.GaussianBlur(100))
    
    vig_overlay = Image.new("RGB", (800, 800), (240, 240, 240))
    canvas.paste(vig_overlay, mask=ImageOps.invert(vignette))
    
    # Scale product to 70-80% frame (approx 600px max)
    target_size = 600
    w, h = product_img.size
    scale = target_size / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    product_img = product_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    pos_x = (800 - new_w) // 2
    pos_y = (800 - new_h) // 2
    
    shadows, offset = create_drop_shadow(product_img)
    shadow_pos_x = pos_x - offset
    shadow_pos_y = pos_y - offset
    
    canvas.paste(shadows, (shadow_pos_x, shadow_pos_y), mask=shadows)
    canvas.paste(product_img, (pos_x, pos_y), mask=product_img)
    
    watermark, logo_size = create_circular_logo(LOGO_PATH, size=52, border=2)
    wm_pos_x = 800 - 12 - logo_size
    wm_pos_y = 800 - 12 - logo_size
    canvas.paste(watermark, (wm_pos_x, wm_pos_y), mask=watermark)
    
    out_path = os.path.join(OUTPUT_DIR, filename)
    if out_path.endswith('.webp'):
        out_path = out_path.replace('.webp', '.jpg')
        filename = filename.replace('.webp', '.jpg')
        
    canvas.save(out_path, "JPEG", quality=92, optimize=True, subsampling=1)
    
    file_size_kb = os.path.getsize(out_path) // 1024
    
    info = product_info.get(filename, {"name": filename.split('.')[0].replace('_', ' ').title(), "brand": "Various", "category": "Uncategorized"})
    alt = f"{info['brand']} {info['name']}"
    if alt.startswith("N/A "): alt = info['name']
    
    return {
        "filename": filename,
        "product_name": info.get("name", ""),
        "brand": info.get("brand", ""),
        "alt_text": f"{alt} \u2014 authentic African market product",
        "category": info.get("category", ""),
        "watermark_position": "bottom-right",
        "dimensions": "800x800",
        "file_size_kb": file_size_kb
    }

def main():
    metadata = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "watermark_version": "ereko-logo-v2",
        "images": []
    }
    
    files_to_process = [f for f in os.listdir(INPUT_DIR) if f.lower().endswith(('.jpg', '.jpeg', '.webp'))]
    print(f"Found {len(files_to_process)} images to process.")
    
    for filename in files_to_process:
        try:
            res = process_image(filename)
            if res:
                metadata["images"].append(res)
        except Exception as e:
            print(f"Error processing {filename}: {e}")
            
    with open(METADATA_PATH, "w") as f:
        json.dump(metadata, f, indent=2)
        
if __name__ == "__main__":
    main()
