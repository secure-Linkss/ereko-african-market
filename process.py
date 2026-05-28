import os
import json
from datetime import datetime, timezone
from PIL import Image, ImageDraw, ImageFilter, ImageOps
import rembg
import io

INPUT_DIR = r"C:\Users\User\Desktop\Projects\EREKO_NEW\product-images\raw"
OUTPUT_DIR = r"C:\Users\User\Desktop\Projects\EREKO_NEW\product-images\edited"
LOGO_PATH = r"C:\Users\User\Desktop\Projects\EREKO_NEW\EREKO_NEW\public\logo.jpeg"
METADATA_PATH = os.path.join(OUTPUT_DIR, "metadata.json")

os.makedirs(OUTPUT_DIR, exist_ok=True)

product_info = {
    "oluolu_pounded_yam.jpg": {"name": "Olu Olu Pound'Ol Iyan Pounded Yam Flour", "brand": "Olu Olu", "alt": "Olu Olu Pound'Ol Iyan pounded yam flour 4kg orange packaging \u2014 authentic Nigerian instant yam flour for traditional swallow dishes", "category": "Flour & Swallows"},
    "oluolu_poundo_iyan.jpg": {"name": "Poundo Iyan 1.2kg", "brand": "Olu Olu", "alt": "Olu Olu Poundo Iyan 1.2kg \u2014 authentic Nigerian instant yam flour for traditional swallow dishes", "category": "Flour & Swallows"},
    "oluolu_poundo_4kg.jpg": {"name": "Poundo Iyan 4kg", "brand": "Olu Olu", "alt": "Olu Olu Poundo Iyan 4kg \u2014 authentic Nigerian instant yam flour for traditional swallow dishes", "category": "Flour & Swallows"},
    "indomie_chicken.jpg": {"name": "Instant Noodles Chicken Flavour 70g", "brand": "Indomie", "alt": "Indomie Instant Noodles Chicken Flavour 70g \u2014 classic Nigerian quick meal", "category": "Cupboard Staples"},
    "malta_guinness.jpg": {"name": "Malta Guinness Non-Alcoholic Malt Drink", "brand": "Guinness", "alt": "Malta Guinness Non-Alcoholic Malt Drink \u2014 rich and dark Nigerian malt beverage", "category": "Drinks & Beverages"},
    "palm_oil_red.jpg": {"name": "Premium Red Palm Oil 1L", "brand": "Various", "alt": "Premium Red Palm Oil 1L \u2014 unrefined African cooking oil for authentic dishes", "category": "Palm Oil & Cooking Oils"},
    "ground_egusi.jpg": {"name": "Ground Egusi Melon Seeds 500g", "brand": "Various", "alt": "Ground Egusi Melon Seeds 500g \u2014 essential ingredient for Nigerian Egusi soup", "category": "Cupboard Staples"},
    "dried_stockfish.jpg": {"name": "Dried Stockfish Fillet 500g", "brand": "Various", "alt": "Dried Stockfish Fillet 500g \u2014 premium quality dried fish for African soups and stews", "category": "Dried Fish & Seafood"},
    "basmati_rice_5kg.jpg": {"name": "Basmati Rice 5kg", "brand": "Various", "alt": "Basmati Rice 5kg \u2014 long grain premium rice perfect for Jollof and Fried rice", "category": "Grains & Rice"},
    "milo_tin.jpg": {"name": "Milo Chocolate Malt Drink 400g Tin", "brand": "Nestlé", "alt": "Milo Chocolate Malt Drink 400g Tin \u2014 nutritious energy beverage", "category": "Drinks & Beverages"},
    "frozen_plantain.jpg": {"name": "Frozen Ripe Plantain Slices 500g", "brand": "Various", "alt": "Frozen Ripe Plantain Slices 500g \u2014 ready to fry sweet plantain or dodo", "category": "Frozen"},
    "fufu_cassava.jpg": {"name": "Cassava Fufu Flour 1kg", "brand": "Olu Olu", "alt": "Olu Olu Cassava Fufu Flour 1kg \u2014 smooth and authentic swallow for soups", "category": "Flour & Swallows"},
    "amala_yam_flour.jpg": {"name": "Amala Yam Flour (Dark) 1kg", "brand": "Various", "alt": "Amala Yam Flour (Dark) 1kg \u2014 traditional elubo for authentic Nigerian Amala", "category": "Flour & Swallows"},
    "titus_sardines.jpg": {"name": "Titus Sardines in Oil 125g", "brand": "Titus", "alt": "Titus Sardines in Oil 125g \u2014 premium canned fish from Morocco", "category": "Dried Fish & Seafood"},
    "maggi_naija.jpg": {"name": "Maggi Naija Pot Seasoning 100g", "brand": "Maggi", "alt": "Maggi Naija Pot Seasoning 100g \u2014 authentic Nigerian flavor cubes with bottom pot taste", "category": "Cupboard Staples"},
    "cameroon_pepper.jpg": {"name": "Cameroon Pepper Ground 100g", "brand": "Various", "alt": "Cameroon Pepper Ground 100g \u2014 intense dark roasted hot pepper for African cooking", "category": "Spices & Seasonings"},
    "nigerian_fanta.jpg": {"name": "Nigerian Fanta Orange 35cl Glass Bottle", "brand": "Fanta", "alt": "Nigerian Fanta Orange 35cl Glass Bottle \u2014 classic sweet orange soda", "category": "Drinks & Beverages"},
    "golden_penny_semovita.jpg": {"name": "Golden Penny Semovita 1kg", "brand": "Golden Penny", "alt": "Golden Penny Semovita 1kg \u2014 smooth and premium wheat flour swallow", "category": "Flour & Swallows"}
}

