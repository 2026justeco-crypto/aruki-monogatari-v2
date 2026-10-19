# 金閣寺 背景 画像生成プロンプト（OpenAI 画像API向け）

- 作成：2026-10-19（依頼06）
- 生成スクリプト：`scripts\gen.py` が**このファイルの `<!-- id: ... -->` 直後のコードブロックをそのまま読んで**APIに渡す（このファイルが正本）
- 最終プロンプト＝各カットの「組み立て」に書いたブロックを空行で連結したもの。連結結果は `gen\log.json` に全文が残る
- **参考画像は一切入力しない**（他人が撮った金閣の写真・寺で撮った写真・観光サイトの画像は使わない＝kenri-chousa §4・§8）。編集（images.edit）の入力は**自分で生成した背景だけ**
- **作家名・作品名・他社キャラクター名は入れていない**（各ブロックを目視で確認）
- 出典欄：参考資料なし（言葉だけで指示）。建物の形の根拠は `research\kinkakuji\facts.md` の P04〜P09・P05（漱清）・P13・P14

---

## 1. 共通の絵柄（全カットの先頭）

意図：案内役（`art\annaiyaku\prompts.md` の style）と同じ言葉で「絵本・版画調」を指定し、風景向けに「光・水面・木々の奥行き」を足す。落款・文字を禁止。

<!-- id: style -->
```text
Picture-book illustration with a woodblock-print feel, a wide landscape background painting. Thin, even, uniform outlines in dark indigo, the same line weight everywhere. Flat color fills with only three to four tonal steps per color; no soft gradients, no airbrushing, no glossy highlights. A subtle handmade washi paper fiber texture visible inside the flat fills. Slightly simplified contours of trees, rocks and water. Depth is shown with layered planes: near, middle and far, with the far planes paler and cooler, and light shown as flat shapes of brighter color; reflections on the water are drawn as flat broken bands. Restrained palette built on deep indigo (#1E3A5F), moss green (#4F6B42), warm off-white (#FAF6EE) and muted vermilion (#A8432F) only in small accents, plus natural greens, browns and the gold of the building where described. Not photorealistic, not 3D rendered, not anime style. Absolutely no text, no letters, no characters of any script, no signboard, no logo, no signature, no watermark, no red seal stamp, no frame or border.
```

## 2. 構図（全カット共通）

意図：1536x1024 の横長。縦長スマホでは左右が切られる（中央の約 576px 幅だけ見える）ので主題は中央の帯に置く。下 1/3 は会話欄が重なるので暗く落ち着いた面。右上は話者の胸上が出るので抜けにする。

<!-- id: layout -->
```text
Composition rules: a wide 3:2 landscape. The main subject sits in the central third of the width and in the upper two-thirds of the height, so the picture still works when the left and right sides are cropped to a tall phone screen. The upper right area is open sky or soft distant foliage with no important detail. The bottom third of the image is a calm, darker, low-detail area such as shadowed water or shadowed ground, with no important objects in it. Eye-level or slightly raised viewpoint unless stated.
```

## 3. 今の金閣（形の正確な指定）

意図：三層・宝形造・柿葺・頂の鳳凰・**一層だけ金箔なし**（P04・P09）、一層は寝殿造で西側に池へ突き出た漱清（P05）、二層・三層は金箔（P09）、三層は禅宗様（P07）。屋根は板葺き（瓦でも金でもない）。

<!-- id: kinkaku -->
```text
The building is a three-story wooden temple pavilion standing at the edge of a pond, described precisely. First story: plain natural unpainted wood pillars and beams with white plaster wall panels and wooden lattice shutters, an open veranda; the first story is NOT gold. Second story: its walls, pillars and veranda railing are completely covered in gold leaf. Third story: smaller and square, completely covered in gold leaf, with bell-shaped cusped-arch windows in Zen temple style. Roofs: wide, gently curved eaves made of thin layered wooden shingles in dark grey-brown, never ceramic tile and never gold; one broad roof between the second and third stories and a top roof that is square and pyramidal, four slopes rising to a single point, crowned by a small golden phoenix statue. A small open wooden pavilion annex projects out over the water from the left side of the first story. Exactly three stories, no more.
```

## 4. 庭と山（今の景観）

<!-- id: garden -->
```text
Setting: a wide quiet pond in front of the pavilion, with small islands planted with low pine trees and a few large natural rocks rising from the water. Dense trees and Japanese pines frame the pavilion, and a gently rounded forested hill rises behind it as a borrowed background. The pavilion is reflected in the still pond. No other buildings are visible. No visitors, no fences, no signs, no lamps, no modern objects.
```

---

## 5. 各カット

