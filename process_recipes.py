"""
EREKO Recipe Image Processor
Downloads 24 West African recipe images from Unsplash, adds EREKO logo
watermark at bottom-right (70% opacity), saves to EREKO_NEW/public/recipes/.
Then updates seed-recipes.ts with local paths and re-seeds the DB.
"""

import os
import re
import subprocess
import urllib.request
from pathlib import Path

try:
    from PIL import Image, ImageEnhance
except ImportError:
    print("Installing Pillow...")
    subprocess.run(["pip", "install", "Pillow"], check=True)
    from PIL import Image, ImageEnhance

# ── Paths ─────────────────────────────────────────────────────────────────────
ROOT = Path(__file__).parent
SEED_FILE = ROOT / "backend" / "prisma" / "seed-recipes.ts"
OUTPUT_DIR = ROOT / "EREKO_NEW" / "public" / "recipes"
LOGO_PATH = ROOT / "EREKO_NEW" / "public" / "logo.jpeg"
OUTPUT_SIZE = (1200, 800)

# ── Recipe image mapping ──────────────────────────────────────────────────────
RECIPES = [
    ("classic-party-jollof-rice",      "https://images.unsplash.com/photo-1604329760661-e71dc83f8f26?w=1200&h=800&fit=crop&q=85"),
    ("egusi-soup",                     "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=800&fit=crop&q=85"),
    ("suya-grilled-beef-skewers",      "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=1200&h=800&fit=crop&q=85"),
    ("fried-plantain-dodo",            "https://images.unsplash.com/photo-1511688878353-3a2f5be94cd7?w=1200&h=800&fit=crop&q=85"),
    ("groundnut-peanut-soup",          "https://images.unsplash.com/photo-1518779578993-ec3579fee39f?w=1200&h=800&fit=crop&q=85"),
    ("efo-riro-nigerian-spinach-stew", "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=800&fit=crop&q=85"),
    ("ogbono-soup",                    "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=800&fit=crop&q=85"),
    ("moin-moin-steamed-bean-pudding", "https://images.unsplash.com/photo-1562802378-063ec186a863?w=1200&h=800&fit=crop&q=85"),
    ("akara-bean-fritters",            "https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=1200&h=800&fit=crop&q=85"),
    ("banga-soup-palm-fruit",          "https://images.unsplash.com/photo-1564671165093-20688ff1fffa?w=1200&h=800&fit=crop&q=85"),
    ("kelewele-ghanaian-spiced-plantain","https://images.unsplash.com/photo-1536304993881-ff86e0c9e8a6?w=1200&h=800&fit=crop&q=85"),
    ("waakye-rice-and-beans",          "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=1200&h=800&fit=crop&q=85"),
    ("pepper-soup",                    "https://images.unsplash.com/photo-1588166524941-3bf61a9c41db?w=1200&h=800&fit=crop&q=85"),
    ("ofada-rice-ayamase",             "https://images.unsplash.com/photo-1565299585323-38d6b0865b47?w=1200&h=800&fit=crop&q=85"),
    ("puff-puff",                      "https://images.unsplash.com/photo-1567234669003-dce7a7a88821?w=1200&h=800&fit=crop&q=85"),
    ("nigerian-fried-rice",            "https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=1200&h=800&fit=crop&q=85"),
    ("abacha-african-salad",           "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=1200&h=800&fit=crop&q=85"),
    ("ofe-onugbu-bitter-leaf-soup",    "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=800&fit=crop&q=85"),
    ("jollof-spaghetti",               "https://images.unsplash.com/photo-1567620905732-2d1ec7ab7445?w=1200&h=800&fit=crop&q=85"),
    ("okra-soup",                      "https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=1200&h=800&fit=crop&q=85"),
    # Gemini-added recipes (placeholders — update if Gemini provided different slugs)
    ("ila-alasepo",                    "https://images.unsplash.com/photo-1547592180-85f173990554?w=1200&h=800&fit=crop&q=85"),
    ("yam-porridge-asaro",             "https://images.unsplash.com/photo-1564671165093-20688ff1fffa?w=1200&h=800&fit=crop&q=85"),
    ("traditional-pounded-yam",        "https://images.unsplash.com/photo-1574484284602-d250b73f85f7?w=1200&h=800&fit=crop&q=85"),
    ("banku-grilled-tilapia",          "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=1200&h=800&fit=crop&q=85"),
]


