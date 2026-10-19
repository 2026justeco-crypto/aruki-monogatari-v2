# 案内役「しおり」画像生成プロンプト（OpenAI 画像API向け）

- 作成：2026-10-19（依頼02）
- 生成スクリプト：`art\annaiyaku\scripts\gen.py` が**このファイルの `<!-- id: ... -->` 直後のコードブロックをそのまま読んで**APIに渡す（このファイルが正本。スクリプト側にプロンプトを重複して書かない）
- 実際の最終プロンプト＝「共通の絵柄」＋「人物」＋各カットの指示 を空行で連結したもの。連結結果は `gen\log.json` に全文が残る
- **作家名・作品名・他社キャラクター名は入れていない**（下の各ブロックを目視で確認ずみ）。参考画像は一切入力しない（編集の入力は自分で生成した基本画像だけ）
- 出典欄：参考資料なし（言葉だけで指示）

---

## 1. 共通の絵柄（全カットの先頭に付ける）

意図：絵本・版画調の指定（線は細めで均一／塗りは平ら3〜4階調／和紙の質感／輪郭は少し単純／目は写実寄り／頭身1/6〜1/7／表情は眉と口元で控えめ）をすべて言葉で書く。木版画らしさで勝手に入りがちな**落款（赤い印）・文字**を明示的に禁止する。アニメ調・写真調・3DCG調を避ける。

<!-- id: style -->
```text
Picture-book illustration with a woodblock-print feel. Thin, even, uniform outlines in dark indigo, the same line weight everywhere. Flat color fills with only three to four tonal steps per color; no soft gradients, no airbrushing, no glossy highlights, no rim light. A subtle handmade washi paper fiber texture visible inside the flat fills. Slightly simplified contours and folds. Gentle storybook adult proportions: the whole figure is about six and a half heads tall, so the head is one-sixth to one-seventh of the total body height; the head is a little larger relative to the body than in fashion illustration, and the legs are not elongated. Eyes are realistic in size, not enlarged. The expression is quiet and shown mainly by the eyebrows and the corners of the mouth. Restrained palette built on deep indigo (#1E3A5F), muted vermilion (#A8432F) used only in small accents, moss green (#4F6B42), and warm off-white (#FAF6EE), plus natural skin and dark hair tones. Not photorealistic, not 3D rendered, not anime or manga style. Absolutely no text, no letters, no characters of any script, no logo, no signature, no watermark, no red seal stamp, no frame or border.
```

## 2. 人物（全カット共通）

意図：架空の案内役。20代後半〜30代の落ち着いた女性。特定の時代の装束に寄せず、和の要素は衿と羽織の形と紐だけ。持ち物は旅の記録帳（藍の表紙・朱の栞紐）。

<!-- id: character -->
```text
The character is a fictional travel guide and storyteller: a Japanese woman who appears to be in her late twenties to thirties, with a calm, grounded, friendly presence. Gentle oval face, fairly straight natural eyebrows, dark brown eyes of realistic size, a small mouth, little or no visible makeup. Dark, nearly black hair, parted so a little of the forehead shows, tied low at the nape with a plain cloth tie. She carries a travel record book: a hand-bound notebook slightly larger than her palm, with a deep indigo cover and a single thin vermilion bookmark cord hanging from it. The notebook cover is completely blank. Her clothing is a practical, timeless travel outfit that fits any era without belonging to one: a modern cut with only a light Japanese touch. No crest, no pattern with symbols, no jewelry, no glowing or magical elements.
```

## 3. 基本の立ち姿（4案）

意図：全身・正面やや斜め（体は約3/4向き、顔はこちら寄り）・背景は透過。サイズ 1024x1536（縦長）。4案は服の形だけを変え、顔と絵柄は共通。

<!-- id: stand -->
```text
Full-body standing pose, the whole figure visible from the top of the head to the shoes with a little empty space around it. The body is turned slightly, about three-quarter view toward the viewer's left, with the face turned almost toward the viewer and a calm, neutral, attentive expression. She holds the travel record book in one hand at waist height. Relaxed natural posture, weight on one leg. Plain transparent background, no ground shadow, no scenery, no props other than what is described.
```

### 案1（基本形）
<!-- id: outfit1 -->
```text
Outfit: a short deep indigo haori-like jacket ending just below the hips, closed at the front with a simple cord tie; under it an off-white inner top with a gently crossed collar; slim moss green wide-leg trousers ending at the ankle; plain dark walking shoes.
```

