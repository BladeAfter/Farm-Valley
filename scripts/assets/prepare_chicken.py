"""Prepare complete hen poses, registered at the feet like the cow."""
from pathlib import Path
from PIL import Image
import json

NAMES=["idle","blink","walk-left","walk-right","peck","scratch","rest","flap"]
RECTS=[
    [39,65,354,477],[421,65,738,477],[807,65,1125,477],[1190,65,1525,477],
    [21,578,379,951],[391,578,793,951],[801,608,1116,951],[1140,553,1535,961]
]
def build(assets):
    source=Image.open(assets/"animals/chicken/animation-v3.png").convert("RGBA")
    frames=[];metadata=[]
    for name,rect in zip(NAMES,RECTS):
        if not (0<=rect[0]<rect[2]<=source.width and 0<=rect[1]<rect[3]<=source.height):
            raise ValueError(f"Invalid hen rectangle: {name}")
        cell=source.crop(tuple(rect))
        bbox=cell.getchannel("A").point(lambda a:255 if a>125 else 0).getbbox()
        if not bbox:raise ValueError(f"Empty hen frame: {name}")
        frames.append(cell.crop(bbox));metadata.append({"name":name,"sourceRect":rect,"contentBounds":bbox})
    scale=min(172/max(im.width for im in frames),170/max(im.height for im in frames))
    atlas=Image.new("RGBA",(768,384))
    for i,im in enumerate(frames):
        frame=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
        atlas.alpha_composite(frame,((i%4)*192+(192-frame.width)//2,(i//4)*192+184-frame.height))
    dest=assets/"animals/chicken/animation-v3.webp"
    atlas.save(dest,"WEBP",quality=91,method=6)
    portrait=source.crop((196,69,349,260))
    portrait.thumbnail((112,112),Image.Resampling.LANCZOS)
    portrait_path=assets/"animals/chicken/portrait-v3.webp"
    portrait.save(portrait_path,"WEBP",quality=91,method=6)
    (assets/"animals/chicken/animation-v3.json").write_text(json.dumps({
        "frameWidth":192,"frameHeight":192,"footY":184,"displayWidth":36,
        "scale":scale,"frames":metadata
    },indent=2),encoding="utf8")
    return [
      {"file":"animals/chicken/animation-v3.webp","width":768,"height":384,"bytes":dest.stat().st_size},
      {"file":"animals/chicken/portrait-v3.webp","width":portrait.width,"height":portrait.height,"bytes":portrait_path.stat().st_size}
    ]
if __name__=="__main__":
    assets=Path(__file__).resolve().parents[2]/"public/assets"
    entries=build(assets)
    path=assets/"manifest.json"
    manifest=json.loads(path.read_text(encoding="utf8"))
    manifest=[e for e in manifest if not e["file"].startswith("animals/chicken/")]
    path.write_text(json.dumps(manifest+entries,indent=2),encoding="utf8")
    print(f"8 complete hen poses: {sum(e['bytes'] for e in entries)/1024:.1f} KiB.")

