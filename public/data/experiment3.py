import json
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity

# ==========================================
# 設定
# ==========================================
IDLE_THRESHOLD = 5  # IDLE判定の秒数

FILES = {
    "Target": "target.json",           # 複数ターゲット（例3個）
    "Human": "human.json",
    "GPT-4o-mini": "gpt-4o-mini.json",
    "GPT-3.5-turbo": "gpt-3.5-turbo.json"
}

# ==========================================
# JSONログ → 行動シーケンス文字列に変換
# ==========================================
def events_to_sequence(event_list, idle_threshold=5):
    if not event_list:
        return ""

    df = pd.DataFrame(event_list)
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='%Y/%m/%d %H:%M:%S')
    df = df.sort_values('timestamp').reset_index(drop=True)

    final_sequence = []

    for i in range(len(df)):
        final_sequence.append(df.loc[i, 'action_type'])
        if i < len(df) - 1:
            diff = (df.loc[i+1, 'timestamp'] - df.loc[i, 'timestamp']).total_seconds()
            if diff >= idle_threshold:
                idle_count = int(diff // idle_threshold)
                final_sequence.extend(['IDLE'] * idle_count)

    return " ".join(final_sequence)

# ==========================================
# JSON 読み込み & シーケンス化
# ==========================================
def load_and_process(filepath, is_group=False):
    sequences = []

    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)

        if is_group:
            # グループ形式: [ [log1], [log2], ... ]
            for log in data:
                sequences.append(events_to_sequence(log, IDLE_THRESHOLD))
        else:
            # 単一ターゲット形式: [log]
            sequences.append(events_to_sequence(data, IDLE_THRESHOLD))

    except FileNotFoundError:
        print(f"エラー: ファイルが見つかりません -> {filepath}")
        return []

    except json.JSONDecodeError:
        print(f"エラー: JSON形式が不正です -> {filepath}")
        return []

    return sequences

# ==========================================
# 類似度計算
# ==========================================
def calc_avg_sim(label, group_seqs, target_vec, vectorizer):
    if not group_seqs:
        return 0.0
    group_vecs = vectorizer.transform(group_seqs)
    sims = cosine_similarity(target_vec, group_vecs)[0]
    return np.mean(sims)

# ==========================================
# メイン処理
# ==========================================
print("データを読み込み中...")

# ターゲットは3個 → is_group=True
target_seqs = load_and_process(FILES["Target"], is_group=True)
human_seqs = load_and_process(FILES["Human"], is_group=True)
gpt4o_mini_seqs = load_and_process(FILES["GPT-4o-mini"], is_group=True)
gpt35_turbo_seqs = load_and_process(FILES["GPT-3.5-turbo"], is_group=True)

if not target_seqs:
    print("ターゲットデータがないため終了します。")
    exit()

# ==========================================
# ベクトル化（全データを語彙にする）
# ==========================================
all_sequences = target_seqs + human_seqs + gpt4o_mini_seqs + gpt35_turbo_seqs

vectorizer = CountVectorizer(
    ngram_range=(1, 2),
    token_pattern=r'(?u)\b\w+\b'
)
vectorizer.fit(all_sequences)

# 複数ターゲットをベクトル化 → 平均ベクトルを作成
target_vecs = vectorizer.transform(target_seqs)
target_vec_mean = target_vecs.mean(axis=0)
target_vec_mean = np.asarray(target_vec_mean)  # ndarrayに変換
target_vec_mean = np.atleast_2d(target_vec_mean)  # 1行ベクトルとして扱う

# ==========================================
# スコア計算（平均ターゲットと比較）
# ==========================================
score_human = calc_avg_sim("Human", human_seqs, target_vec_mean, vectorizer)
score_gpt4o_mini = calc_avg_sim("GPT-4o-mini", gpt4o_mini_seqs, target_vec_mean, vectorizer)
score_gpt35_turbo = calc_avg_sim("GPT-3.5-turbo", gpt35_turbo_seqs, target_vec_mean, vectorizer)

# ==========================================
# 結果出力
# ==========================================
print("\n" + "=" * 50)
print(f"実験結果: 行動軌跡の類似度 (IDLE閾値={IDLE_THRESHOLD}秒)")
print("=" * 50)
print(f"Target(平均) vs Human Group           : {score_human:.4f}")
print(f"Target(平均) vs GPT-4o-mini (提案)      : {score_gpt4o_mini:.4f}")
print(f"Target(平均) vs GPT-3.5-turbo (比較)    : {score_gpt35_turbo:.4f}")
print("=" * 50)
