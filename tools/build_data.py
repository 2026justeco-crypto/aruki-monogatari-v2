"""content・art・research から site\\data\\ の JSON を作る（手で写さない）。

作るもの：
  site/data/stories.json          物語の一覧（地方・時代の表つき）
  site/data/people.json           人物（しおり・足利義満）。図鑑カードの「史料にもとづく点／解釈した点」と出典
  site/data/<id>/script.json      会話単位（表示用の本文・読み・演技指示・背景・音声）
読むだけのもの：content/ art/ research/（書き換えない）
使い方：python tools/build_data.py
依存：標準ライブラリのみ
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SITE = ROOT / "site"
STORY_IDS = ["kinkakuji"]

# 画面で使う人物の表情（絵があるものだけ）。台本でこれ以外が指定されたら normal にする
EXPRESSIONS = {
    "guide": ["normal", "smile", "discover", "think"],
    "yoshimitsu": ["normal", "smile"],
}
IMG_PEOPLE = "img/people"
HOME_BG = "bg10"   # ホームの景色（夕日）
COVER_BG = "bg01"  # 探す・詳細・図鑑の景色

REGIONS = [
    ("hokkaido", "北海道", ["北海道"]),
    ("tohoku", "東北", ["青森県", "岩手県", "宮城県", "秋田県", "山形県", "福島県"]),
    ("kanto", "関東", ["茨城県", "栃木県", "群馬県", "埼玉県", "千葉県", "東京都", "神奈川県"]),
    ("chubu", "中部", ["新潟県", "富山県", "石川県", "福井県", "山梨県", "長野県", "岐阜県", "静岡県", "愛知県"]),
    ("kinki", "近畿", ["三重県", "滋賀県", "京都府", "大阪府", "兵庫県", "奈良県", "和歌山県"]),
    ("chugoku", "中国", ["鳥取県", "島根県", "岡山県", "広島県", "山口県"]),
    ("shikoku", "四国", ["徳島県", "香川県", "愛媛県", "高知県"]),
    ("kyushu", "九州・沖縄", ["福岡県", "佐賀県", "長崎県", "熊本県", "大分県", "宮崎県", "鹿児島県", "沖縄県"]),
]
ERAS = [
    ("jomon", "縄文"), ("yayoi", "弥生"), ("kofun", "古墳"), ("asuka", "飛鳥"), ("nara", "奈良"),
    ("heian", "平安"), ("kamakura", "鎌倉"), ("muromachi", "室町"), ("azuchimomoyama", "安土桃山"),
    ("edo", "江戸"), ("meiji", "明治"), ("taisho", "大正"), ("showa", "昭和"), ("heisei", "平成"), ("reiwa", "令和"),
]


def read_json(p: Path):
    return json.loads(p.read_text(encoding="utf-8"))


def write_json(p: Path, data) -> None:
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print(f"書いた: {p.relative_to(ROOT).as_posix()}")


def plain(md: str) -> str:
    """Markdown の強調・コードの記号を外す"""
    s = re.sub(r"\*\*(.+?)\*\*", r"\1", md)
    s = re.sub(r"`(.+?)`", r"\1", s)
    return s.strip()


def public(s: str) -> str:
    """設定メモの中の作業用の書き込み（台詞IDの注・【判断】の注）を外す"""
    s = re.sub(r"（台詞[^）]*）", "", s)
    s = re.sub(r"[。\s]*【[^】]*】.*$", "", s)
    return s.strip()


def md_section(text: str, heading_prefix: str) -> str:
    """「## 2. …」のような見出しから次の「## 」までを返す"""
    lines = text.splitlines()
    out, on = [], False
    for ln in lines:
        if ln.startswith("## "):
            if on:
                break
            on = ln.startswith(heading_prefix)
            continue
        if on:
            out.append(ln)
    if not on and not out:
        raise SystemExit(f"見出しが見つかりません: {heading_prefix}")
    return "\n".join(out)


def md_table(section: str) -> list[list[str]]:
    """節の中の最初の表を行ごとのセルの配列で返す（見出し行・区切り行は除く）"""
    rows = [ln for ln in section.splitlines() if ln.strip().startswith("|")]
    cells = [[c.strip() for c in r.strip().strip("|").split("|")] for r in rows]
    return [r for r in cells[2:] if r and not set("".join(r)) <= set("-: ")]


# ---------- 出典 ----------
def load_sources(story: dict) -> dict:
    """出典ID → {id, label, url}。story.json のラベルを優先し、無いものは sources.md から作る"""
    out = {}
    text = (ROOT / "research" / "kinkakuji" / "sources.md").read_text(encoding="utf-8")
    for row in md_table_all(text):
        if not re.fullmatch(r"S\d+", row[0]):
            continue
        url = next((c for c in row if c.startswith("http")), None)
        if len(row) >= 5 and row[3].startswith("http"):
            label = f"{row[1]}「{row[2]}」"
        else:
            label = f"コトバンク「{row[1]}」（{row[3]}）" if len(row) >= 4 else row[1]
        out[row[0]] = {"id": row[0], "label": plain(label), "url": url}
    for s in story.get("sources", []):
        out[s["id"]] = {"id": s["id"], "label": s["label"], "url": s.get("url")}
    return out