def create_circular_logo(logo_path, size=68):
    logo = Image.open(logo_path).convert("RGBA")
    logo = logo.resize((size, size), Image.Resampling.LANCZOS)
    
    mask = Image.new('L', (size, size), 0)
    draw = ImageDraw.Draw(mask)
    draw.ellipse((0, 0, size, size), fill=255)
    
    circular_logo = Image.new("RGBA", (size, size), (0,0,0,0))
    circular_logo.paste(logo, (0,0), mask=mask)
    
    border_width = 3
    new_size = size + 2 * border_width
    bordered_logo = Image.new("RGBA", (new_size, new_size), (0,0,0,0))
    
    b_draw = ImageDraw.Draw(bordered_logo)
    b_draw.ellipse((0, 0, new_size, new_size), fill=(255, 255, 255, 255))
    
    bordered_logo.paste(circular_logo, (border_width, border_width), mask=circular_logo)
    
    shadow_size = new_size + 20
    shadow_image = Image.new("RGBA", (shadow_size, shadow_size), (0,0,0,0))
    
    s_draw = ImageDraw.Draw(shadow_image)
    shadow_offset_x, shadow_offset_y = 10, 10
    s_draw.ellipse((shadow_offset_x, shadow_offset_y, shadow_offset_x + new_size, shadow_offset_y + new_size), fill=(0, 0, 0, 51))
    
    shadow_image = shadow_image.filter(ImageFilter.GaussianBlur(radius=6))
    
    shadow_image.paste(bordered_logo, (shadow_offset_x, shadow_offset_y), mask=bordered_logo)
    
    alpha = shadow_image.split()[3]
    alpha = alpha.point(lambda p: int(p * 0.8))
    shadow_image.putalpha(alpha)
    
    return shadow_image, new_size, shadow_offset_x, shadow_offset_y