### bg01 いま・朝・初夏（導入）
組み立て：style + layout + kinkaku + garden + bg01（新規生成）
<!-- id: bg01 -->
```text
Time: the present day, early morning in early summer. Fresh deep greens, soft clear morning light from the left, pale blue sky with a few thin clouds. The view is from the far bank of the pond, looking at the pavilion from the front at a slight angle. The pavilion's reflection lies in the pond below it; the lower third of the picture is the darker, shadowed near part of the pond with a few flat reflection bands.
```

### bg02 応永年間・北山殿の想像図・春（山場）
組み立て：style + layout + bg02（新規生成。今の境内の指定 garden は使わない）
改訂：1回目（`gen\bg02.png`→不採用で `bg02_try1.png` に改名）は周りの殿舎がはっきり描かれ、左上に桜が出た→「霞の中の淡い屋根の影だけ」「桜・花木なし」を足した。
意図：1397〜1408 の北山殿。舎利殿のほか仏殿・不動堂・泉殿など多くの建物があった（T14）が配置・形は資料に無い＝霞と遠景でぼかす。今ある方丈・夕佳亭・不動堂は描かない。扁額・文字なし（T15）。金箔は旺文社の記述（Z08）で二層・三層。
<!-- id: bg02 -->
```text
An imagined reconstruction of a nobleman's lakeside villa estate in Kyoto's northern hills around the year 1400, seen from a slightly raised viewpoint. Time: a calm spring day, soft pale greens and soft light. In the center, at the edge of a wide pond with small pine-covered islands and large natural rocks, stands a three-story pavilion: the first story plain natural wood with white plaster panels and not gold, the second and third stories covered in gold leaf, the third story small and square with cusped-arch windows, roofs of thin dark wooden shingles with gently curved eaves, the top roof square and pyramidal with a small golden phoenix on the peak. Around the pond, further away, several other low halls and long covered corridors are only suggested as pale, simplified flat silhouettes of roofs dissolving into a thick band of spring haze and trees, with no windows, no doors and no clear detail, clearly much fainter than the pavilion. A rounded forested hill behind, pale in the haze. The spring is shown only by soft fresh green leaves: no cherry blossoms, no flowering trees. No people. No plaques or name boards on any building.
```

### bg03 応永十五年三月・北山行幸（遠景）
組み立て：style + bg03（bg02 を入力にした編集）
意図：天皇の姿は描かない／顔が分かる大きさにしない（kenri §5）。桜は資料に無いので描かない。
<!-- id: bg03 -->
```text
Edit the provided image. Keep the same estate, the same pavilion, the same pond, the same viewpoint, the same flat woodblock picture-book style and colors. Change it into a festive spring day: along the far shore and between the distant halls, add long plain cloth curtains in muted indigo and off-white stretched on poles, and a few tiny distant lines of people in court robes, so small that no faces or individual features can be seen. No palanquin in the foreground, no single person emphasized, no cherry blossoms, no text, no crests or symbols on the curtains. Keep the bottom third of the picture calm and darker.
```

### bg04 室町・寺になったころ・曇り
組み立て：style + bg04（bg02 を入力にした編集）
意図：一部の建物が解体・移築された（T11）＝建物が減った寂しさ。夢窓疎石は故人（W16）なので人物は僧一人の後ろ姿のみ。
<!-- id: bg04 -->
```text
Edit the provided image. Keep the same pond, the same three-story pavilion with the plain first story and gold second and third stories, the same viewpoint and the same flat woodblock picture-book style. Change the weather to a quiet overcast day with a grey, even sky and muted colors. Remove most of the other halls and corridors around the pond, leaving only open ground, a few stone foundations half covered by grass, and trees, so the estate feels emptier and quieter. Add one very small distant figure of a Buddhist monk in a dark robe seen from behind on the far shore, no face visible. No text. Keep the bottom third of the picture calm and darker.
```

### bg05 応仁・文明の乱のころ・荒れた境内
組み立て：style + bg05（bg02 を入力にした編集）
意図：金閣が焼け残ったことだけ確か（T16・T17）。ほかの建物はぼかす。兵・戦闘・炎は描かない。
<!-- id: bg05 -->
```text
Edit the provided image. Keep the same pond, the same three-story pavilion with the plain first story and gold second and third stories, the same viewpoint and the same flat woodblock picture-book style. The pavilion still stands untouched. Change the rest of the estate into a desolate, neglected state under a cloudy sky: where the other halls stood there are now only blackened foundation stones, a few broken charred posts and overgrown tall grass, softened and partly hidden by haze in the distance; a single faint thin trail of old smoke far away. No fire, no flames, no soldiers, no weapons, no people, no text. Keep the bottom third of the picture calm and darker.
```