def download_image(url: str, dest: Path) -> bool:
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120 Safari/537.36",
        "Accept": "image/webp,image/apng,image/*,*/*;q=0.8",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=30) as resp:
            data = resp.read()
        dest.write_bytes(data)
        return True
    except Exception as e:
        print(f"  ERROR downloading {url}: {e}")
        return False


def add_watermark(img_path: Path, logo_path: Path, out_path: Path, opacity: float = 0.70):
    base = Image.open(img_path).convert("RGBA").resize(OUTPUT_SIZE, Image.LANCZOS)

    logo = Image.open(logo_path).convert("RGBA")

    # Scale logo to ~12% of image width
    logo_w = int(OUTPUT_SIZE[0] * 0.12)
    ratio = logo_w / logo.width
    logo_h = int(logo.height * ratio)
    logo = logo.resize((logo_w, logo_h), Image.LANCZOS)

    # Apply opacity to logo alpha channel
    r, g, b, a = logo.split()
    a = a.point(lambda x: int(x * opacity))
    logo = Image.merge("RGBA", (r, g, b, a))

    # Position: bottom-right with 18px padding
    pad = 18
    pos = (OUTPUT_SIZE[0] - logo_w - pad, OUTPUT_SIZE[1] - logo_h - pad)

    # Composite
    composite = Image.new("RGBA", OUTPUT_SIZE, (0, 0, 0, 0))
    composite.paste(base, (0, 0))
    composite.paste(logo, pos, mask=logo)

    # Save as high-quality JPEG
    final = composite.convert("RGB")
    final.save(out_path, "JPEG", quality=88, optimize=True)


def update_seed_file(slug_to_path: dict[str, str]):
    content = SEED_FILE.read_text(encoding="utf-8")
    for slug, local_path in slug_to_path.items():
        # Match the heroImage line for this recipe block
        # Pattern: slug appears before heroImage in same recipe object
        pattern = r"(slug:\s*'" + re.escape(slug) + r"',.*?heroImage:\s*')(https?://[^']+)(')"
        replacement = r"\g<1>" + local_path + r"\g<3>"
        content = re.sub(pattern, replacement, content, flags=re.DOTALL)
    SEED_FILE.write_text(content, encoding="utf-8")


def main():
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    print(f"Output dir: {OUTPUT_DIR}")
    print(f"Logo: {LOGO_PATH} ({'exists' if LOGO_PATH.exists() else 'MISSING'})\n")

    slug_to_local = {}
    for slug, url in RECIPES:
        out_path = OUTPUT_DIR / f"{slug}.jpg"
        local_web_path = f"/recipes/{slug}.jpg"

        if out_path.exists():
            print(f"  SKIP (exists): {slug}")
            slug_to_local[slug] = local_web_path
            continue

        print(f"  Downloading: {slug}...")
        tmp_path = OUTPUT_DIR / f"{slug}_raw.jpg"
        ok = download_image(url, tmp_path)
        if not ok:
            print(f"  FAILED: {slug} — keeping Unsplash URL")
            continue

        print(f"  Watermarking: {slug}...")
        try:
            add_watermark(tmp_path, LOGO_PATH, out_path)
            tmp_path.unlink(missing_ok=True)
            slug_to_local[slug] = local_web_path
            print(f"  ✓ {slug}")
        except Exception as e:
            print(f"  Watermark ERROR {slug}: {e}")
            tmp_path.unlink(missing_ok=True)

    print(f"\nUpdating seed-recipes.ts with {len(slug_to_local)} local paths...")
    update_seed_file(slug_to_local)
    print("Seed file updated.")

    print("\nRe-seeding database...")
    result = subprocess.run(
        ["npx", "ts-node", "--project", "tsconfig.json", "prisma/seed-recipes.ts"],
        cwd=ROOT / "backend",
        capture_output=True,
        text=True,
    )
    print(result.stdout)
    if result.returncode != 0:
        print("SEED ERROR:", result.stderr)
    else:
        print("Database re-seeded successfully.")

    print("\nDone! Recipe images are at:")
    for f in sorted(OUTPUT_DIR.glob("*.jpg")):
        print(f"  {f.name}")


if __name__ == "__main__":
    main()
