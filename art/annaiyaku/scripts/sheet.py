"""4案の一覧画像（和紙色の地に並べる・案番号は画像の外の帯に描く）"""
import sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
R = Path(__file__).resolve().parent.parent
files = [R / "gen" / f"an{n}_stand.png" for n in (1, 2, 3, 4)]
W, H, PAD, LAB = 480, 720, 24, 48
sheet = Image.new("RGB", (PAD + 4 * (W + PAD), PAD + H + LAB + PAD), (0xFA, 0xF6, 0xEE))
d = ImageDraw.Draw(sheet)
try:
    font = ImageFont.truetype(r"C:\Windows\Fonts\meiryo.ttc", 26)
except OSError:
    font = ImageFont.load_default()
for i, f in enumerate(files):
    im = Image.open(f).convert("RGBA").resize((W, H), Image.LANCZOS)
    x = PAD + i * (W + PAD)
    sheet.paste(im, (x, PAD), im)
    d.text((x + W // 2, PAD + H + 10), f"案{i+1}", fill=(0x1E, 0x3A, 0x5F), font=font, anchor="mt")
out = R / "gen" / "contact_sheet.png"
sheet.save(out)
print(out.name, sheet.size)
