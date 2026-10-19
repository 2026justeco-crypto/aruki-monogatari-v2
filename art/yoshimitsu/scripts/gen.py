"""足利義満（胸上・表情差分）の画像生成。プロンプトの正本は ../prompts.md（<!-- id: x --> 直後の ```text ブロック）。
手本：art/annaiyaku/scripts/gen.py
使い方:
  python -I gen.py bust            # 胸上（新規生成）
  python -I gen.py smile           # 胸上を編集して表情差分（normal/smile）。上書きしない（_r2, _r3 を付ける）
APIキーは etc/.secrets から読むだけで、表示・記録しない。
"""
import base64, datetime, json, os, re, sys, time
from pathlib import Path
from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
GEN = ROOT / "gen"
LOG = GEN / "log.json"
MODEL = "gpt-image-2.5-sunburst"
QUALITY = "high"
SIZE = "1024x1024"
# 公式の料金（依頼02 が 2026-10-19 に developers.openai.com/api/docs/models/gpt-image-2.5-sunburst で確認した値）USD / 1M tokens
RATE = {"text_in": 5.0, "image_in": 8.0, "image_out": 30.0}

# 組み立て（ブロックの並び）と編集の入力。表情は案内役の gen.py と同じ並び
PLAN = {
    "bust": (["style", "character", "bust"], None, "ym_bust"),
    "normal": (["expr_common", "expr_normal", "style"], "ym_bust", "ym_expr_normal"),
    "smile": (["expr_common", "expr_smile", "style"], "ym_bust", "ym_expr_smile"),
}


def blocks():
    t = (ROOT / "prompts.md").read_text(encoding="utf-8")
    return {m.group(1): m.group(2).strip() for m in re.finditer(r"<!-- id: (\w+) -->\s*```text\n(.*?)```", t, re.S)}


def client():
    key = Path(r"C:\Justeco\etc\.secrets\openai_api_key.txt").read_text(encoding="utf-8").strip()
    return OpenAI(api_key=key, timeout=600)


def cost(u):
    if not u:
        return None
    d = u.get("input_tokens_details") or {}
    ti, ii = d.get("text_tokens", 0) or 0, d.get("image_tokens", 0) or 0
    out = u.get("output_tokens", 0) or 0
    return round((ti * RATE["text_in"] + ii * RATE["image_in"] + out * RATE["image_out"]) / 1e6, 5)


def log(entry):
    # 並行実行で log.json を取り合わないよう、作成専用のロックファイルで順番待ちする
    lock = GEN / "log.lock"
    for _ in range(600):
        try:
            fd = os.open(lock, os.O_CREAT | os.O_EXCL)
            break
        except FileExistsError:
            time.sleep(0.1)
    try:
        _log(entry)
    finally:
        os.close(fd)
        lock.unlink()


def _log(entry):
    if LOG.exists():
        data = json.loads(LOG.read_text(encoding="utf-8"))
    else:
        data = {"pricing": {"source": "https://developers.openai.com/api/docs/models/gpt-image-2.5-sunburst（依頼02が2026-10-19に確認した単価を流用）",
                            "rates_usd_per_1M_tokens": {"text_input": RATE["text_in"], "image_input": RATE["image_in"], "image_output": RATE["image_out"]},
                            "note": "各エントリの usage（APIが返したトークン数）×上の単価で計算した概算。請求額そのものは未確認"},
                "entries": []}
    data["entries"].append(entry)
    data["pricing"]["total_usd_estimate"] = round(sum(e["cost_usd_estimate"] or 0 for e in data["entries"]), 4)
    LOG.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def outpath(name):
    p = GEN / f"{name}.png"
    i = 2
    while p.exists():
        p = GEN / f"{name}_r{i}.png"
        i += 1
    return p


def run(name):
    ids, src_id, fname = PLAN[name]
    b = blocks()
    prompt = "\n\n".join(b[i] for i in ids)
    src = GEN / f"{src_id}.png" if src_id else None
    c = client()
    params = dict(model=MODEL, prompt=prompt, size=SIZE, quality=QUALITY, background="transparent",
                  output_format="png", n=1)
    t0 = time.time()
    if src:
        with open(src, "rb") as f:
            raw = c.images.with_raw_response.edit(image=f, **params)
    else:
        raw = c.images.with_raw_response.generate(**params)
    r = raw.parse()
    out = outpath(fname)
    out.write_bytes(base64.b64decode(r.data[0].b64_json))
    u = r.usage.model_dump() if getattr(r, "usage", None) else None
    entry = {
        "file": f"gen/{out.name}", "kind": name, "endpoint": "images.edit" if src else "images.generate",
        "input_image": (f"gen/{src.name}" if src else None), "blocks": ids,
        "model": MODEL, "size": SIZE, "quality": QUALITY, "background": "transparent", "output_format": "png",
        "prompt": prompt,
        "seed_equivalent": {"note": "APIにseed引数なし。再現の手がかりとして応答のcreatedとリクエストIDを残す",
                            "created": getattr(r, "created", None), "request_id": raw.headers.get("x-request-id")},
        "revised_prompt": getattr(r.data[0], "revised_prompt", None),
        "usage": u, "cost_usd_estimate": cost(u),
        "generated_at": datetime.datetime.now().astimezone().isoformat(timespec="seconds"),
        "elapsed_sec": round(time.time() - t0, 1),
    }
    log(entry)
    print(out.name, "cost~$", entry["cost_usd_estimate"], "sec", entry["elapsed_sec"])


if __name__ == "__main__":
    run(sys.argv[1])
