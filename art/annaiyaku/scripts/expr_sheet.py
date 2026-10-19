"""推し案の胸上＋表情差分4つを並べた一覧（和紙色の地・ラベルは画像の外）"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
R = Path(__file__).resolve().parent.parent
items = [("bust", "胸上（土台）"), ("expr_normal", "通常"), ("expr_smile", "微笑み"),
         ("expr_discover", "感心・発見"), ("expr_think", "考える")]
S, PAD, LAB = 400, 20, 44
sheet = Image.new("RGB", (PAD + len(items) * (S + PAD), PAD + S + LAB), (0xFA, 0xF6, 0xEE))
d = ImageDraw.Draw(sheet)
font = ImageFont.truetype(r"C:\Windows\Fonts\meiryo.ttc", 24)
for i, (k, lab) in enumerate(items):
    im = Image.open(R / "gen" / f"an3_{k}.png").convert("RGBA").resize((S, S), Image.LANCZOS)
    x = PAD + i * (S + PAD)
    sheet.paste(im, (x, PAD), im)
    d.text((x + S // 2, PAD + S + 8), lab, fill=(0x1E, 0x3A, 0x5F), font=font, anchor="mt")
sheet.save(R / "gen" / "an3_expressions_sheet.png")
print(sheet.size)
