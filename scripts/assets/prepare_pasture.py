"""Pack complete goat and pig poses with one scale and a shared hoof origin."""
from pathlib import Path
from PIL import Image
import json

KINDS = {
 "goat": {
  "names": ["idle","blink","walk-left","walk-right","graze","chew","rest","alert"],
  "rects": [[30,65,383,478],[417,65,770,478],[794,65,1154,478],[1157,65,1536,478],
            [17,574,393,926],[407,574,790,926],[795,584,1158,922],[1160,520,1536,936]],
  "portrait": [181,72,383,290]
 },
 "pig": {
  "names": ["idle","blink","walk-left","walk-right","eat","forage","rest","ears"],
  "portrait": [220,77,436,292]
 }
}
def build(assets):
    entries=[]
    for kind,config in KINDS.items():
        source=Image.open(assets/f"animals/{kind}/animation-v1.png").convert("RGBA")
        frames=[];metadata=[]
        for i,name in enumerate(config["names"]):
            col,row=i%4,i//4
            rect=config.get("rects",[])[i] if "rects" in config else [col*source.width//4,row*source.height//2,(col+1)*source.width//4,(row+1)*source.height//2]
            if not (0<=rect[0]<rect[2]<=source.width and 0<=rect[1]<rect[3]<=source.height):
                raise ValueError(f"Bad {kind} frame: {name}")
            cell=source.crop(tuple(rect))
            bbox=cell.getchannel("A").point(lambda a:255 if a>125 else 0).getbbox()
            if not bbox:raise ValueError(f"Empty {kind} frame: {name}")
            frames.append(cell.crop(bbox));metadata.append({"name":name,"sourceRect":rect,"contentBounds":bbox})
        scale=min(230/max(im.width for im in frames),170/max(im.height for im in frames))
        atlas=Image.new("RGBA",(1024,384))
        for i,im in enumerate(frames):
            frame=im.resize((round(im.width*scale),round(im.height*scale)),Image.Resampling.LANCZOS)
            atlas.alpha_composite(frame,((i%4)*256+(256-frame.width)//2,(i//4)*192+184-frame.height))
        target=assets/f"animals/{kind}/animation-v1.webp"
        atlas.save(target,"WEBP",quality=90,method=6)
        portrait=source.crop(tuple(config["portrait"]))
        portrait.thumbnail((128,128),Image.Resampling.LANCZOS)
        portrait_path=assets/f"animals/{kind}/portrait-v1.webp"
        portrait.save(portrait_path,"WEBP",quality=90,method=6)
        (assets/f"animals/{kind}/animation-v1.json").write_text(json.dumps({"frameWidth":256,"frameHeight":192,"footY":184,"scale":scale,"frames":metadata},indent=2),encoding="utf8")
        entries.extend([
          {"file":f"animals/{kind}/animation-v1.webp","width":1024,"height":384,"bytes":target.stat().st_size},
          {"file":f"animals/{kind}/portrait-v1.webp","width":portrait.width,"height":portrait.height,"bytes":portrait_path.stat().st_size}
        ])
    return entries
if __name__=="__main__":
    assets=Path(__file__).resolve().parents[2]/"public/assets"
    entries=build(assets)
    path=assets/"manifest.json"
    manifest=json.loads(path.read_text(encoding="utf8"))
    manifest=[e for e in manifest if not e["file"].startswith(("animals/goat/","animals/pig/"))]
    path.write_text(json.dumps(manifest+entries,indent=2),encoding="utf8")
    print(f"16 complete goat/pig poses, {sum(e['bytes'] for e in entries)/1024:.1f} KiB.")

