# -*- coding: utf-8 -*-
"""金閣寺の台本の自己検品と story.json の出典集め。

使い方:  python kenpin_check.py
- script.json の facts が research/kinkakuji/facts.md に実在するか照合する
- 文字数（全体・単位ごとの最大）、12文字未満・40文字超の単位を数える
- 使った事実の確度（facts.md の最後の列）を拾い、「確実」以外を並べる
- facts の出典ID（[S..]）を集めて story.json の sources を書き直す（R＝二次は出典に入れず警告）
標準ライブラリだけで動く。
"""
import json, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parents[1]  # Active/aruki-v2
FACTS = ROOT / "research" / "kinkakuji" / "facts.md"
SOURCES = ROOT / "research" / "kinkakuji" / "sources.md"
SCRIPT = HERE / "script.json"
STORY = HERE / "story.json"

def parse_facts():
    facts = {}
    for line in FACTS.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*([TPWZ]\d{2})\s*\|", line)
        if not m:
            continue
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        facts[m.group(1)] = {
            "src": re.findall(r"\[([SR]\d+)\]", cols[-2]),
            "kakudo": cols[-1],
        }
    return facts

def parse_sources():
    src = {}
    for line in SOURCES.read_text(encoding="utf-8").splitlines():
        m = re.match(r"^\|\s*([SR]\d+)\s*\|", line)
        if not m:
            continue
        cols = [c.strip() for c in line.strip().strip("|").split("|")]
        sid = m.group(1)
        url = next((c for c in cols if c.startswith("http")), None)
        if sid.startswith("S") and len(cols) >= 5 and url == cols[3]:
            name = cols[2] if cols[2].startswith("「") else f"「{cols[2]}」"
            label = f"{cols[1]}{name}"          # 一次・公的: 発行元・名称
        else:
            label = f"コトバンク「{cols[1]}」（{cols[3]}）" if url == cols[2] else cols[1]
        src[sid] = {"id": sid, "label": label, "url": url}
    return src

def main():
    facts = parse_facts()
    srcs = parse_sources()
    units = json.loads(SCRIPT.read_text(encoding="utf-8"))
    ok = True

    # 1) facts の実在
    missing = [(u["id"], f) for u in units for f in u["facts"] if f not in facts]
    print(f"facts.md の事実ID: {len(facts)} 件")
    print("存在しない facts:", missing or "なし")
    ok &= not missing
    nofact = [u["id"] for u in units if not u["facts"] and not u.get("creative")]
    print("facts が空なのに creative でない単位:", nofact or "なし")
    ok &= not nofact

    # 2) 文字数
    lens = [len(u["text"]) for u in units]
    total = sum(lens)
    print(f"単位数: {len(units)} / 文字数（text 合計）: {total} / 最大: {max(lens)} / 最小: {min(lens)} / 平均: {total/len(units):.1f}")
    print(f"推定の長さ: {total/300:.1f} 分（300字/分）")
    short = [(u['id'], len(u['text'])) for u in units if len(u['text']) < 12]
    long_ = [(u['id'], len(u['text'])) for u in units if len(u['text']) > 40]
    print("12文字未満:", short or "0件", "/ 40文字超:", long_ or "0件")
    ok &= not short and not long_
    for s in sorted({u["scene"] for u in units}):
        us = [u for u in units if u["scene"] == s]
        print(f"  場面{s}: {len(us)}単位 {sum(len(u['text']) for u in us)}字")
    by_sp = {}
    for u in units:
        by_sp.setdefault(u["speaker"], []).append(len(u["text"]))
    print("話者別:", {k: f"{len(v)}単位/{sum(v)}字" for k, v in by_sp.items()})
    print("表情:", {e: sum(1 for u in units if u['expression'] == e) for e in ["normal", "smile", "discover", "think"]})
    bad_ex = [u["id"] for u in units if u["expression"] not in ("normal", "smile", "discover", "think")]
    print("規定外の表情:", bad_ex or "なし")
    ok &= not bad_ex

    # 3) 確度が「確実」以外の事実を使った単位
    print("\n確度が「確実」で始まらない事実を使った単位:")
    for u in units:
        nk = [f for f in u["facts"] if not facts[f]["kakudo"].startswith("確実")]
        if nk:
            print(f"  {u['id']} {nk} : {u['text']}")
            for f in nk:
                print(f"      {f} 確度= {facts[f]['kakudo']}")

    # 4) 出典の収集
    used = []
    for u in units:
        for f in u["facts"]:
            for s in facts[f]["src"]:
                if s not in used:
                    used.append(s)
    secondary = [s for s in used if s.startswith("R")]
    print("\n二次（R）の出典を引く事実:", secondary or "なし")
    ok &= not secondary
    prim = sorted([s for s in used if s.startswith("S")], key=lambda x: int(x[1:]))
    story = json.loads(STORY.read_text(encoding="utf-8"))
    story["sources"] = [srcs[s] for s in prim]
    story["factsUsed"] = sorted({f for u in units for f in u["facts"]}, key=lambda x: (x[0], int(x[1:])))
    story["charCount"] = total
    story["unitCount"] = len(units)
    STORY.write_text(json.dumps(story, ensure_ascii=False, indent=2) + "\n", encoding="utf-8", newline="\n")
    print("story.json の出典:", prim)

    # 5) 義満の台詞
    print("\n義満の台詞:")
    for u in units:
        if u["speaker"] == "yoshimitsu":
            print(f"  {u['id']} creative={u.get('creative')} {u['facts']} : {u['text']}")
            print(f"      {u.get('creativeNote')}")

    print("\n結果:", "OK" if ok else "NG")
    return 0 if ok else 1

if __name__ == "__main__":
    sys.exit(main())
