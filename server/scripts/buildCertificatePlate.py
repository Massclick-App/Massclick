"""
Rebuilds the certificate plate from the designer's per-business certificate PDFs.

The artwork we are given is not a blank template — it is a folder of finished
certificates, one per business, each with that business's logo, name and
location already rendered into it. The plate is that same artwork with those
three fields removed, so the generator can draw live values into them.

Nothing needs to be painted out by hand. Because only those three fields differ
between the certificates and everything else is pixel-identical, the background
behind them can simply be measured: at any given pixel most businesses' artwork
does not cover it, so the per-pixel median across the whole set is the paper.

The passes below exist because a plain median is not quite enough:

  1. median            -- first estimate of the background.
  2. iterative refine  -- re-average using only the certificates that agree with
                          that estimate, which removes the bias a median still
                          carries where many logos happen to overlap.
  3. inpaint           -- a small core (roughly the middle of the logo block and
                          the centre of the name line) is covered on nearly every
                          certificate, so no amount of averaging recovers it.
                          Those pixels are filled from a masked downsample of the
                          surrounding paper, which keeps the faint watermark
                          gradient instead of stamping a flat patch.

Usage:
    python server/scripts/buildCertificatePlate.py <pdf-dir> <output.jpg>

Requires PyMuPDF, numpy and Pillow (dev-only; the server itself does not need
them). Rendering ~80 PDFs takes a few minutes and about 600MB of RAM.

If the design is ever redrawn, re-check BAND against the new artwork — it must
cover the logo, name and location and nothing that is meant to stay on the
plate. Then re-measure the slot coordinates in
helper/businessList/businessCertificateHelper.js, which are in the same
design-space points this script renders at (576x864 at SCALE=1).
"""

import glob
import os
import sys

import numpy as np
from PIL import Image

try:
    import fitz  # PyMuPDF
except ImportError:  # pragma: no cover - dev tool
    sys.exit("PyMuPDF is required: pip install pymupdf")

# Design space is the artwork's own PDF point size, so coordinates here match
# the slot coordinates in businessCertificateHelper.js one for one.
PAGE_W, PAGE_H = 576, 864
SCALE = 2.5                 # -> 1440x2160 output
BAND = (248.0, 421.5)       # design-space y range holding logo + name + location

AGREE_TOLERANCE = 10.0      # channel delta within which a cert "agrees" with the estimate
MIN_AGREEING = 35           # below this the pixel is considered unrecoverable
REFINE_PASSES = 4
DILATE_RADIUS = 4           # grow the unrecoverable mask to catch contaminated fringes
COARSE_CELL = 20            # masked-downsample cell size used to synthesise the fill


def render_all(pdf_dir):
    files = sorted(glob.glob(os.path.join(pdf_dir, "*.pdf")))
    if not files:
        sys.exit(f"No PDFs found in {pdf_dir}")

    print(f"rendering {len(files)} certificates at {int(PAGE_W*SCALE)}x{int(PAGE_H*SCALE)}")
    pages = []
    for i, f in enumerate(files):
        doc = fitz.open(f)
        pix = doc[0].get_pixmap(matrix=fitz.Matrix(SCALE, SCALE), colorspace=fitz.csRGB)
        pages.append(
            np.frombuffer(pix.samples, dtype=np.uint8)
            .reshape(pix.height, pix.width, 3)
            .copy()
        )
        doc.close()
        if i % 20 == 0:
            print(f"  {i + 1}/{len(files)}", flush=True)
    return pages


def refine_background(band_stack):
    """Median, then re-average over only the certificates that agree with it."""
    bg = np.median(band_stack, axis=0)
    for i in range(REFINE_PASSES):
        agrees = np.abs(band_stack - bg).max(axis=3) < AGREE_TOLERANCE
        count = agrees.sum(axis=0)
        total = (band_stack * agrees[..., None]).sum(axis=0)
        bg = np.where(
            count[..., None] >= 8,
            total / np.maximum(count, 1)[..., None],
            bg,
        )
        print(f"  refine pass {i + 1}: thinnest support {count.min()} certs")
    agrees = np.abs(band_stack - bg).max(axis=3) < AGREE_TOLERANCE
    return bg, agrees.sum(axis=0)