### bg06 江戸時代・修理された金閣と庭・夕方
組み立て：style + bg06（bg01 を入力にした編集）
意図：夕佳亭は3畳の数寄屋造の茶室（P21）。形の細部は資料なし＝想像図。木立の中に小さく。
<!-- id: bg06 -->
```text
Edit the provided image. Keep the same pavilion exactly as it is (plain first story, gold second and third stories, dark wooden shingle roofs, phoenix on top), the same pond, the same viewpoint and the same flat woodblock picture-book style. Change the time to a calm evening in the seventeenth century: warm low light from the left, the sky turning soft orange and indigo. On the wooded slope behind and to the right of the pavilion, partly hidden among trees, add one very small, simple rustic tea hut with a plain roof and an earthen-colored wall, modest and quiet. No people, no text, no lanterns. Keep the bottom third of the picture calm and darker.
```

### bg07 明治後半・解体修理の足場
組み立て：style + bg07（bg01 を入力にした編集）
意図：修理で詳しい図面が作られた（T26）。年は絵に書かない。人物は描かない。図面に文字を描かない。
<!-- id: bg07 -->
```text
Edit the provided image. Keep the same pond, the same viewpoint and the same flat woodblock picture-book style. Change the time to a plain daytime around the year 1905: the pavilion is surrounded by a traditional scaffolding of tied wooden poles and planks during careful repair work, the pavilion's shape still recognizable behind the scaffolding. In the lower left foreground, at the edge of the picture, add the corner of a simple wooden work table with a large sheet of paper showing a precise architectural line drawing of the pavilion's elevation (only lines, no letters, no numbers), a wooden ruler and a small ink stone. No people. No text anywhere. The bottom third stays darker and calm apart from that table corner.
```

### bg08 昭和二十五年七月・夜明け前の鏡湖池
組み立て：style + bg08（bg01 を入力にした編集）
意図：炎・焼け跡・人物を描かない。金閣のあった場所は霧と暗がりで見せない。鳳凰と額が外されていた（T29）が、保管の場所・様子は資料に無いので描き込まない。
<!-- id: bg08 -->
```text
Edit the provided image. Keep the same pond, the same islands, the same trees and hill and the same viewpoint and the same flat woodblock picture-book style. Change the time to the deep blue darkness just before dawn on a summer night. Remove the pavilion completely: where it stood, there is only a thick, soft bank of pale mist and darkness among the trees, so nothing of the building can be seen. The pond is still and dark, with only a faint pale band of the coming dawn reflected on it. Quiet and solemn. No fire, no flames, no glow of fire, no smoke, no ruins, no people, no text.
```

### bg09 昭和三十年・再建されたばかりの金閣
組み立て：style + bg09（bg01 を入力にした編集）
意図：明治の図面にもとづく復原（T33）＝形は bg01 と同じ。落成の月日は未確認なので季節を決めすぎない。
<!-- id: bg09 -->
```text
Edit the provided image. Keep the same pavilion shape exactly (plain unpainted first story, gold second and third stories, dark wooden shingle roofs, square pyramidal top roof with a phoenix), the same pond, the same viewpoint and the same flat woodblock picture-book style. Change the light to a clear, bright midday under a deep blue sky with small white clouds. The gold of the second and third stories is fresh and bright, the wood of the first story looks new and pale. The season is not clearly marked: plain green trees, no blossoms, no autumn colors, no snow. No people, no text. Keep the bottom third of the picture calm and darker.
```

### bg10 いま・夕方の金閣（終わり）
組み立て：style + bg10（bg01 を入力にした編集）
意図：bg01 と同じ構図で夕日。水面に映る金閣をはっきり（P21 夕佳亭の名の由来）。
<!-- id: bg10 -->
```text
Edit the provided image. Keep the same pavilion exactly (plain first story, gold second and third stories, dark wooden shingle roofs, phoenix on top), the same pond, the same viewpoint and the same flat woodblock picture-book style. Change the time to late afternoon sunset: warm low sunlight from the left lights the gold stories in a deep warm glow, the sky shades from soft orange near the horizon to indigo above, the trees turn darker. The reflection of the golden pavilion on the still pond is clear and complete. No people, no text. Keep the bottom third of the picture calm and darker, the near water in deep indigo.
```

---

## 6. パラメータ（gen.py の既定）

| 項目 | 値 | 理由 |
|---|---|---|
| model | `gpt-image-2.5-sunburst`（2026-10-19 実測：models 一覧の gpt-image 系の最新。依頼02と同じ） | 依頼の指定 |
| size | 1536x1024 | 依頼の指定（横長・左右を切っても成り立つ構図） |
| quality | high | 線と和紙の質感を出すため |
| background | opaque ／ output_format png | 背景なので不透明 |
| n | 1 | カットとファイルを1対1にする |
| 編集の入力 | bg03・bg04・bg05＝bg02／bg06〜bg10＝bg01 | 同じ景色の時代差分で、建物の形と構図をそろえるため（入力は自作の生成画像だけ） |
