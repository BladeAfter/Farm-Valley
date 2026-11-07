"""Encode original generated portraits and map noticeboard for mobile delivery.
No repainting, recoloring or alpha removal: the generated source art is preserved.
"""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[2]
customers = ROOT / "public/assets/ui/customers"
total = 0
for name in ("rosa", "bento", "miguel", "teresa", "pedro"):
    source = customers / f"{name}-source-v1.png"
    image = Image.open(source).convert("RGBA")
    image.thumbnail((256, 256), Image.Resampling.LANCZOS)
    target = customers / f"{name}-v1.webp"
    image.save(target, "WEBP", quality=88, method=6)
    total += target.stat().st_size
board = ROOT / "public/assets/buildings/order-board"
image = Image.open(board / "source-v1.png").convert("RGBA")
image.thumbnail((384, 384), Image.Resampling.LANCZOS)
target = board / "board-v1.webp"
image.save(target, "WEBP", quality=88, method=6)
total += target.stat().st_size
print(f"Six original runtime bitmap assets: {total:,} bytes; Clara uses the original SVG.")