def md_table_all(text: str) -> list[list[str]]:
    rows = []
    for ln in text.splitlines():
        if ln.strip().startswith("|"):
            cells = [c.strip() for c in ln.strip().strip("|").split("|")]
            if cells and not set("".join(cells)) <= set("-: "):
                rows.append(cells)
    return rows


def load_fact_sources() -> dict:
    """facts.md の事実ID → 出典IDの一覧"""
    text = (ROOT / "research" / "kinkakuji" / "facts.md").read_text(encoding="utf-8")
    out = {}
    for row in md_table_all(text):
        if re.fullmatch(r"[TPWZ]\d+", row[0]):
            ids = []
            for c in row[1:]:
                ids += re.findall(r"\[(S\d+)\]", c)
            out[row[0]] = list(dict.fromkeys(ids))
    return out


# ---------- 台本 ----------
def build_script(story_id: str) -> tuple[list, dict, list]:
    src = read_json(ROOT / "content" / story_id / "script.json")
    units, bgs, fixed = [], {}, []
    for u in src:
        sp = u["speaker"]
        if sp not in EXPRESSIONS:
            raise SystemExit(f"{u['id']}: 知らない話者 {sp}")
        ex = u.get("expression") or "normal"
        if ex not in EXPRESSIONS[sp]:
            fixed.append(f"{u['id']} {sp} {ex}->normal")
            ex = "normal"
        bid = u["bgId"]
        if not (SITE / "img" / "bg" / story_id / f"{bid}.webp").exists():
            raise SystemExit(f"{u['id']}: 背景 {bid} の WebP がありません（先に convert_images.py）")
        # 括弧の中は絵を作るときの注（「人物は描かない」など）なので画面には出さない
        bgs.setdefault(bid, {"src": f"img/bg/{story_id}/{bid}.webp", "label": re.split(r"[（(]", u.get("bg", ""))[0].strip()})
        units.append({
            "id": u["id"],
            "scene": u.get("scene"),
            "speaker": sp,
            "expression": ex,
            "text": u["text"],
            "reading": u.get("reading", ""),
            "direction": u.get("direction", ""),
            "bgId": bid,
            "creative": bool(u.get("creative")),
            "facts": u.get("facts", []),
            "audio": u.get("audio"),
            "duration": u.get("duration"),
        })
    return units, bgs, fixed


# ---------- 人物 ----------
def person_images(pid: str) -> dict:
    imgs = {}
    for ex in EXPRESSIONS[pid]:
        rel = f"{IMG_PEOPLE}/{pid}_{ex}.webp"
        if not (SITE / rel).exists():
            raise SystemExit(f"人物の WebP がありません: {rel}")
        imgs[ex] = rel
    bust = f"{IMG_PEOPLE}/{pid}_bust.webp"
    imgs["bust"] = bust if (SITE / bust).exists() else imgs["normal"]
    return imgs


def build_guide(story: dict, ch: dict) -> dict:
    text = (ROOT / "art" / "annaiyaku" / "settei.md").read_text(encoding="utf-8")
    pos = md_section(text, "## 2.")
    quote = " ".join(plain(ln.lstrip("> ")) for ln in pos.splitlines() if ln.startswith(">"))
    speech = md_table(md_section(text, "## 3."))
    first_person = next((plain(r[1]) for r in speech if r[0] == "一人称"), "")
    look = md_table(md_section(text, "## 5."))
    item = next((plain(r[1]) for r in look if r[0] == "持ち物"), "")
    names = md_table(md_section(text, "## 1."))
    origin = next((plain(r[2]).split("。")[0] + "。" for r in names if "しおり" in r[0]), "")
    return {
        "id": "guide",
        "name": ch["name"],
        "reading": "しおり",
        "role": ch["role"],
        "born": None,
        "died": None,
        "desc": quote,
        "historical": False,
        "basis": "sousaku",
        "faceBasis": "sousaku",
        "factBasis": None,
        "images": person_images("guide"),
        "card": {
            "summary": "物語をつなぐ架空の案内役です。史実の人物ではありません。",
            "creative": [p for p in [
                f"立場：{quote}" if quote else "",
                f"一人称：{first_person}" if first_person else "",
                f"持ち物：{item.removeprefix('旅の記録帳：')}" if item else "",
                f"名前の由来：{origin}" if origin else "",
            ] if p],
            "artNote": "挿絵：AIで新しく描いた架空の人物の絵です。",
        },
        "sources": [],
        "stories": [story["id"]],
    }


