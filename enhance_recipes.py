import os
import random
from PIL import Image, ImageEnhance, ImageFilter, ImageDraw, ImageMath, ImageChops

RECIPE_DIR = r"C:\Users\User\Desktop\Projects\EREKO_NEW\EREKO_NEW\public\recipes"

def add_warmth(img):
    # Split into bands
    r, g, b = img.split()
    
    # Increase Red and Green slightly, decrease Blue slightly for an amber/warm tone
    # using point operations
    r = r.point(lambda i: min(255, int(i * 1.08)))
    g = g.point(lambda i: min(255, int(i * 1.02)))
    b = b.point(lambda i: int(i * 0.92))
    
    return Image.merge('RGB', (r, g, b))

def create_vignette(size):
    # Create a vignette image
    width, height = size
    vignette = Image.new('L', size, 255)
    draw = ImageDraw.Draw(vignette)
    
    # Draw an ellipse that covers the image
    draw.ellipse((width * -0.2, height * -0.2, width * 1.2, height * 1.2), fill=0)
    
    # Blur it heavily
    vignette = vignette.filter(ImageFilter.GaussianBlur(radius=min(width, height) * 0.2))
    
    return vignette

def add_film_grain(img, intensity=0.15):
    # Create random noise
    width, height = img.size
    noise = Image.new('L', img.size)
    
    # Fast noise generation
    noise_data = [random.randint(0, 255) for _ in range(width * height)]
    noise.putdata(noise_data)
    
    # Soften noise
    noise = noise.filter(ImageFilter.GaussianBlur(radius=1))
    
    # Convert noise to RGB
    noise_rgb = Image.merge('RGB', (noise, noise, noise))
    
    # Blend noise using simple blend for film grain
    return Image.blend(img, noise_rgb, alpha=intensity)

def process_image(filepath):
    print(f"Enhancing {os.path.basename(filepath)}...")
    img = Image.open(filepath).convert('RGB')
    
    # 1. Boost Vibrancy / Color
    enhancer_color = ImageEnhance.Color(img)
    img = enhancer_color.enhance(1.4) # Richer colors
    
    # 2. Boost Contrast slightly
    enhancer_contrast = ImageEnhance.Contrast(img)
    img = enhancer_contrast.enhance(1.1)
    
    # 3. Add Warmth (Amber/Green palette matching EREKO)
    img = add_warmth(img)
    
    # 4. Vignette
    vig_mask = create_vignette(img.size)
    vig_dark = Image.new('RGB', img.size, (10, 10, 0)) # Very dark warm brown
    # Composite the dark layer over the image using the vignette mask
    img = Image.composite(vig_dark, img, vig_mask)
    
    # 5. Film Grain (10-15% opacity)
    img = add_film_grain(img, intensity=0.12)
    
    # Save back
    img.save(filepath, "JPEG", quality=95)

def main():
    if not os.path.exists(RECIPE_DIR):
        print(f"Directory {RECIPE_DIR} not found.")
        return
        
    for filename in os.listdir(RECIPE_DIR):
        if filename.lower().endswith('.jpg') or filename.lower().endswith('.jpeg'):
            filepath = os.path.join(RECIPE_DIR, filename)
            try:
                process_image(filepath)
            except Exception as e:
                print(f"Failed to process {filename}: {e}")
                
    print("All recipe images have been enhanced successfully!")

if __name__ == "__main__":
    main()
