"""Normalize the complete cow poses into a foot-aligned animation atlas."""
from pathlib import Path
from PIL import Image
import json

NAMES = ["idle", "blink", "walk-left", "walk-right", "eat", "chew", "rest", "tail"]

def build(assets):
    source = Image.open(assets / "animals/cow/animation-v4.png").convert("RGBA")
    frames = []
    rectangles = []
    for i, name in enumerate(NAMES):
        col, row = i % 4, i // 4
        rect = (col * source.width // 4, row * source.height // 2,
                (col + 1) * source.width // 4, (row + 1) * source.height // 2)
        cell = source.crop(rect)
        bbox = cell.getchannel("A").point(lambda a: 255 if a > 125 else 0).getbbox()
        if not bbox:
            raise ValueError(f"Missing complete cow pose: {name}")
        frames.append(cell.crop(bbox))
        rectangles.append({"name": name, "sourceCell": rect, "contentBounds": bbox})

    # One scale for every pose preserves anatomy during animation. Only the
    # registration point changes: the lowest hoof/belly is aligned to y=184.
    scale = min(230 / max(im.width for im in frames),
                170 / max(im.height for im in frames))
    atlas = Image.new("RGBA", (1024, 384))
    for i, im in enumerate(frames):
        resized = im.resize((round(im.width * scale), round(im.height * scale)), Image.Resampling.LANCZOS)
        x = (i % 4) * 256 + (256 - resized.width) // 2
        y = (i // 4) * 192 + 184 - resized.height
        atlas.alpha_composite(resized, (x, y))
    target = assets / "animals/cow/animation-v4.webp"
    atlas.save(target, "WEBP", quality=91, method=6)

    # UI portrait comes from the same new character, not the obsolete rig.
    portrait = source.crop((247, 48, 435, 221))
    portrait.thumbnail((128, 128), Image.Resampling.LANCZOS)
    portrait_path = assets / "animals/cow/portrait-v4.webp"
    portrait.save(portrait_path, "WEBP", quality=91, method=6)
    (assets / "animals/cow/animation-v4.json").write_text(json.dumps({
        "frameWidth": 256, "frameHeight": 192, "footY": 184,
        "scale": scale, "frames": rectangles
    }, indent=2), encoding="utf8")
    return [
        {"file": "animals/cow/animation-v4.webp", "width": 1024, "height": 384, "bytes": target.stat().st_size},
        {"file": "animals/cow/portrait-v4.webp", "width": portrait.width, "height": portrait.height, "bytes": portrait_path.stat().st_size}
    ]

if __name__ == "__main__":
    assets = Path(__file__).resolve().parents[2] / "public/assets"
    entries = build(assets)
    path = assets / "manifest.json"
    manifest = json.loads(path.read_text(encoding="utf8")) if path.exists() else []
    manifest = [entry for entry in manifest if not entry["file"].startswith("animals/cow/")]
    path.write_text(json.dumps(manifest + entries, indent=2), encoding="utf8")
    print(f"8 whole-cow frames aligned at the feet; {sum(e['bytes'] for e in entries)/1024:.1f} KiB.")