def dilate(mask, radius):
    out = mask.copy()
    for dy in range(-radius, radius + 1):
        for dx in range(-radius, radius + 1):
            out |= np.roll(np.roll(mask, dy, 0), dx, 1)
    return out


def inpaint(bg, bad):
    """Fill `bad` pixels from a masked downsample, so the watermark survives."""
    height, width, _ = bg.shape
    good = (~bad).astype(np.float32)

    pad_h, pad_w = (-height) % COARSE_CELL, (-width) % COARSE_CELL
    gp = np.pad(good, ((0, pad_h), (0, pad_w)))
    bp = np.pad(bg * good[..., None], ((0, pad_h), (0, pad_w), (0, 0)))
    ch, cw = gp.shape[0] // COARSE_CELL, gp.shape[1] // COARSE_CELL

    weight = gp.reshape(ch, COARSE_CELL, cw, COARSE_CELL).sum(axis=(1, 3))
    total = bp.reshape(ch, COARSE_CELL, cw, COARSE_CELL, 3).sum(axis=(1, 3))
    coarse = total / np.maximum(weight, 1e-6)[..., None]

    # Cells with no clean pixel at all get diffused in from their neighbours.
    holes = weight < 1
    if holes.any():
        print(f"  {holes.sum()} coarse cells had no clean pixel; diffusing")
        for _ in range(400):
            neighbours = (
                np.roll(coarse, 1, 0) + np.roll(coarse, -1, 0)
                + np.roll(coarse, 1, 1) + np.roll(coarse, -1, 1)
            ) / 4
            coarse = np.where(holes[..., None], neighbours, coarse)

    fill = np.asarray(
        Image.fromarray(coarse.astype(np.uint8)).resize(
            (gp.shape[1], gp.shape[0]), Image.BICUBIC
        ),
        dtype=np.float32,
    )[:height, :width]

    # Feather so the fill blends into the measured paper instead of seaming.
    alpha = bad.astype(np.float32)
    for _ in range(6):
        alpha = (
            alpha + np.roll(alpha, 1, 0) + np.roll(alpha, -1, 0)
            + np.roll(alpha, 1, 1) + np.roll(alpha, -1, 1)
        ) / 5
    alpha = np.clip(alpha * 1.6, 0, 1)[..., None]

    return bg * (1 - alpha) + fill * alpha


def main():
    if len(sys.argv) != 3:
        sys.exit(__doc__.strip().splitlines()[-1])
    pdf_dir, out_path = sys.argv[1], sys.argv[2]

    pages = render_all(pdf_dir)
    height, width = pages[0].shape[:2]
    y0, y1 = int(BAND[0] * SCALE), int(BAND[1] * SCALE)

    # Outside the band every certificate is identical, so the median there just
    # averages away JPEG noise. Done in stripes to bound peak memory.
    plate = np.zeros((height, width, 3), dtype=np.uint8)
    for start in range(0, height, 240):
        end = min(start + 240, height)
        plate[start:end] = np.median(
            np.stack([p[start:end] for p in pages]), axis=0
        ).astype(np.uint8)

    print("recovering the paper behind logo / name / location")
    band_stack = np.stack([p[y0:y1] for p in pages]).astype(np.float32)
    bg, support = refine_background(band_stack)
    del band_stack

    bad = dilate(support < MIN_AGREEING, DILATE_RADIUS)
    print(f"  inpainting {bad.sum()} px that nearly every certificate covers")
    plate[y0:y1] = inpaint(bg, bad).astype(np.uint8)

    # Soften the two horizontal joins between the measured band and the median.
    for seam in (y0, y1):
        for d in range(-3, 4):
            row = seam + d
            if 1 <= row < height - 1:
                plate[row] = (
                    (plate[row - 1].astype(np.int16)
                     + plate[row].astype(np.int16) * 2
                     + plate[row + 1].astype(np.int16)) // 4
                ).astype(np.uint8)

    Image.fromarray(plate).save(out_path, quality=92, subsampling=0)
    print(f"wrote {out_path}  ({os.path.getsize(out_path) // 1024} KB, {width}x{height})")


if __name__ == "__main__":
    main()
