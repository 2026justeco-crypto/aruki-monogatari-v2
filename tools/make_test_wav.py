"""音声の終わりで次へ進むかを確かめるための、短い無音の wav を作る（site/audio/_test/）。
使い方：python tools/make_test_wav.py
依存：標準ライブラリのみ
"""
import wave
from pathlib import Path

OUT = Path(__file__).resolve().parent.parent / "site" / "audio" / "_test"
RATE = 16000

for name, sec in (("silence1.wav", 1.5), ("silence2.wav", 2.5)):
    OUT.mkdir(parents=True, exist_ok=True)
    with wave.open(str(OUT / name), "wb") as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(RATE)
        w.writeframes(b"\x00\x00" * int(RATE * sec))
    print(f"{name} {sec}s")
