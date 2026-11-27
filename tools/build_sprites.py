#!/usr/bin/env python3
"""
Build MONEY TRAP 2070 pixel-art sprite atlas (same technique as eyeoverthink/fraymus-quest tools/build_sprites.py).

  python3 tools/build_sprites.py

Inputs  (art-src/): ronin_a/b.jpg, jarron_a/b.jpg (5 poses each), banker.jpg (3 poses), npcs.jpg (8), props.jpg (10)
Outputs:
  assets/sprites/atlas.png   all frames packed (transparent PNG)
  sprites.js                 window.MT_ATLAS = { name: {x,y,w,h,ax,ay} }  (JS, so it loads over file:// too)

Pipeline: flood-fill the white background from the border -> per-pose connected components (stray bits like a
thrown coin are merged into the nearest pose) -> foreground-only area-weighted downscale (no white fringe) ->
per-sprite palette quantisation -> 1-px dark outline -> anchor at the feet (mean x of the lowest 25% of pixels).
Requires: pillow, numpy, scipy.
"""
import os, json, numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, 'art-src')
OUT = os.path.join(ROOT, 'assets', 'sprites'); os.makedirs(OUT, exist_ok=True)
OUTLINE = (10, 8, 16, 255)

def load(n): return np.array(Image.open(os.path.join(SRC, n)).convert('RGB')).astype(float)

def bg_mask(img, thr=228):
    light = (img.min(axis=2) > thr) & ((img.max(axis=2) - img.min(axis=2)) < 28)
    lab, _ = ndimage.label(light)
    border = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    return np.isin(lab, list(border))

def components(img, n, grid=None):
    fg = ~bg_mask(img)
    fg = ndimage.binary_opening(fg, iterations=1)
    lab, k = ndimage.label(ndimage.binary_dilation(fg, iterations=4))
    comps = []
    for i, s in enumerate(ndimage.find_objects(lab), 1):
        m = (lab == i) & fg
        a = m.sum()
        if a < 40: continue
        ys, xs = np.nonzero(m)
        comps.append(dict(m=m, a=a, x0=xs.min(), x1=xs.max(), y0=ys.min(), y1=ys.max()))
    comps.sort(key=lambda c: -c['a'])
    big, small = comps[:n], comps[n:]
    for c in small:  # merge strays (thrown coin, paper plane, flames) into nearest pose
        def dist(b):
            dx = max(b['x0'] - c['x1'], c['x0'] - b['x1'], 0); dy = max(b['y0'] - c['y1'], c['y0'] - b['y1'], 0)
            return dx + dy
        b = min(big, key=dist)
        if dist(b) < 90:
            b['m'] = b['m'] | c['m']; b['x0'] = min(b['x0'], c['x0']); b['x1'] = max(b['x1'], c['x1']); b['y0'] = min(b['y0'], c['y0']); b['y1'] = max(b['y1'], c['y1'])
    if grid:  # (cols, rows): order row-major by bbox centre
        rows = grid[1]; H = img.shape[0]
        big.sort(key=lambda b: (int(((b['y0'] + b['y1']) / 2) / (H / rows)), (b['x0'] + b['x1']) / 2))
    else:
        big.sort(key=lambda b: b['x0'])
    return big

def downscale(img, c, s):
    m = c['m']; y0, y1, x0, x1 = c['y0'], c['y1'] + 1, c['x0'], c['x1'] + 1
    H = max(1, int(round((y1 - y0) * s))); W = max(1, int(round((x1 - x0) * s)))
    out = np.zeros((H, W, 4))
    for oy in range(H):
        sy0 = y0 + int(oy / s); sy1 = max(sy0 + 1, y0 + int((oy + 1) / s))
        for ox in range(W):
            sx0 = x0 + int(ox / s); sx1 = max(sx0 + 1, x0 + int((ox + 1) / s))
            mm = m[sy0:sy1, sx0:sx1]
            if not mm.size or mm.mean() < 0.42: continue
            px = img[sy0:sy1, sx0:sx1][mm]
            # salient colour: keep bright/saturated accents (gold VII, green shades, red eyes) visible
            sat = px.max(axis=1) - px.min(axis=1)
            if (sat > 90).mean() > 0.3: px = px[sat > 90]
            out[oy, ox, :3] = np.median(px, axis=0); out[oy, ox, 3] = 255
    return out

def quantize(rgba, colors=40):
    a = rgba[..., 3] > 0
    if a.sum() == 0: return rgba
    im = Image.fromarray(rgba[..., :3].astype(np.uint8)).quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert('RGB')
    q = np.array(im).astype(float); out = rgba.copy(); out[..., :3] = np.where(a[..., None], q, 0); return out

