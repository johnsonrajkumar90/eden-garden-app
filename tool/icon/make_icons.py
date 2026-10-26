"""Builds the launcher icons from tool/icon/triparro-icon-original.png (the TripArro app icon):
background (the gradient, text removed), foreground (white "Triparro"), monochrome (themed icons, Android 13+),
legacy square/round icons (Android 7) and the 512 px Play Store icon. Run: python3 tool/icon/make_icons.py"""
import os, numpy as np, cv2
from PIL import Image, ImageDraw, ImageFilter
HERE = os.path.dirname(os.path.abspath(__file__))
R = os.path.join(HERE, '../../app/src/main/res/')
src = np.array(Image.open(os.path.join(HERE, 'triparro-icon-original.png')).convert('RGB')).astype(np.float32)
mx = src.max(2); mn = src.min(2); sat = mx - mn
band = np.zeros(mn.shape, bool); band[360:690, 50:985] = True
text = (mn > 200) & (sat < 80) & band
n, lab, st, _ = cv2.connectedComponentsWithStats(text.astype(np.uint8))
keep = np.zeros_like(text)
for i in range(1, n):
    if st[i, 4] > 300: keep |= lab == i
tys, txs = np.where(keep)
tile = sat > 60
mask = (~tile | cv2.dilate(keep.astype(np.uint8), np.ones((19, 19), np.uint8)).astype(bool)).astype(np.uint8) * 255
bgc = cv2.inpaint(cv2.cvtColor(src.astype(np.uint8), cv2.COLOR_RGB2BGR), mask, 30, cv2.INPAINT_TELEA)
bgc = cv2.cvtColor(bgc, cv2.COLOR_BGR2RGB)[48:976, 48:976]
bg = Image.fromarray(bgc).resize((1024, 1024), Image.LANCZOS).filter(ImageFilter.GaussianBlur(3))
reg = cv2.dilate(keep.astype(np.uint8), np.ones((7, 7), np.uint8)).astype(bool)
alpha = (np.clip((mn - 140) / (225 - 140), 0, 1) * reg * 255).astype(np.uint8)
ta = Image.fromarray(alpha[tys.min() - 10:tys.max() + 10, txs.min() - 10:txs.max() + 10])

def text_layer(size, frac, shadow=True):
    w = int(size * frac); h = int(ta.height * w / ta.width)
    a = ta.resize((w, h), Image.LANCZOS)
    L = Image.new('RGBA', (size, size), (0, 0, 0, 0)); x = (size - w) // 2; y = (size - h) // 2
    if shadow:
        sh = Image.new('RGBA', (size, size), (0, 0, 0, 0))
        s = Image.new('RGBA', (w, h), (120, 0, 30, 0)); s.putalpha(a.point(lambda v: int(v * 0.35)))
        sh.alpha_composite(s, (x, y + max(1, size // 160))); L.alpha_composite(sh.filter(ImageFilter.GaussianBlur(max(1, size / 120))))
    t = Image.new('RGBA', (w, h), (255, 255, 255, 0)); t.putalpha(a); L.alpha_composite(t, (x, y))
    return L
def full(size, frac):
    im = bg.resize((size, size), Image.LANCZOS).convert('RGBA'); im.alpha_composite(text_layer(size, frac)); return im
def masked(im, shape):
    m = Image.new('L', im.size, 0); d = ImageDraw.Draw(m)
    if shape == 'circle': d.ellipse([0, 0, im.width - 1, im.height - 1], fill=255)
    else: d.rounded_rectangle([0, 0, im.width - 1, im.height - 1], radius=int(im.width * 0.18), fill=255)
    out = im.copy(); out.putalpha(m); return out
for d, f in {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}.items():
    a = int(108 * f); l = int(48 * f); p = R + f'mipmap-{d}/'
    bg.resize((a, a), Image.LANCZOS).save(p + 'ic_launcher_background.png')
    text_layer(a, 0.60).save(p + 'ic_launcher_foreground.png')
    text_layer(a, 0.60, shadow=False).save(p + 'ic_launcher_monochrome.png')
    masked(full(l * 4, 0.80), 'rounded').resize((l, l), Image.LANCZOS).save(p + 'ic_launcher.png')
    masked(full(l * 4, 0.72), 'circle').resize((l, l), Image.LANCZOS).save(p + 'ic_launcher_round.png')
full(512, 0.80).convert('RGB').save(os.path.join(HERE, 'play-store-icon-512.png'))
print('icons written')
