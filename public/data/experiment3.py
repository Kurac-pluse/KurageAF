import json
import pandas as pd
import numpy as np
import re
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# 設定
# ==========================================
IDLE_THRESHOLD = 10  # 秒

FILES = {
    "Target": "2_target.json",
    "Human": "2_human.json",
    "GPT-4o-mini": "2_gpt-4o-mini.json",
    "GPT-3.5-turbo": "2_gpt-3.5-turbo.json"
}

# ==========================================
# マップ（座標 → 意味）
# ==========================================
LOCATION_MAP = {
    (-1, 0): "ash_tree",
    (2, 0): "copper_rocks",
    (1, 1): "workshop",
    (2, 1): "workshop",
    (0, 1): "chicken",
    (0, 2): "cow",
    (2, 2): "sunflower_field",
    (4, 2): "gudgeon_spot",
}

# ==========================================
# 中間ファイル出力
# ==========================================
def save_sequences_to_txt(label, sequences):
    out_file = f"2_debug_sequences_{label}.txt"

    with open(out_file, "w", encoding="utf-8") as f:
        for i, seq in enumerate(sequences):
            f.write(f"--- Session {i+1} ---\n")
            for token in seq.split():
                f.write(token + "\n")
            f.write("\n")

    print(f"📝 中間ファイル保存: {out_file}")

# ==========================================
# resource / item / enemy 抽出
# ==========================================
def extract_resource(details):
    m = re.search(r"resource\s\((.*?)\)", details)
    return m.group(1) if m else None

def extract_skill(details):
    m = re.search(r"skill\s(\w+)", details)
    return m.group(1) if m else None

def extract_item(pattern, details):
    m = re.search(pattern, details)
    return m.group(1) if m else None

def extract_enemy(details):
    m = re.search(r"against\s([\w_]+)", details)
    return m.group(1) if m else None

# ==========================================
# イベント分類（完全対応）
# ==========================================
def classify_event(action, details):
    details = details.lower()

    # ---- gathering ----
    if action == "gathering":
        res = extract_resource(details) or "unknown"
        skill = extract_skill(details) or "unknown"
        return f"gather_{res}_{skill}"

    # ---- movement（目的地付き） ----
    if action == "movement":
        coords = re.findall(r"\((-?\d+),(-?\d+)\)", details)
        if len(coords) >= 2:
            x2, y2 = map(int, coords[-1])
            dest = LOCATION_MAP.get((x2, y2), f"coord_{x2}_{y2}")
            return f"move_to_{dest}"
        return "move_unknown"

    # ---- crafting ----
    if action == "crafting":
        item = extract_item(r"crafted\s([\w_]+)", details) or "unknown"
        return f"craft_{item}"

    # ---- equip ----
    if action == "equip":
        item = extract_item(r"equipped\s([\w_]+)", details) or "unknown"
        return f"equip_{item}"

    # ---- unequip ----
    if action == "unequip":
        item = extract_item(r"unequipped\s([\w_]+)", details) or "unknown"
        return f"unequip_{item}"

    # ---- fight ----
    if action == "fight":
        enemy = extract_enemy(details) or "unknown"
        result = "win" if "won" in details else "lose"
        return f"fight_{result}_{enemy}"

    # ---- rest / spawn ----
    if action in ["rest", "spawn"]:
        return action

    # ---- fallback ----
    return action

# ==========================================
# JSON → 行動シーケンス文字列
# ==========================================
def events_to_sequence(event_list, idle_threshold=5):
    if not event_list:
        return ""

    df = pd.DataFrame(event_list)
    df["timestamp"] = pd.to_datetime(df["timestamp"])
    df = df.sort_values("timestamp").reset_index(drop=True)

    seq = []

    for i in range(len(df)):
        token = classify_event(df.loc[i, "action_type"], df.loc[i, "details"])
        seq.append(token)

        if i < len(df) - 1:
            diff = (df.loc[i+1, "timestamp"] - df.loc[i, "timestamp"]).total_seconds()
            idle_count = int(diff // idle_threshold)
            seq.extend(["IDLE"] * idle_count)

    return " ".join(seq)

# ==========================================
# JSON 読み込み
# ==========================================
def load_and_process(filepath, is_group=False):
    sequences = []

    with open(filepath, "r", encoding="utf-8") as f:
        data = json.load(f)

    if is_group:
        for log in data:
            sequences.append(events_to_sequence(log, IDLE_THRESHOLD))
    else:
        sequences.append(events_to_sequence(data, IDLE_THRESHOLD))

    return sequences

# ==========================================
# 類似度計算
# ==========================================
def calc_avg_sim(group_seqs, target_vec, vectorizer):
    if not group_seqs:
        return 0.0
    group_vecs = vectorizer.transform(group_seqs)
    sims = cosine_similarity(target_vec, group_vecs)[0]
    return np.mean(sims)

# ==========================================
# メイン処理
# ==========================================
print("データを読み込み中...")

target_seqs = load_and_process(FILES["Target"], is_group=True)
human_seqs = load_and_process(FILES["Human"], is_group=True)
gpt4o_seqs = load_and_process(FILES["GPT-4o-mini"], is_group=True)
gpt35_seqs = load_and_process(FILES["GPT-3.5-turbo"], is_group=True)

save_sequences_to_txt("Target", target_seqs)
save_sequences_to_txt("Human", human_seqs)
save_sequences_to_txt("GPT-4o-mini", gpt4o_seqs)
save_sequences_to_txt("GPT-3.5-turbo", gpt35_seqs)

if not target_seqs:
    print("ターゲットデータなし")
    exit()

# ==========================================
# ベクトル化
# ==========================================
all_sequences = target_seqs + human_seqs + gpt4o_seqs + gpt35_seqs

vectorizer = CountVectorizer(
    ngram_range=(1, 2),
    token_pattern=r"(?u)\b\w+\b"
)

vectorizer.fit(all_sequences)

# ターゲット平均ベクトル
target_vecs = vectorizer.transform(target_seqs)
target_vec_mean = np.asarray(target_vecs.mean(axis=0))
target_vec_mean = np.atleast_2d(target_vec_mean)

# ==========================================
# スコア算出
# ==========================================
score_human = calc_avg_sim(human_seqs, target_vec_mean, vectorizer)
score_gpt4o = calc_avg_sim(gpt4o_seqs, target_vec_mean, vectorizer)
score_gpt35 = calc_avg_sim(gpt35_seqs, target_vec_mean, vectorizer)

# ==========================================
# 出力
# ==========================================
print("\n" + "=" * 55)
print(f"行動類似度（IDLE閾値 = {IDLE_THRESHOLD} 秒）")
print("=" * 55)
print(f"Target vs Human        : {score_human:.4f}")
print(f"Target vs GPT-4o-mini  : {score_gpt4o:.4f}")
print(f"Target vs GPT-3.5-turbo: {score_gpt35:.4f}")
print("=" * 55)
