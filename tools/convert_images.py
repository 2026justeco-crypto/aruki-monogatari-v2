"""art\\ の PNG を site\\img\\ の WebP にする（元の PNG は変えない）。

- 背景：長辺 1600px 以下に縮める（元がそれより小さければ拡大しない）・品質 80
- 人物：512px 四方・透過のまま・品質 82
使い方：python tools/convert_images.py
依存：Pillow のみ
"""
import sys
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "site" / "img"

BG_LONG = 1600
BG_Q = 80
PERSON_SIZE = 512
PERSON_Q = 82

# 出力名 ← 元のファイル
PEOPLE = {
    "people/guide_normal.webp": "art/annaiyaku/gen/an3_expr_normal.png",
    "people/guide_smile.webp": "art/annaiyaku/gen/an3_expr_smile.png",
    "people/guide_discover.webp": "art/annaiyaku/gen/an3_expr_discover.png",
    "people/guide_think.webp": "art/annaiyaku/gen/an3_expr_think.png",
    "people/guide_bust.webp": "art/annaiyaku/gen/an3_bust.png",
    "people/yoshimitsu_normal.webp": "art/yoshimitsu/gen/ym_expr_normal.png",
    "people/yoshimitsu_smile.webp": "art/yoshimitsu/gen/ym_expr_smile.png",
}
BG_SRC = "art/bg/kinkakuji/gen"
BG_IDS = [f"bg{i:02d}" for i in range(1, 11)]


def convert_bg(src: Path, dst: Path) -> str:
    im = Image.open(src).convert("RGB")
    w, h = im.size
    scale = min(1.0, BG_LONG / max(w, h))
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=BG_Q, method=6)
    return f"{w}x{h} -> {im.size[0]}x{im.size[1]}"


def convert_person(src: Path, dst: Path) -> str:
    im = Image.open(src).convert("RGBA")
    w, h = im.size
    side = min(w, h)  # 正方形に（元は 1024 四方。違えば中央で切る）
    left, top = (w - side) // 2, (h - side) // 2
    im = im.crop((left, top, left + side, top + side)).resize((PERSON_SIZE, PERSON_SIZE), Image.LANCZOS)
    dst.parent.mkdir(parents=True, exist_ok=True)
    im.save(dst, "WEBP", quality=PERSON_Q, method=6)
    return f"{w}x{h} -> {PERSON_SIZE}x{PERSON_SIZE}"


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):
        sys.stdout.reconfigure(encoding="utf-8")
    jobs = []
    for bid in BG_IDS:
        jobs.append(("bg", ROOT / BG_SRC / f"{bid}.png", OUT / "bg" / "kinkakuji" / f"{bid}.webp"))
    for out, src in PEOPLE.items():
        jobs.append(("person", ROOT / src, OUT / out))
    total_in = total_out = 0
    for kind, src, dst in jobs:
        if not src.exists():
            raise SystemExit(f"元の画像がありません: {src}")
        info = convert_bg(src, dst) if kind == "bg" else convert_person(src, dst)
        a, b = src.stat().st_size, dst.stat().st_size
        total_in += a
        total_out += b
        print(f"{dst.relative_to(ROOT).as_posix()}  {info}  {a // 1024}KB -> {b // 1024}KB")
    print(f"計 {len(jobs)} 枚  {total_in // 1024}KB -> {total_out // 1024}KB")


if __name__ == "__main__":
    main()
