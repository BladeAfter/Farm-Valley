"""Pack original transparent crop artwork. Preserve source PNGs and alpha."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[2] / 'public/assets/crops'
for species in ['carrot', 'soybean', 'sugarcane']:
    source = root / species / 'source-v1.png'
    if not source.exists():
        raise FileNotFoundError(source)
    image = Image.open(source).convert('RGBA')
    bbox = image.getchannel('A').point(lambda a: 255 if a > 100 else 0).getbbox()
    if bbox:
        image = image.crop(bbox)
    image.thumbnail((144, 192), Image.Resampling.LANCZOS)
    target = root / species / 'ready-v2.webp'
    image.save(target, 'WEBP', quality=88, method=6)
    print(species, image.size, target.stat().st_size)