def outline(rgba):
    a = rgba[..., 3] > 0
    p = np.pad(rgba, ((1, 1), (1, 1), (0, 0))); ap = np.pad(a, 1)
    nb = np.zeros_like(ap)
    for dy, dx in ((0, 1), (0, -1), (1, 0), (-1, 0)): nb |= np.roll(np.roll(ap, dy, 0), dx, 1)
    ring = nb & ~ap
    p[ring] = OUTLINE
    return p

def anchor(rgba):
    a = rgba[..., 3] > 0; ys, xs = np.nonzero(a)
    if not len(ys): return rgba.shape[1] / 2, rgba.shape[0]
    low = ys >= ys.max() - max(2, int((ys.max() - ys.min()) * 0.25))
    return float(xs[low].mean()), float(ys.max() + 1)

FRAMES = {}
def add(name, rgba, colors=40, ol=True, flash=False):
    r = quantize(rgba, colors)
    if ol: r = outline(r)
    ax, ay = anchor(r)
    FRAMES[name] = dict(img=r.astype(np.uint8), ax=round(ax, 1), ay=ay)
    if flash:
        f = r.copy(); f[f[..., 3] > 0, :3] = 255; FRAMES[name + '_flash'] = dict(img=f.astype(np.uint8), ax=round(ax, 1), ay=ay)

def sheet(file, names, height_of=0, target=60, n=None, grid=None, sizes=None, colors=40, flash=False):
    img = load(file); cs = components(img, n or len(names), grid)
    assert len(cs) >= len(names), (file, len(cs))
    base = cs[height_of]['y1'] - cs[height_of]['y0'] + 1
    for i, name in enumerate(names):
        if name is None: continue
        c = cs[i]
        if sizes:  # per-item target height (or ('w', px) target width)
            t = sizes[i]
            s = (t[1] / (c['x1'] - c['x0'] + 1)) if isinstance(t, tuple) else t / (c['y1'] - c['y0'] + 1)
        else: s = target / base
        add(name, downscale(img, c, s), colors, flash=flash)
        print(f'{file}: {name} {FRAMES[name]["img"].shape[1]}x{FRAMES[name]["img"].shape[0]}')

HERO_H = 60
sheet('ronin_a.jpg', ['ronin_idle', 'ronin_run1', 'ronin_run2', 'ronin_run3', 'ronin_run4'], 0, HERO_H)
sheet('ronin_b.jpg', ['ronin_jump', 'ronin_fall', 'ronin_stack', 'ronin_throw', 'ronin_idle2'], 4, HERO_H)
sheet('jarron_a.jpg', ['jarron_idle', 'jarron_run1', 'jarron_run2', 'jarron_run3', 'jarron_run4'], 0, HERO_H)
sheet('jarron_b.jpg', ['jarron_jump', 'jarron_fall', 'jarron_glide', 'jarron_throw', 'jarron_dash'], 3, HERO_H)
sheet('banker.jpg', ['boss_idle', 'boss_attack', 'boss_rage'], 0, 168, colors=48, flash=True)
sheet('npcs.jpg', ['devil', 'drone', 'worker', 'dealer', 'merchant', 'beggar', 'taxi', 'thief'], grid=(4, 2),
      sizes=[38, ('w', 54), 50, 50, 50, 50, ('w', 96), 50])
sheet('props.jpg', ['vault', 'atm', 'slot', 'kiosk', 'stall', 'coin', 'bill', 'credit', 'chip', 'crate'], grid=(5, 2),
      sizes=[('w', 48), 50, 54, 50, ('w', 80), ('w', 18), ('w', 28), ('w', 26), ('w', 22), ('w', 20)])

# shelf-pack atlas
items = sorted(FRAMES.items(), key=lambda kv: -kv[1]['img'].shape[0])
AW = 1024; x = y = rowh = 0; meta = {}
for name, f in items:
    h, w = f['img'].shape[:2]
    if x + w > AW: x = 0; y += rowh + 2; rowh = 0
    meta[name] = dict(x=x, y=y, w=w, h=h, ax=f['ax'], ay=f['ay']); f['pos'] = (x, y)
    x += w + 2; rowh = max(rowh, h)
atlas = np.zeros((y + rowh + 2, AW, 4), np.uint8)
for name, f in items:
    (x, y), (h, w) = f['pos'], f['img'].shape[:2]; atlas[y:y + h, x:x + w] = f['img']
Image.fromarray(atlas).save(os.path.join(OUT, 'atlas.png'), optimize=True)
with open(os.path.join(ROOT, 'sprites.js'), 'w') as fh:
    fh.write('/* generated by tools/build_sprites.py — sprite atlas frame table */\nwindow.MT_ATLAS = ' + json.dumps(meta, separators=(',', ':')) + ';\n')
print('atlas', atlas.shape, len(meta), 'frames')