def build_yoshimitsu(story: dict, ch: dict, sources: dict, fact_src: dict) -> dict:
    text = (ROOT / "art" / "yoshimitsu" / "settei.md").read_text(encoding="utf-8")
    m = re.search(r"画面の表示文言の例[^「]*「(.+?)」", text)
    art_note = m.group(1) if m else "挿絵：AIで新しく描いた想像図です。"
    shiryo, used = [], []
    for row in md_table(md_section(text, "## 2.")):
        fids = re.findall(r"\b([TPWZ]\d+)\b", row[1])
        sids = []
        for f in fids:
            sids += fact_src.get(f, [])
        sids = list(dict.fromkeys(sids))
        used += sids
        shiryo.append({"point": public(plain(row[0])), "facts": fids, "sources": sids})
    kaishaku = []
    for row in md_table(md_section(text, "## 3.")):
        kaishaku.append({"point": plain(row[0]), "decision": public(plain(row[1]))})
    yomi = read_json(ROOT / "research" / "kinkakuji" / "yomi.json")
    used = list(dict.fromkeys(used))
    missing = [s for s in used if s not in sources]
    if missing:
        raise SystemExit(f"義満の出典IDが sources に無い: {missing}")
    return {
        "id": "yoshimitsu",
        "name": ch["name"],
        "reading": yomi.get(ch["name"], ""),
        "role": ch["role"],
        "born": ch.get("born"),
        "died": ch.get("died"),
        "desc": ch["role"],
        "historical": True,
        "basis": "shiryo",
        "faceBasis": "kaishaku",
        "factBasis": "shiryo",
        "images": person_images("yoshimitsu"),
        "card": {
            "summary": "人物の事実は史料にもとづきます。顔は肖像を写しておらず、解釈で描いています。",
            "shiryo": shiryo,
            "kaishaku": kaishaku,
            "artNote": art_note,
        },
        "sources": [sources[s] for s in used],
        "stories": [story["id"]],
    }


def main() -> None:
    if hasattr(sys.stdout, "reconfigure"):  # Windows の端末でも文字化けしない
        sys.stdout.reconfigure(encoding="utf-8")
    stories, people = [], {}
    fact_src = load_fact_sources()
    for sid in STORY_IDS:
        st = read_json(ROOT / "content" / sid / "story.json")
        units, bgs, fixed = build_script(sid)
        if len(units) != st.get("unitCount", len(units)):
            raise SystemExit(f"単位の数が合わない: script {len(units)} / story {st.get('unitCount')}")
        write_json(SITE / "data" / sid / "script.json", units)
        for f in fixed:
            print(f"表情を normal にした: {f}")
        sources = load_sources(st)
        has_audio = any(u["audio"] for u in units)
        for k in ("finale",):
            if st[k]["quoteId"] not in {u["id"] for u in units}:
                raise SystemExit(f"finale.quoteId {st[k]['quoteId']} が台本に無い")
        stories.append({
            "id": st["id"],
            "title": st["title"],
            "place": st["place"],
            "placeShort": st["placeShort"],
            "area": st["area"],
            "region": st["region"],
            "pref": st["pref"],
            "era": st["era"],
            "year": st["year"],
            "yearLabel": st["yearLabel"],
            "people": st["people"],
            "mentioned": st.get("mentioned", []),
            "durationMin": st["durationMin"],
            "durationNote": st.get("durationNote", ""),
            "language": "日本語",
            "onSite": "どこでも聴ける",
            "question": st["question"],
            "finale": st["finale"],
            "finaleQuestion": st.get("finaleQuestion", ""),
            "disclaimer": st.get("disclaimer", []),
            "basis": st.get("basis", "shiryo"),
            "sources": st.get("sources", []),
            "assets": {"script": "あり", "audio": "あり" if has_audio else "なし（文字だけで進みます）", "art": "あり"},
            "images": {"home": bgs.get(HOME_BG, {}).get("src"), "cover": bgs.get(COVER_BG, {}).get("src")},
            "bgs": bgs,
            "unitCount": len(units),
            "charCount": st.get("charCount"),
        })
        chars = {c["id"]: c for c in st["characters"]}
        if "guide" in chars and "guide" not in people:
            people["guide"] = build_guide(st, chars["guide"])
        if "yoshimitsu" in chars and "yoshimitsu" not in people:
            people["yoshimitsu"] = build_yoshimitsu(st, chars["yoshimitsu"], sources, fact_src)
    write_json(SITE / "data" / "stories.json", {
        "note": "tools/build_data.py が content・art・research から作ったもの。手で直さない",
        "regions": [{"id": i, "name": n, "prefs": p} for i, n, p in REGIONS],
        "eras": [{"id": i, "name": n} for i, n in ERAS],
        "stories": stories,
    })
    write_json(SITE / "data" / "people.json", {
        "note": "tools/build_data.py が作ったもの。手で直さない",
        "people": [people[k] for k in ("yoshimitsu", "guide") if k in people],
    })


if __name__ == "__main__":
    main()
