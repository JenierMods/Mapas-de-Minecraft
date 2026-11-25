"""Convierte assets/logo-jeniermods.png en pixel art para el mural del lobby.
Genera behavior_pack/scripts/logo.js ('#' = verde, '.' = blanco, ' ' = vacío)."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
SIZE = 26
im = Image.open(ROOT / "assets" / "logo-jeniermods.png").convert("RGB")
# Recortar el margen blanco para que el logo ocupe todo el mural
px = im.load()
xs = [x for x in range(im.width) for y in range(im.height) if px[x, y][1] - px[x, y][0] > 40]
ys = [y for x in range(im.width) for y in range(im.height) if px[x, y][1] - px[x, y][0] > 40]
pad = 6
box = (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad)
im = im.crop(box).resize((SIZE, SIZE), Image.LANCZOS)
rows = []
for y in range(SIZE):
    row = ""
    for x in range(SIZE):
        r, g, b = im.getpixel((x, y))
        row += "#" if g - r > 45 else "."
    rows.append(row)
js = "// Generado por tools/make-logo.py a partir de assets/logo-jeniermods.png\n"
js += "// '#' = verde, '.' = blanco\nexport const LOGO = [\n" + "".join(f'  "{r}",\n' for r in rows) + "];\n"
(ROOT / "behavior_pack" / "scripts" / "logo.js").write_text(js, encoding="utf-8")
print("\n".join(rows))