def create_drop_shadow(product_img):
    width, height = product_img.size
    
    shadow_canvas = Image.new("RGBA", (width + 100, height + 100), (0,0,0,0))
    
    alpha = product_img.split()[3]
    silhouette = Image.new("RGBA", product_img.size, (0,0,0,255))
    silhouette.putalpha(alpha)
    
    prim_shadow = Image.new("RGBA", shadow_canvas.size, (0,0,0,0))
    prim_shadow.paste(silhouette, (50 + 4, 50 + 14), mask=silhouette)
    prim_shadow = prim_shadow.filter(ImageFilter.GaussianBlur(radius=28))
    p_alpha = prim_shadow.split()[3]
    p_alpha = p_alpha.point(lambda p: int(p * 0.12))
    prim_shadow.putalpha(p_alpha)
    
    expanded_alpha = alpha.filter(ImageFilter.MaxFilter(5))
    sec_silhouette = Image.new("RGBA", product_img.size, (0,0,0,255))
    sec_silhouette.putalpha(expanded_alpha)
    
    sec_shadow = Image.new("RGBA", shadow_canvas.size, (0,0,0,0))
    sec_shadow.paste(sec_silhouette, (50 + 0, 50 + 3), mask=sec_silhouette)
    sec_shadow = sec_shadow.filter(ImageFilter.GaussianBlur(radius=8))
    s_alpha = sec_shadow.split()[3]
    s_alpha = s_alpha.point(lambda p: int(p * 0.22))
    sec_shadow.putalpha(s_alpha)
    
    shadows = Image.alpha_composite(prim_shadow, sec_shadow)
    
    return shadows, 50

def process_image(filename):
    print(f"Processing {filename}...")
    img_path = os.path.join(INPUT_DIR, filename)
    if not os.path.exists(img_path):
        print(f"Not found: {img_path}")
        return None
    
    with open(img_path, 'rb') as f:
        input_data = f.read()
    
    output_data = rembg.remove(input_data, alpha_matting=True)
    
    product_img = Image.open(io.BytesIO(output_data)).convert("RGBA")
    
    bbox = product_img.getbbox()
    if bbox:
        product_img = product_img.crop(bbox)
        
    canvas = Image.new("RGB", (800, 800), (255, 255, 255))
    
    target_size = 600
    
    w, h = product_img.size
    scale = target_size / max(w, h)
    new_w, new_h = int(w * scale), int(h * scale)
    product_img = product_img.resize((new_w, new_h), Image.Resampling.LANCZOS)
    
    pos_x = (800 - new_w) // 2
    pos_y = 760 - new_h
    
    shadows, offset = create_drop_shadow(product_img)
    
    shadow_pos_x = pos_x - offset
    shadow_pos_y = pos_y - offset
    
    canvas.paste(shadows, (shadow_pos_x, shadow_pos_y), mask=shadows)
    
    canvas.paste(product_img, (pos_x, pos_y), mask=product_img)
    
    watermark, logo_size, shadow_x, shadow_y = create_circular_logo(LOGO_PATH)
    
    wm_pos_x = 800 - 18 - logo_size - shadow_x
    wm_pos_y = 800 - 18 - logo_size - shadow_y
    
    canvas.paste(watermark, (wm_pos_x, wm_pos_y), mask=watermark)
    
    out_path = os.path.join(OUTPUT_DIR, filename)
    canvas.save(out_path, "JPEG", quality=90, optimize=True, subsampling=1)
    
    file_size_kb = os.path.getsize(out_path) // 1024
    
    info = product_info.get(filename, {})
    return {
        "filename": filename,
        "product_name": info.get("name", ""),
        "brand": info.get("brand", ""),
        "alt_text": info.get("alt", ""),
        "category": info.get("category", ""),
        "watermark_position": "bottom-right",
        "dimensions": "800x800",
        "file_size_kb": file_size_kb
    }

def main():
    metadata = {
        "generated": datetime.now(timezone.utc).isoformat(),
        "watermark_version": "ereko-logo-v1",
        "images": []
    }
    
    for filename in product_info.keys():
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
