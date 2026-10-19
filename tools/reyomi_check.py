"""依頼09-2（使い方: aruki-v2-tts の venv-check の python で  python -I tools/reyomi_check.py 出力.json ／ SKIPAB=1 で A・B を省く）
：kiite.md 1〜6 の単位を、依頼07と別の手段で確かめる。
A: large-v3・プロンプトなし・beam5（依頼07と同条件の再現）
B: large-v3・initial_prompt に固有名（正しい表記）を入れる
C: 強制採点：正しい読み（かな）と誤りの読み（かな）を文に入れ、Whisper にその文字列を強制して
   トークンごとの対数確率を合計し比べる（音がどちらの読みに近いか）。
"""
import json, os, sys, math
os.environ["HF_HOME"] = r"C:\Justeco\Active\aruki-v2-tts\hf-cache"
os.environ["HF_HUB_OFFLINE"] = "1"
_TL = r"C:\Justeco\Active\aruki-v2-tts\Irodori-TTS\.venv\Lib\site-packages\torch\lib"
os.add_dll_directory(_TL)
os.environ["PATH"] = _TL + os.pathsep + os.environ.get("PATH", "")
from faster_whisper import WhisperModel, decode_audio
import ctranslate2
import numpy as np

AUD = r"C:\Justeco\Active\aruki-v2\site\audio\kinkakuji"
SCRIPT = r"C:\Justeco\Active\aruki-v2\content\kinkakuji\script.json"
lines = {l["id"]: l for l in json.load(open(SCRIPT, encoding="utf-8"))}

PROMPT = "金閣寺、鹿苑寺、北山鹿苑寺、北山殿、舎利殿、仏舎利、足利義満、夢窓疎石、応仁・文明の乱、応永、観応、北山行幸、後小松天皇、相国寺、天龍寺、釈迦三尊。"

# (単位, 置き換える表示の語, 正しい読み, [誤りの候補の読み])
CANDS = [
    ("k005", "舎利殿", "しゃりでん", ["じゃりでん"]),
    ("k030", "義満", "よしみつ", ["よしみず"]),
    ("k030", "北山行幸", "きたやまぎょうこう", ["きたやまきょうこう", "きたやまぎょうこ"]),
    ("k056", "応仁・文明の乱", "おうにん・ぶんめいのらん", ["よみぶんめいのらん", "おうみんぶんめいのらん"]),
    ("k074", "応仁・文明の乱", "おうにん・ぶんめいのらん", ["よみぶんめいのらん", "おうみんぶんめいのらん"]),
    ("k026", "仏舎利", "ぶっしゃり", ["ぶつじゃり", "ぶつしゃり"]),
    ("k046", "夢窓疎石", "むそうそせき", ["むそうそしき"]),
    ("k051", "夢窓疎石", "むそうそせき", ["むそうそしき"]),
    ("k004", "北山鹿苑寺", "ほくざんろくおんじ", ["きたやまろくおんじ"]),
    ("k009", "応永四年", "おうえいよねん", ["おうえよねん", "おういよねん", "おおえよねん"]),
    ("k014", "応永元年", "おうえいがんねん", ["おうえがんねん", "おういがんねん"]),
    ("k029", "応永十五年", "おうえいじゅうごねん", ["おうえじゅうごねん", "おういじゅうごねん"]),
    ("k047", "観応二年", "かんのうにねん", ["かんおうにねん", "かんのにねん"]),
]
UNITS = ["k004", "k005", "k009", "k014", "k026", "k029", "k030", "k046", "k047", "k051", "k056", "k074"]


SKIP_AB = os.environ.get("SKIPAB") == "1"

def main():
    out = {"A": {}, "B": {}, "C": []}
    model = WhisperModel("Systran/faster-whisper-large-v3", device="cuda", compute_type="float16")
    tok = model.hf_tokenizer
    feats = {}
    for u in UNITS:
        audio = decode_audio(os.path.join(AUD, f"{u}.m4a"), sampling_rate=16000)
        for key, kw in (() if SKIP_AB else (("A", {}), ("B", {"initial_prompt": PROMPT}))):
            segs, _ = model.transcribe(audio, language="ja", beam_size=5, temperature=0.0,
                                       condition_on_previous_text=False, vad_filter=False, **kw)
            out[key][u] = "".join(s.text for s in segs).strip()
        # 特徴量（30秒に詰める）
        f = model.feature_extractor(audio)
        n = f.shape[-1]
        pad = np.zeros((f.shape[0], 3000), dtype=np.float32)
        pad[:, :min(3000, n)] = f[:, :3000]
        feats[u] = pad
    # 強制採点
    sot = [tok.token_to_id(t) for t in ("<|startoftranscript|>", "<|ja|>", "<|transcribe|>", "<|notimestamps|>")]
    eot = tok.token_to_id("<|endoftext|>")
    cm = model.model  # ctranslate2.models.Whisper

    encs = {}
    # ctranslate2 の generate に「sot＋文のトークン全部」を前置きとして渡すと、前置きの各位置の logits が返る（強制採点）

    def score(u, text):
        ids = tok.encode(text, add_special_tokens=False).ids
        if u not in encs:
            e = cm.encode(ctranslate2.StorageView.from_array(feats[u][None]), to_cpu=True)
            encs[u] = np.array(e)
        r = cm.generate(ctranslate2.StorageView.from_array(encs[u]), [sot + ids], max_length=448,
                        beam_size=1, return_logits_vocab=True, suppress_blank=False, suppress_tokens=[])[0]
        steps = r.logits[0]
        assert r.sequences_ids[0][:len(ids)] == ids, "prefix mismatch"
        assert len(steps) > len(ids), f"logits {len(steps)} <= {len(ids)}"
        lp = 0.0
        for j, tid in enumerate(ids + [eot]):
            x = np.array(steps[j].to_device(ctranslate2.Device.cpu)).reshape(-1).astype(np.float64)
            x = x - x.max()
            lp += (x - math.log(np.exp(x).sum()))[tid]
        ids = ids + [eot]
        return lp, len(ids)

    for u, word, good, bads in CANDS:
        base = lines[u]["text"]
        if word not in base:
            out["C"].append({"u": u, "err": f"{word} が文に無い"})
            continue
        tg = base.replace(word, good)
        sg, ng = score(u, tg)
        row = {"u": u, "word": word, "good": good, "good_lp": round(sg, 2), "bads": []}
        for b in bads:
            sb, nb = score(u, base.replace(word, b))
            row["bads"].append({"read": b, "lp": round(sb, 2), "diff_good_minus_bad": round(sg - sb, 2)})
        # 漢字のまま（表示）と、A の誤り表記もついでに
        sk, _ = score(u, base)
        row["kanji_lp"] = round(sk, 2)
        out["C"].append(row)
        print(u, word, flush=True)
    json.dump(out, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)


if __name__ == "__main__":
    main()
