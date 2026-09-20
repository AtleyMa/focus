#!/usr/bin/env python3
"""Generate the focus app icon (1024x1024 PNG) using only the stdlib.

Motif: dark gradient background + a violet "no" circle with a cyan slash,
suggesting "no reels" — a clean, meaningful default icon.
"""
import math
import struct
import zlib

W = H = 1024
OUT = "AppIcon.png"

CX, CY = W / 2.0, H / 2.0
RING_R = 300.0
SLASH_W = 70.0
CORE_R = 110.0

ACCENT = (124, 58, 237)    # violet
SLASH = (34, 211, 238)     # cyan
CORE = (255, 255, 255)     # white inner disc


def bg(x, y):
    t = y / H
    return (
        int(26 + (22 - 26) * t),
        int(26 + (33 - 26) * t),
        int(46 + (62 - 46) * t),
    )


def in_circle(px, py, cx, cy, r):
    return (px - cx) ** 2 + (py - cy) ** 2 <= r * r


def band_dist(px, py):
    # diagonal slash line: x + y - (CX + CY) = 0  (slope -1)
    return abs(px + py - (CX + CY)) / math.sqrt(2.0)


rows = []
for y in range(H):
    row = bytearray([0])
    for x in range(W):
        px, py = x + 0.5, y + 0.5
        inside = in_circle(px, py, CX, CY, RING_R)
        core = in_circle(px, py, CX, CY, CORE_R)
        band = inside and band_dist(px, py) <= SLASH_W / 2.0
        if core:
            r, g, b = CORE
        elif band:
            r, g, b = SLASH
        elif inside:
            r, g, b = ACCENT
        else:
            r, g, b = bg(x, y)
        row += bytes((r, g, b))
    rows.append(bytes(row))

raw = b"".join(rows)


def chunk(tag, data):
    out = struct.pack(">I", len(data)) + tag + data
    return out + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


png = b"\x89PNG\r\n\x1a\n"
png += chunk(b"IHDR", struct.pack(">IIBBBBB", W, H, 8, 2, 0, 0, 0))
png += chunk(b"IDAT", zlib.compress(raw, 9))
png += chunk(b"IEND", b"")
with open(OUT, "wb") as f:
    f.write(png)
print(f"wrote {OUT}")