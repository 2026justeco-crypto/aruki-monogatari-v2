"""案内役の画像生成。プロンプトの正本は ../prompts.md（<!-- id: x --> 直後の ```text ブロック）。
使い方:
  python -I gen.py stand 1            # 案1の立ち姿
  python -I gen.py bust 1             # 案1の立ち姿を編集して胸上
  python -I gen.py expr 1 smile       # 案1の胸上を編集して表情差分（normal/smile/discover/think）
APIキーは etc/.secrets から読むだけで、表示・記録しない。
"""
import base64, datetime, json, re, sys, time
from pathlib import Path
from openai import OpenAI

ROOT = Path(__file__).resolve().parent.parent
GEN = ROOT / "gen"
LOG = GEN / "log.json"
MODEL = "gpt-image-2.5-sunburst"
QUALITY = "high"
# 公式の料金（2026-10-19 developers.openai.com/api/docs/models/gpt-image-2.5-sunburst で確認）USD / 1M tokens
RATE = {"text_in": 5.0, "image_in": 8.0, "image_out": 30.0}


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
    data = json.loads(LOG.read_text(encoding="utf-8")) if LOG.exists() else {"entries": []}
    data["entries"].append(entry)
    if "pricing" in data:
        data["pricing"]["total_usd_estimate"] = round(sum(e["cost_usd_estimate"] or 0 for e in data["entries"]), 4)
    LOG.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def run(kind, name, prompt, size, src=None):
    c = client()
    params = dict(model=MODEL, prompt=prompt, size=size, quality=QUALITY, background="transparent",
                  output_format="png", n=1)
    t0 = time.time()
    if src:
        with open(src, "rb") as f:
            raw = c.images.with_raw_response.edit(image=f, **params)
    else:
        raw = c.images.with_raw_response.generate(**params)
    r = raw.parse()
    out = GEN / f"{name}.png"
    out.write_bytes(base64.b64decode(r.data[0].b64_json))
    u = r.usage.model_dump() if getattr(r, "usage", None) else None
    entry = {
        "file": f"gen/{out.name}", "kind": kind, "endpoint": "images.edit" if src else "images.generate",
        "input_image": (f"gen/{Path(src).name}" if src else None),
        "model": MODEL, "size": size, "quality": QUALITY, "background": "transparent", "output_format": "png",
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


def main():
    b = blocks()
    kind, n = sys.argv[1], sys.argv[2]
    if kind == "stand":
        p = "\n\n".join([b["style"], b["character"], b["outfit" + n], b["stand"]])
        run("stand", f"an{n}_stand", p, "1024x1536")
    elif kind == "bust":
        p = "\n\n".join([b["style"], b["character"], b["outfit" + n], b["bust"]])
        run("bust", f"an{n}_bust", p, "1024x1024", src=GEN / f"an{n}_stand.png")
    elif kind == "expr":
        e = sys.argv[3]
        p = "\n\n".join([b["expr_common"], b["expr_" + e], b["style"]])
        run("expr", f"an{n}_expr_{e}", p, "1024x1024", src=GEN / f"an{n}_bust.png")
    else:
        raise SystemExit("unknown kind")


if __name__ == "__main__":
    main()
