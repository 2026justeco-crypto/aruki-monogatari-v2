"""背景の検品用の画像を作る（一覧・会話欄と案内役の胸上を重ねた見本・375px幅の模擬）と、下1/3の明るさを数える。
会話欄の色・名前札の色は design-chousa（案A）の値。文字は台本 script.json の実際の台詞。
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageStat

R = Path(__file__).resolve().parent.parent           # art/bg/kinkakuji
ART = R.parent.parent                                # art
BASE = ART.parent                                    # aruki-v2
GEN, CHK = R / "gen", R / "check"
IDS = [f"bg{i:02d}" for i in range(1, 11)]
WASHI, PANEL, PANEL_TXT, NAME = (0xFA, 0xF6, 0xEE), (0x14, 0x24, 0x3B), (0xF5, 0xF1, 0xE8), (0xE8, 0xC7, 0x7A)
FONT = r"C:\Windows\Fonts\BIZ-UDGothicR.ttc"
script = {x["id"]: x for x in json.loads((BASE / "content/kinkakuji/script.json").read_text(encoding="utf-8"))}
GUIDE = ART / "annaiyaku/gen/an3_expr_normal.png"
YM = ART / "yoshimitsu/gen/ym_expr_normal.png"


def f(size):
    return ImageFont.truetype(FONT, size)


def wrap(d, text, font, width):
    lines, cur = [], ""
    for ch in text:
        if d.textlength(cur + ch, font=font) > width:
            lines.append(cur); cur = ch
        else:
            cur += ch
    return lines + [cur]


def contact():
    W, H, PAD, LAB = 480, 320, 16, 36
    sheet = Image.new("RGB", (PAD + 5 * (W + PAD), PAD + 2 * (H + LAB + PAD)), WASHI)
    d = ImageDraw.Draw(sheet)
    for i, b in enumerate(IDS):
        im = Image.open(GEN / f"{b}.png").convert("RGB").resize((W, H), Image.LANCZOS)
        x, y = PAD + (i % 5) * (W + PAD), PAD + (i // 5) * (H + LAB + PAD)
        sheet.paste(im, (x, y))
        d.text((x + W // 2, y + H + 6), b, fill=(0x1E, 0x3A, 0x5F), font=f(22), anchor="mt")
    sheet.save(GEN / "contact_sheet.png")


def scene(bg, size, kid, bust_path, bust_px, name):
    """bg を size に cover で敷き、下1/3に会話欄、右上に胸上を置く"""
    W, H = size
    im = Image.open(GEN / f"{bg}.png").convert("RGB")
    s = max(W / im.width, H / im.height)
    im = im.resize((round(im.width * s), round(im.height * s)), Image.LANCZOS)
    l, t = (im.width - W) // 2, (im.height - H) // 2
    im = im.crop((l, t, l + W, t + H)).convert("RGBA")
    ov = Image.new("RGBA", im.size, (0, 0, 0, 0))
    d = ImageDraw.Draw(ov)
    m = max(8, W // 40)
    top = H * 2 // 3
    d.rounded_rectangle((m, top, W - m, H - m), radius=max(8, W // 60), fill=PANEL + (235,))
    im = Image.alpha_composite(im, ov)
    if bust_path:
        b = Image.open(bust_path).convert("RGBA").resize((bust_px, bust_px), Image.LANCZOS)
        im.alpha_composite(b, (W - bust_px - m, m))
    d = ImageDraw.Draw(im)
    fs = max(16, round(W / 21)) if W < 600 else round(W / 28)
    nf = f(round(fs * 0.85))
    d.text((m * 2, top + m), name, fill=NAME, font=nf)
    lines = wrap(d, script[kid]["text"], f(fs), W - m * 4)
    y = top + m + round(fs * 1.4)
    for ln in lines:
        d.text((m * 2, y), ln, fill=PANEL_TXT, font=f(fs))
        y += round(fs * 1.8)
    return im.convert("RGB")


def overlay_sample():
    cases = [("bg01", "k003", GUIDE, "しおり"), ("bg02", "k016", YM, "足利義満"),
             ("bg08", "k072", GUIDE, "しおり"), ("bg10", "k091", YM, "足利義満")]
    W, H, PAD = 768, 512, 16
    sheet = Image.new("RGB", (PAD + 2 * (W + PAD), PAD + 2 * (H + PAD)), WASHI)
    for i, (bg, kid, bust, name) in enumerate(cases):
        im = scene(bg, (W, H), kid, bust, 200, name)
        sheet.paste(im, (PAD + (i % 2) * (W + PAD), PAD + (i // 2) * (H + PAD)))
    sheet.save(CHK / "overlay_sample.png")


def mock375():
    cases = [("bg01", "k003", GUIDE, "しおり"), ("bg02", "k016", YM, "足利義満"),
             ("bg08", "k072", GUIDE, "しおり"), ("bg10", "k091", YM, "足利義満")]
    W, H, PAD = 375, 667, 16
    sheet = Image.new("RGB", (PAD + 4 * (W + PAD), PAD + H + PAD), WASHI)
    for i, (bg, kid, bust, name) in enumerate(cases):
        sheet.paste(scene(bg, (W, H), kid, bust, 120, name), (PAD + i * (W + PAD), PAD))
    sheet.save(CHK / "mock_375.png")


def stats():
    out = {}
    for b in IDS:
        im = Image.open(GEN / f"{b}.png").convert("L")
        w, h = im.size
        low = ImageStat.Stat(im.crop((0, h * 2 // 3, w, h))).mean[0]
        up = ImageStat.Stat(im.crop((0, 0, w, h * 2 // 3))).mean[0]
        tr = ImageStat.Stat(im.crop((w * 2 // 3, 0, w, h // 3))).stddev[0]
        out[b] = {"size": [w, h], "lower_third_mean_L": round(low, 1), "upper_two_thirds_mean_L": round(up, 1),
                  "upper_right_stddev_L": round(tr, 1)}
    (CHK / "stats.json").write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
    for k, v in out.items():
        print(k, v)


if __name__ == "__main__":
    contact(); overlay_sample(); mock375(); stats()
