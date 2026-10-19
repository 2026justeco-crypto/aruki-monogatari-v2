# 足利義満 画像生成プロンプト（OpenAI 画像API向け）

- 作成：2026-10-19（依頼06）
- 生成スクリプト：`scripts\gen.py` が**このファイルの `<!-- id: ... -->` 直後のコードブロックをそのまま読んで**APIに渡す（このファイルが正本）
- 最終プロンプト＝各カットの組み立てどおりにブロックを空行で連結したもの。全文は `gen\log.json`
- **参考画像は入力していない**（言葉だけで作成）。鹿苑寺蔵の肖像などは ColBase で加工可の画像を見つけられず、文化遺産オンラインの画像は入力に使えない（kenri-chousa §2）ため、依頼文の「迷ったら入力せず言葉だけ」に従った。編集（images.edit）の入力は自分で生成した胸上だけ
- **作家名・作品名・他社キャラクター名は入れていない**（目視で確認）
- 出典欄：参考資料なし。人物の事実の根拠は `research\kinkakuji\facts.md` W01・W07・W08・T07（詳細は `settei.md`）
- 絵柄・構図の言葉は案内役（`art\annaiyaku\prompts.md` の style・bust・expr_common）と同じ文をそのまま使い、人物に合わない部分（配色の藍・苔の服など）だけ差し替えた

---

## 1. 共通の絵柄（案内役の style と同じ文。配色の行だけ人物用に変更）

<!-- id: style -->
```text
Picture-book illustration with a woodblock-print feel. Thin, even, uniform outlines in dark indigo, the same line weight everywhere. Flat color fills with only three to four tonal steps per color; no soft gradients, no airbrushing, no glossy highlights, no rim light. A subtle handmade washi paper fiber texture visible inside the flat fills. Slightly simplified contours and folds. Eyes are realistic in size, not enlarged. The expression is quiet and shown mainly by the eyebrows and the corners of the mouth. Restrained palette: ink black and deep charcoal for the robe, muted ochre-brown and dull gold for the stole, warm off-white (#FAF6EE), deep indigo (#1E3A5F) only in the outlines and darkest shadows, plus natural skin tones. Not photorealistic, not 3D rendered, not anime or manga style, not a caricature. Absolutely no text, no letters, no characters of any script, no logo, no signature, no watermark, no red seal stamp, no frame or border.
```

## 2. 人物

意図：応永4年（1397）北山殿造営開始＝数え40歳、応永15年（1408）没＝51歳（W08・T07）→ 40代後半〜50歳ごろの印象。応永2年（1395）に出家（W07）→ 剃髪・僧衣（剃髪・衣の色・袈裟の様子は**解釈**。settei.md 参照）。美化もおとしめもしない。

<!-- id: character -->
```text
The character is a Japanese man in his late forties to about fifty, a retired ruler of the Muromachi period who has become a Buddhist monk but still holds power. His head is cleanly shaven, with no hair, no topknot and no hat. His face is clean-shaven. An ordinary, mature, healthy face drawn honestly, neither idealized nor made ugly: a broad forehead, slightly full cheeks, straight dark eyebrows, calm dark eyes of realistic size with a few faint lines at the corners, a firm closed mouth. He has a composed, dignified, self-assured presence without arrogance. He wears a plain ink-black Buddhist monk's robe with wide sleeves and a crossed collar, with a white under-collar showing at the neck, and a muted ochre-brown monk's stole made of rectangular patchwork panels draped over his left shoulder. No crest, no jewelry, no prayer beads in view, no glowing or magical elements.
```

## 3. 胸上（基本）

改訂：1回目（`gen\ym_bust_try1.png`）は顔の陰影・しわが写実寄りで案内役より描き込みが多く、顔も規格より大きかった（目の高さ約31%・顔の高さ約50%）→ 平らな肌・陰1段・しわを描かないを足した。
意図：案内役の胸上と**同じ規格**（1024x1024・透過・目の高さ上から約38%・顔の高さ約40%・顔は左右中央・肩が下端で切れる）。顔は案内役と逆の向き（右上に出したとき画面の中を向くよう、どちらにも使える正面寄り）。

<!-- id: bust -->
```text
Chest-up portrait. Draw the face in the same simple storybook manner as a picture-book character: the skin and the shaven head are one flat skin color with only one slightly darker flat shadow shape, no shading on the scalp, no realistic modeling of the skull, no detailed wrinkles (at most two thin faint lines near the eyes), a simple line for the nose, outlines kept thin and even. Framing: square image, head and shoulders down to mid-chest, the face centered horizontally, the eyes at about 38 percent from the top, the face (top of the head to chin) taking about 40 percent of the image height, the shoulders cut off by the bottom edge. Face turned slightly toward the viewer's left, eyes looking at the viewer. Neutral, calm expression with a relaxed closed mouth. Plain transparent background. Keep it a drawing, not a photo.
```

## 4. 表情差分（胸上を編集）

script.json で義満が使う表情は **normal（2回：k016・k017）と smile（3回：k031・k085・k091）だけ**（2026-10-19 に数えた）。discover・think は作らない。

<!-- id: expr_common -->
```text
Edit the provided image. Keep everything identical: the same man, same face shape, same shaven head, same clothing, same colors, same framing and face position, same line weight and flat woodblock picture-book style, transparent background. Change only the facial expression, subtly, using the eyebrows, eyelids and the corners of the mouth. No teeth showing, no tears, no sweat drops, no blush marks, no comic effect lines, no text.
```

<!-- id: expr_normal -->
```text
Expression: neutral and calm, composed, mouth relaxed and closed, eyebrows level.
```

<!-- id: expr_smile -->
```text
Expression: a restrained, quiet smile of an older man; the corners of the mouth lifted slightly with lips closed, the lower eyelids softened a little, eyebrows relaxed. Warm but dignified, not a grin.
```

---

## 5. パラメータ

| 項目 | 値 |
|---|---|
| model | `gpt-image-2.5-sunburst`（2026-10-19 実測で models 一覧の最新の gpt-image 系） |
| size | 1024x1024（案内役の胸上と同じ） |
| quality | high |
| background | transparent ／ png |
| 組み立て | 胸上＝style + character + bust（新規生成）／表情＝expr_common + expr_X + style（胸上を入力に編集。案内役と同じ並び） |
