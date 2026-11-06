from pathlib import Path
from PIL import Image

def build_obstacles(base):
    entries=[]
    for kind in ['rock','stump','dead-tree','bush','roots']:
        source=base / f'obstacles/{kind}-v1.png'
        image=Image.open(source).convert('RGBA')
        bounds=image.getchannel('A').point(lambda a:255 if a>30 else 0).getbbox()
        image=image.crop(bounds)
        image.thumbnail((320,320),Image.Resampling.LANCZOS)
        target=source.with_suffix('.webp')
        image.save(target,'WEBP',quality=87,method=6)
        entries.append(dict(file=target.relative_to(base).as_posix(),width=image.width,height=image.height,bytes=target.stat().st_size))
    return entries