### 案2（長めの旅用コート＋布かばん）
<!-- id: outfit2 -->
```text
Outfit: a knee-length deep indigo travel coat with wide sleeves and a soft wrapped front, tied with a cord; an off-white inner top with a crossed collar; moss green tapered trousers; plain dark walking shoes; a small plain off-white cloth shoulder bag on a strap across the body.
```

### 案3（髪をゆるいお団子・衿元を少し高く）
<!-- id: outfit3 -->
```text
Outfit: a short deep indigo haori-like jacket ending just below the hips, closed with a cord tie; an off-white inner top with a slightly higher crossed collar; moss green wide-leg trousers; plain dark walking shoes. Hair variation for this version: the dark hair is gathered into a loose low bun at the nape instead of a tail, still with a plain cloth tie.
```

### 案4（ベスト風の軽装）
<!-- id: outfit4 -->
```text
Outfit: a sleeveless deep indigo vest with a crossed front closure tied by a cord, worn over an off-white long-sleeved inner top with a gently crossed collar and slightly wide sleeves; moss green wide-leg trousers; plain dark walking shoes.
```

## 4. 胸上（推しの1案だけ・基本画像を編集）

意図：再生画面の右上に出す胸上。**顔の位置と大きさを固定**して表情差分の土台にする。サイズ 1024x1024・正方形・透過。顔（額〜あご）が画面の高さの約40%、目の高さが上から約38%、顔の中心は左右中央。肩の線が下端で切れる。

<!-- id: bust -->
```text
Using the provided image of this exact character, create a chest-up portrait of the same woman: same face, same hairstyle, same clothing, same colors, same line weight and flat woodblock picture-book style. Framing: square image, head and shoulders down to mid-chest, the face centered horizontally, the eyes at about 38 percent from the top, the face (forehead to chin) taking about 40 percent of the image height, the shoulders cut off by the bottom edge. Face turned slightly toward the viewer's left, eyes looking at the viewer. Neutral, calm expression with a relaxed mouth. The notebook is not visible. Plain transparent background. Keep it a drawing, not a photo.
```

## 5. 表情差分（胸上を編集・同じ人物のまま表情だけ）

意図：胸上の画像を入力にして、**表情（眉・口元・まぶた）だけ**を変える。構図・顔の位置・服・髪・線・色は変えない。控えめに（歯を見せない・涙や汗の記号を入れない・漫画的な効果線なし）。

共通の前置き：
<!-- id: expr_common -->
```text
Edit the provided image. Keep everything identical: the same woman, same face shape, same hairstyle, same clothing, same colors, same framing and face position, same line weight and flat woodblock picture-book style, transparent background. Change only the facial expression, subtly, using the eyebrows, eyelids and the corners of the mouth. No teeth showing, no tears, no sweat drops, no blush marks, no comic effect lines, no text.
```

### 通常
<!-- id: expr_normal -->
```text
Expression: neutral and calm, attentive, mouth relaxed and closed, eyebrows level.
```

### 穏やかな微笑み
<!-- id: expr_smile -->
```text
Expression: a gentle, quiet smile; the corners of the mouth lifted slightly with lips closed, the lower eyelids softened a little, eyebrows relaxed.
```

### 感心・発見（控えめ）
<!-- id: expr_discover -->
```text
Expression: quiet, restrained interest, as if she has just noticed something meaningful; eyebrows raised very slightly, eyes a little more open, lips slightly parted without showing teeth. Not surprised or shocked.
```

### 静かに考える
<!-- id: expr_think -->
```text
Expression: quietly thinking; eyes looking slightly down and to the side, eyebrows drawn very slightly together, mouth closed and neutral. Calm, not troubled.
```

---

## 6. パラメータ（gen.py の既定）

| 項目 | 値 | 理由 |
|---|---|---|
| model | models 一覧で最新の gpt-image 系を選ぶ（2026-10-19 実測：`gpt-image-2.5-sunburst`。公式説明「Our most capable model for image generation and editing」） | 依頼の指定 |
| size | 立ち姿 1024x1536／胸上・表情 1024x1024 | 公式の推奨サイズ |
| quality | high | 線と和紙の質感を出すため |
| background | transparent ／ output_format png | 透過PNG（公式ガイドに記載あり） |
| n | 1（案ごとに1回呼ぶ） | 案番号とファイルを1対1にする |
| seed | APIに seed 引数なし（公式ガイドに記載なし）。代わりに応答の created・usage・リクエストIDを log.json に残す | 再現性の記録 |
