"""Build optimized runtime textures from original AI artwork; never overwrite source PNGs."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[2]
ASSETS = ROOT / "public/assets"
manifest = []

def pack(source, target, edge, trim=True):
    im = Image.open(ASSETS / source).convert("RGBA")
    if trim:
        bbox = im.getchannel("A").point(lambda a: 255 if a > 100 else 0).getbbox()
        if bbox:
            im = im.crop(bbox)
    im.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    im.save(ASSETS / target, "WEBP", quality=88, method=6)
    manifest.append({"file": target, "width": im.width, "height": im.height, "bytes": (ASSETS / target).stat().st_size})

for source, target, edge in [
    ("terrain/walls/fieldstone-v1.png", "terrain/walls/fieldstone-v1.webp", 512),
    ("terrain/grass-v3.png", "terrain/grass-v3.webp", 512),
    ("terrain/soil-v1.png", "terrain/soil-v1.webp", 384),
    ("terrain/dirt-v2.png", "terrain/dirt-v2.webp", 384),
    ("trees/oak-v2.png", "trees/oak-v2.webp", 384),
    ("trees/apple-v2.png", "trees/apple-v2.webp", 320),
    ("buildings/barn/barn-v2.png", "buildings/barn/barn-v2.webp", 512),
    ("buildings/silo/silo-v2.png", "buildings/silo/silo-v2.webp", 320),
    ("buildings/barn/stage-1-v1.png", "buildings/barn/stage-1-v1.webp", 320),
    ("buildings/barn/stage-2-v1.png", "buildings/barn/stage-2-v1.webp", 384),
    ("buildings/silo/stage-1-v1.png", "buildings/silo/stage-1-v1.webp", 256),
    ("buildings/silo/stage-2-v1.png", "buildings/silo/stage-2-v1.webp", 320),
    ("buildings/farmhouse/house-v3.png", "buildings/farmhouse/house-v3.webp", 512),
    ("decorations/flowers-v2.png", "decorations/flowers-v2.webp", 192),
    ("crops/wheat/ready-v2.png", "crops/wheat/ready-v2.webp", 144),
    ("crops/corn/ready-v2.png", "crops/corn/ready-v2.webp", 160),
]:
    pack(source, target, edge, not source.startswith("terrain/"))

growth = Image.open(ASSETS / "crops/wheat/growth-v2.png").convert("RGBA")
for i, name in enumerate(["sprout", "growing"]):
    part = growth.crop((i * growth.width // 2, 0, (i + 1) * growth.width // 2, growth.height))
    bbox = part.getchannel("A").point(lambda a: 255 if a > 100 else 0).getbbox()
    if not bbox:
        raise RuntimeError("Empty wheat growth stage")
    part = part.crop(bbox)
    part.thumbnail((128, 128), Image.Resampling.LANCZOS)
    dest = ASSETS / f"crops/wheat/{name}-v2.webp"
    part.save(dest, "WEBP", quality=88, method=6)
    manifest.append({"file": str(dest.relative_to(ASSETS)).replace(chr(92), "/"), "width": part.width, "height": part.height, "bytes": dest.stat().st_size})

from prepare_cow import build as build_cow
manifest.extend(build_cow(ASSETS))
from prepare_chicken import build as build_chicken
manifest.extend(build_chicken(ASSETS))
from prepare_pasture import build as build_pasture
manifest.extend(build_pasture(ASSETS))
from prepare_pens import build_pens
manifest.extend(build_pens())
from prepare_obstacles import build_obstacles
manifest.extend(build_obstacles(ASSETS))
from prepare_orchard import build_orchard
manifest.extend(build_orchard(ASSETS))
(ASSETS / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf8")
print(f"{len(manifest)} runtime textures, {sum(i['bytes'] for i in manifest) / 1024:.1f} KiB total.")

