"""Pack six AI-authored growth/fruit poses per species. Preserve uniform scale and foot alignment."""
from PIL import Image

SPECIES=['apple','pear','cherry','orange','lemon','peach','mango','avocado','cocoa']
def build_orchard(base, species_list=None):
    entries=[]
    for species in (SPECIES if species_list is None else species_list):
        folder=base/'trees/orchard'/species
        source=Image.open(folder/('source-v2.png' if (folder/'source-v2.png').exists() else 'source-v1.png')).convert('RGBA')
        parts=[]
        for i in range(6):
            col,row=i%3,i//3
            part=source.crop((round(col*source.width/3),round(row*source.height/2),round((col+1)*source.width/3),round((row+1)*source.height/2)))
            bounds=part.getchannel('A').point(lambda a:255 if a>40 else 0).getbbox()
            if not bounds: raise ValueError(f'Empty frame {species} {i}')
            parts.append(part.crop(bounds))
        scale=min(180/max(p.width for p in parts),178/max(p.height for p in parts))
        atlas=Image.new('RGBA',(576,384))
        for i,part in enumerate(parts):
            part=part.resize((max(1,round(part.width*scale)),max(1,round(part.height*scale))),Image.Resampling.LANCZOS)
            atlas.alpha_composite(part,(i%3*192+(192-part.width)//2,i//3*192+184-part.height))
        target=folder/'stages-v1.webp';atlas.save(target,'WEBP',quality=89,method=6)
        portrait=parts[5].copy();portrait.thumbnail((144,144),Image.Resampling.LANCZOS)
        preview=folder/'portrait-v1.webp';portrait.save(preview,'WEBP',quality=88,method=6)
        for path,size in [(target,atlas.size),(preview,portrait.size)]:entries.append(dict(file=path.relative_to(base).as_posix(),width=size[0],height=size[1],bytes=path.stat().st_size))
    return entries

if __name__=='__main__':
    from pathlib import Path
    import json
    base=Path(__file__).resolve().parents[2]/'public/assets'
    entries=build_orchard(base)
    path=base/'manifest.json'
    old=json.loads(path.read_text(encoding='utf8'))
    path.write_text(json.dumps([e for e in old if not e['file'].startswith('trees/orchard/')]+entries,indent=2),encoding='utf8')
    print(f"Orchard: {sum(e['bytes'] for e in entries)/1024:.1f} KiB, {len(entries)} textures")
