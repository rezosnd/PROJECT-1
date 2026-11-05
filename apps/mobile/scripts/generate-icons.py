from PIL import Image
from pathlib import Path

root = Path(__file__).resolve().parents[1] / 'assets'
src = Image.open(root / 'logo-mark.png').convert('RGBA')

px = src.load()
w, h = src.size
min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 20 and (r + g + b) > 30:
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

cropped = src.crop((min_x, min_y, max_x + 1, max_y + 1)) if max_x > min_x else src

BG = (11, 61, 26, 255)


def make_square(size: int, pad_ratio: float, bg):
    canvas = Image.new('RGBA', (size, size), bg)
    max_side = int(size * (1 - 2 * pad_ratio))
    mark = cropped.copy()
    mark.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
    x = (size - mark.width) // 2
    y = (size - mark.height) // 2
    canvas.alpha_composite(mark, (x, y))
    return canvas


icon = make_square(1024, 0.12, BG).convert('RGB')
icon.save(root / 'icon.png', 'PNG', optimize=True)

fg = Image.new('RGBA', (1024, 1024), (0, 0, 0, 0))
max_side = int(1024 * 0.62)
mark = cropped.copy()
mark.thumbnail((max_side, max_side), Image.Resampling.LANCZOS)
x = (1024 - mark.width) // 2
y = (1024 - mark.height) // 2
fg.alpha_composite(mark, (x, y))
fg.save(root / 'adaptive-icon.png', 'PNG', optimize=True)

splash_src = Image.open(root / 'logo.png').convert('RGBA')
px = splash_src.load()
w, h = splash_src.size
min_x, min_y, max_x, max_y = w, h, 0, 0
for y in range(h):
    for x in range(w):
        r, g, b, a = px[x, y]
        if a > 20 and (r + g + b) > 40:
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)
logo = splash_src.crop((min_x, min_y, max_x + 1, max_y + 1)) if max_x > min_x else splash_src

splash = Image.new('RGBA', (1284, 2778), (244, 247, 242, 255))
logo_copy = logo.copy()
logo_copy.thumbnail((int(1284 * 0.72), int(1284 * 0.72)), Image.Resampling.LANCZOS)
lx = (1284 - logo_copy.width) // 2
ly = (2778 - logo_copy.height) // 2
splash.alpha_composite(logo_copy, (lx, ly))
splash.convert('RGB').save(root / 'splash.png', 'PNG', optimize=True)

favicon = make_square(192, 0.1, BG).convert('RGB')
favicon.save(root / 'favicon.png', 'PNG', optimize=True)

print('icons written')
for name in ['icon.png', 'adaptive-icon.png', 'splash.png', 'favicon.png']:
    p = root / name
    im = Image.open(p)
    print(name, im.size, p.stat().st_size)
