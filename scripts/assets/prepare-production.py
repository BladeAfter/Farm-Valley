"""Pack original production art. Source PNGs are preserved; runtime textures stay compact."""
from pathlib import Path
from PIL import Image
from prepare_orchard import build_orchard
import json

base = Path(__file__).resolve().parents[2] / 'public/assets'
entries = []
def pack(source, target, edge=320):
    source, target = base/source, base/target
    if not source.exists():
        print('Pending source:', source.name)
        return
    image = Image.open(source).convert('RGBA')
    bounds = image.getchannel('A').point(lambda a: 255 if a > 100 else 0).getbbox()
    if not bounds: raise ValueError(f'Empty source {source}')
    image = image.crop(bounds)
    image.thumbnail((edge, edge), Image.Resampling.LANCZOS)
    image.save(target, 'WEBP', quality=88, method=6)
    entries.append(dict(file=target.relative_to(base).as_posix(), width=image.width, height=image.height, bytes=target.stat().st_size))
for kind in ['feedMill','bakery','dairy','cakery','sugarMill','popcorn','grill','iceCream','juicer']:
    pack(f'buildings/machines/{kind}-source-v1.png',f'buildings/machines/{kind}-v1.webp')
pack('buildings/pens/sheep-v1.png','buildings/pens/sheep-v1.webp',256)
for species in ['strawberry','potato']:
    pack(f'crops/{species}/source-v1.png', f'crops/{species}/ready-v1.webp',144)

source_path=base/'animals/sheep/animation-v1.png'
if source_path.exists():
    source=Image.open(source_path).convert('RGBA')
    parts=[]
    for i in range(8):
        part=source.crop((i%4*source.width//4,i//4*source.height//2,(i%4+1)*source.width//4,(i//4+1)*source.height//2))
        bounds=part.getchannel('A').point(lambda a:255 if a>100 else 0).getbbox()
        if not bounds: raise ValueError(f'Empty sheep frame {i}')
        parts.append(part.crop(bounds))
    scale=min(230/max(p.width for p in parts),170/max(p.height for p in parts))
    atlas=Image.new('RGBA',(1024,384))
    for i,part in enumerate(parts):
        part=part.resize((round(part.width*scale),round(part.height*scale)),Image.Resampling.LANCZOS)
        atlas.alpha_composite(part,(i%4*256+(256-part.width)//2,i//4*192+184-part.height))
    path=base/'animals/sheep/animation-v1.webp';atlas.save(path,'WEBP',quality=89,method=6)
    portrait=parts[0].copy();portrait.thumbnail((144,144),Image.Resampling.LANCZOS)
    portrait_path=base/'animals/sheep/portrait-v1.webp';portrait.save(portrait_path,'WEBP',quality=88,method=6)
    for path in [path,portrait_path]:
        image=Image.open(path);entries.append(dict(file=path.relative_to(base).as_posix(),width=image.width,height=image.height,bytes=path.stat().st_size))
if (base/'trees/orchard/cocoa/source-v1.png').exists():
    entries.extend(build_orchard(base,['cocoa']))
manifest_path=base/'manifest.json'
manifest=json.loads(manifest_path.read_text(encoding='utf8'))
files={e['file'] for e in entries}
manifest_path.write_text(json.dumps([e for e in manifest if e['file'] not in files]+entries,indent=2),encoding='utf8')
print(f'Packed {len(entries)} production textures: {sum(e["bytes"] for e in entries)/1024:.1f} KiB')
