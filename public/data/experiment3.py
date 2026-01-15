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
    "Target": "target.json",
    "Human": "human.json",
    "GPT-4o-mini": "gpt-4o-mini.json",
    "GPT-5-mini": "gpt-5-mini.json"
}

# ==========================================
# 関数: JSONリストを行動シーケンス文字列に変換
# ==========================================
def events_to_sequence(event_list, idle_threshold=5):
    if not event_list:
        return ""

    # DataFrame化して時間計算しやすくする
    df = pd.DataFrame(event_list)
    
    # 文字列のtimestampをdatetimeオブジェクトに変換
    # フォーマットは抽出結果に合わせて "%Y/%m/%d %H:%M:%S"
    df['timestamp'] = pd.to_datetime(df['timestamp'], format='%Y/%m/%d %H:%M:%S')
    df = df.sort_values('timestamp').reset_index(drop=True)
    
    final_sequence = []
    
    for i in range(len(df)):
        # アクションを追加
        final_sequence.append(df.loc[i, 'action_type'])
        
        # 次のアクションまでの時間を計算してIDLEを挿入
        if i < len(df) - 1:
            diff = (df.loc[i+1, 'timestamp'] - df.loc[i, 'timestamp']).total_seconds()
            
            if diff >= idle_threshold:
                idle_count = int(diff // idle_threshold)
                final_sequence.extend(['IDLE'] * idle_count)
                
    return " ".join(final_sequence)

# ==========================================
# 関数: ファイル読み込みとシーケンス化
# ==========================================
def load_and_process(filepath, is_group=False):
    sequences = []
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        if is_group:
            # グループデータは [ [log1], [log2] ] の形を想定
            for log in data:
                sequences.append(events_to_sequence(log, IDLE_THRESHOLD))
        else:
            # ターゲットデータは単一の [log]
            sequences.append(events_to_sequence(data, IDLE_THRESHOLD))
            
    except FileNotFoundError:
        print(f"エラー: ファイルが見つかりません -> {filepath}")
        return []
    except json.JSONDecodeError:
        print(f"エラー: JSONの形式が不正です -> {filepath}")
        return []
        
    return sequences

# ==========================================
# メイン処理
# ==========================================

print("データを読み込み中...")

# 1. データのロード
target_seqs = load_and_process(FILES["Target"], is_group=False)
human_seqs = load_and_process(FILES["Human"], is_group=True)
gpt4o_mini_seqs = load_and_process(FILES["GPT-4o-mini"], is_group=True)
gpt5_mini_seqs = load_and_process(FILES["GPT-5-mini"], is_group=True)

if not target_seqs:
    print("ターゲットデータがないため終了します。")
    exit()

target_sequence = target_seqs[0]

# 2. ベクトル化 (全データをコーパスにする)
all_sequences = [target_sequence] + human_seqs + gpt4o_mini_seqs + gpt5_mini_seqs
vectorizer = CountVectorizer(ngram_range=(1, 2), token_pattern=r'(?u)\b\w+\b')
vectorizer.fit(all_sequences)

# ターゲットのベクトル
target_vec = vectorizer.transform([target_sequence])

# 3. 類似度計算と平均化
def calc_avg_sim(label, group_seqs):
    if not group_seqs:
        return 0.0
    
    group_vecs = vectorizer.transform(group_seqs)
    # Target(1) vs Group(N) の類似度配列
    sims = cosine_similarity(target_vec, group_vecs)[0]
    avg = np.mean(sims)
    return avg

score_human = calc_avg_sim("Human", human_seqs)
score_gpt4o_mini = calc_avg_sim("GPT-4o-mini", gpt4o_mini_seqs)
score_gpt5_mini = calc_avg_sim("GPT-5-mini", gpt5_mini_seqs)

# ==========================================
# 結果出力
# ==========================================
print("\n" + "="*50)
print(f"実験結果: 行動軌跡の類似度 (IDLE閾値={IDLE_THRESHOLD}秒)")
print("="*50)
print(f"Target vs Human Group     : {score_human:.4f}")
print(f"Target vs GPT-4o-mini (提案)   : {score_gpt4o_mini:.4f}")
print(f"Target vs GPT-5-mini (比較)  : {score_gpt5_mini:.4f}")
print("="*50)
