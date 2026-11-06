"""Preserve source art; trim transparent margins and pack small runtime textures."""
from pathlib import Path
from PIL import Image
import json

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'public/assets'

def build_pens():
    entries = []
    for kind in ['chicken', 'goat', 'pig', 'cow']:
        source = BASE / f'buildings/pens/{kind}-v1.png'
        image = Image.open(source).convert('RGBA')
        assert image.getchannel('A').getextrema()[0] == 0, 'Asset must be transparent'
        bounds = image.getchannel('A').point(lambda a: 255 if a > 30 else 0).getbbox()
        image = image.crop(bounds)
        image.thumbnail((384, 320), Image.Resampling.LANCZOS)
        target = source.with_suffix('.webp')
        image.save(target, 'WEBP', quality=87, method=6)
        entries.append(dict(file=str(target.relative_to(BASE)).replace('\\', '/'), width=image.width, height=image.height, bytes=target.stat().st_size))
    return entries

if __name__ == '__main__':
    entries = build_pens()
    path = BASE / 'manifest.json'
    old = json.loads(path.read_text())
    path.write_text(json.dumps([e for e in old if not e['file'].startswith('buildings/pens/')] + entries, indent=2))
    print(entries)
