"""義満の検品用：一覧（胸上・表情）／案内役と並べた見本／同一人物性の数値（外接矩形のずれ・画素の平均差）／375px幅で96・120px表示の模擬"""
import json
from pathlib import Path
from PIL import Image, ImageChops, ImageDraw, ImageFont, ImageStat

R = Path(__file__).resolve().parent.parent
GEN, CHK = R / "gen", R / "check"
AN = R.parent / "annaiyaku/gen"
WASHI, INK, DARK = (0xFA, 0xF6, 0xEE), (0x1E, 0x3A, 0x5F), (0x14, 0x24, 0x3B)
F = lambda s: ImageFont.truetype(r"C:\Windows\Fonts\BIZ-UDGothicR.ttc", s)


def row(items, out, bg=WASHI, S=400, PAD=20, LAB=44):
    sheet = Image.new("RGB", (PAD + len(items) * (S + PAD), PAD + S + LAB), bg)
    d = ImageDraw.Draw(sheet)
    for i, (p, lab) in enumerate(items):
        im = Image.open(p).convert("RGBA").resize((S, S), Image.LANCZOS)
        x = PAD + i * (S + PAD)
        sheet.paste(im, (x, PAD), im)
        d.text((x + S // 2, PAD + S + 8), lab, fill=INK if bg == WASHI else (0xF5, 0xF1, 0xE8), font=F(24), anchor="mt")
    sheet.save(out)


def bbox_and_diff():
    base = Image.open(GEN / "ym_bust.png").convert("RGBA")
    res = {"ym_bust": {"alpha_bbox": base.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()}}
    for k in ("ym_expr_normal", "ym_expr_smile"):
        im = Image.open(GEN / f"{k}.png").convert("RGBA")
        bb = im.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()
        diff = ImageStat.Stat(ImageChops.difference(base.convert("RGB"), im.convert("RGB"))).mean
        res[k] = {"alpha_bbox": bb, "bbox_delta_vs_bust": [b - a for a, b in zip(res["ym_bust"]["alpha_bbox"], bb)],
                  "mean_abs_diff_rgb_vs_bust": [round(x, 2) for x in diff]}
    an = Image.open(AN / "an3_expr_normal.png").convert("RGBA")
    res["annaiyaku_an3_expr_normal"] = {"alpha_bbox": an.getchannel("A").point(lambda a: 255 if a > 128 else 0).getbbox()}
    (CHK / "stats.json").write_text(json.dumps(res, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(res, ensure_ascii=False))


def mock375():
    W, H = 375, 280
    sheet = Image.new("RGB", (W, H), DARK)
    d = ImageDraw.Draw(sheet)
    x = 16
    for px in (96, 120):
        for p in (AN / "an3_expr_normal.png", GEN / "ym_expr_normal.png", GEN / "ym_expr_smile.png"):
            if x + px > W:
                break
            im = Image.open(p).convert("RGBA").resize((px, px), Image.LANCZOS)
            y = 16 if px == 96 else 16 + 96 + 16
            sheet.paste(im, (x if px == 96 else x, y), im)
            x += px + 8
        x = 16
    d.text((W - 8, H - 6), "375px幅（上段96px・下段120px）", fill=(0xF5, 0xF1, 0xE8), font=F(12), anchor="rb")
    sheet.save(CHK / "mock_375_bust.png")


if __name__ == "__main__":
    row([(GEN / "ym_bust.png", "胸上（土台）"), (GEN / "ym_expr_normal.png", "通常 normal"), (GEN / "ym_expr_smile.png", "微笑み smile")],
        GEN / "contact_sheet.png")
    row([(AN / "an3_expr_normal.png", "案内役 しおり（通常）"), (GEN / "ym_expr_normal.png", "義満（通常）"), (GEN / "ym_expr_smile.png", "義満（微笑み）")],
        CHK / "with_annaiyaku_washi.png")
    row([(AN / "an3_expr_normal.png", "案内役 しおり（通常）"), (GEN / "ym_expr_normal.png", "義満（通常）"), (GEN / "ym_expr_smile.png", "義満（微笑み）")],
        CHK / "with_annaiyaku_dark.png", bg=DARK)
    bbox_and_diff()
    mock375()
