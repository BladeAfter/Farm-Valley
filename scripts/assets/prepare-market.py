from pathlib import Path
from PIL import Image
directory = Path("public/assets/buildings/market")
image = Image.open(directory / "source-v1.png").convert("RGBA")
image = image.crop(image.getbbox())
image.thumbnail((384, 384))
image.save(directory / "stand-v1.webp", "WEBP", quality=88, method=6)
