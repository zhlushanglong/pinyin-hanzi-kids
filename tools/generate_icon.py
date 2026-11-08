#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""生成 iOS「添加到主屏幕」图标 apple-touch-icon.png（180x180）。

纯标准库实现，不依赖 Pillow / 字体文件，直接逐像素绘制并编码 PNG：
柔和渐变底 + 七色彩虹拱 + 云朵 + 星星，与网页配色一致。

    python tools/generate_icon.py
"""
from __future__ import annotations

import math
import struct
import zlib
from pathlib import Path

W = H = 180
SS = 3                      # 每像素 3x3 超采样，边缘更平滑
CX, CY = 90.0, 120.0       # 彩虹圆心
R_OUT, R_IN = 72.0, 36.0   # 彩虹外 / 内半径

RAINBOW = [
    (255, 107, 107),  # 红
    (255, 169, 77),   # 橙
    (255, 212, 59),   # 黄
    (81, 207, 102),   # 绿
    (34, 184, 166),   # 青
    (77, 171, 247),   # 蓝
    (151, 117, 250),  # 紫
]
# 连成一整条波浪云带，托住彩虹两端
CLOUDS = [
    (26, 120, 15), (42, 110, 14), (58, 119, 15), (73, 125, 14),
    (90, 127, 15), (107, 125, 14), (122, 119, 15), (138, 110, 14), (154, 120, 15),
]
STARS = [(36, 46, 11), (144, 54, 9), (90, 24, 7), (24, 88, 6), (156, 92, 6)]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def sample(x: float, y: float) -> tuple[float, float, float]:
    # 背景：薄荷绿 → 天蓝的斜向渐变
    t = min(1.0, max(0.0, x / W * 0.55 + y / H * 0.45))
    c = (lerp(226, 206, t), lerp(250, 236, t), lerp(244, 255, t))

    # 星星（菱形 + 十字光芒）
    for sx, sy, s in STARS:
        dx, dy = abs(x - sx), abs(y - sy)
        if (dx + dy < s * 0.55) or (dx < s * 0.16 and dy < s) or (dy < s * 0.16 and dx < s):
            c = (255, 196, 46)
            break

    # 上半圆彩虹
    dx, dy = x - CX, y - CY
    r = math.hypot(dx, dy)
    if dy <= 2 and R_IN <= r <= R_OUT:
        band = (R_OUT - R_IN) / len(RAINBOW)
        idx = min(len(RAINBOW) - 1, int((R_OUT - r) / band))
        c = RAINBOW[idx]
    elif dy <= 2 and R_OUT < r <= R_OUT + 2:
        c = (255, 255, 255)      # 彩虹外圈白色描边

    # 云朵覆盖彩虹两端
    for ox, oy, rr in CLOUDS:
        if (x - ox) ** 2 + (y - oy) ** 2 <= rr * rr:
            c = (255, 255, 255)
            break
    return c


def chunk(tag: bytes, data: bytes) -> bytes:
    return (struct.pack('>I', len(data)) + tag + data
            + struct.pack('>I', zlib.crc32(tag + data) & 0xFFFFFFFF))


def main() -> None:
    rows = []
    for py in range(H):
        row = bytearray()
        for px in range(W):
            acc = [0.0, 0.0, 0.0]
            for sy in range(SS):
                for sx in range(SS):
                    c = sample(px + (sx + 0.5) / SS, py + (sy + 0.5) / SS)
                    for i in range(3):
                        acc[i] += c[i]
            n = SS * SS
            row += bytes(min(255, max(0, round(v / n))) for v in acc)
        rows.append(bytes(row))

    raw = b''.join(b'\x00' + row for row in rows)
    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', W, H, 8, 2, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 9))
           + chunk(b'IEND', b''))
    out = Path(__file__).resolve().parents[1] / 'apple-touch-icon.png'
    out.write_bytes(png)
    print(f'✅ 已生成 {out.name}：{W}x{H}，{len(png)} 字节')


if __name__ == '__main__':
    main()
