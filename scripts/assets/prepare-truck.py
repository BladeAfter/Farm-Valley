from pathlib import Path
from PIL import Image

directory = Path("public/assets/vehicles/delivery-truck")
image = Image.open(directory / "source-v2.png").convert("RGBA")
for name, bounds in [("out", (0, 0, image.width // 2, image.height)), ("in", (image.width // 2, 0, image.width, image.height))]:
    sprite = image.crop(bounds)
    sprite = sprite.crop(sprite.getbbox())
    sprite.thumbnail((256, 256))
    sprite.save(directory / (name + "-v1.webp"), "WEBP", quality=88, method=6)
